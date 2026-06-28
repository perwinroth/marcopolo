import { ref, set, get, remove, query, orderByChild, equalTo, onValue, off, type Unsubscribe } from "firebase/database";
import { database, auth } from "./config";
import { Capacitor } from "@capacitor/core";
import { normalizePhoneNumber, getNativeUid, restDbGet, restDbSet, restDbQueryByChild } from "./auth";

// On native iOS the app signs in via the Firebase REST API (skipNativeAuth: true),
// so the JS SDK's `auth.currentUser` is null and JS SDK DB calls are unauthenticated.
// These dual-mode helpers mirror lib/firebase/database.ts so invitations work on
// both web (JS SDK) and native (REST).
function isNative(): boolean { return Capacitor.isNativePlatform(); }

function currentUid(): string | null {
  return isNative() ? getNativeUid() : (auth.currentUser?.uid ?? null);
}

async function dbGet(path: string): Promise<any> {
  if (isNative()) return restDbGet(path);
  const s = await get(ref(database, path));
  return s.exists() ? s.val() : null;
}

async function dbSet(path: string, data: unknown): Promise<void> {
  if (isNative()) { await restDbSet(path, data); return; }
  await set(ref(database, path), data);
}

async function dbRemove(path: string): Promise<void> {
  if (isNative()) { await restDbSet(path, null); return; } // PUT null deletes in RTDB REST
  await remove(ref(database, path));
}

async function dbQueryByChild(path: string, child: string, value: string): Promise<Record<string, any> | null> {
  if (isNative()) return (await restDbQueryByChild(path, child, value)) as Record<string, any> | null;
  const q = query(ref(database, path), orderByChild(child), equalTo(value));
  const s = await get(q);
  return s.exists() ? (s.val() as Record<string, any>) : null;
}

export interface Invitation {
  id: string;
  token: string;
  inviterId: string;
  inviterName: string;
  inviterPhone: string;
  inviteePhone: string;
  inviteePhoneHash: string;
  message?: string;
  createdAt: number;
  expiresAt: number;
  status: "pending" | "accepted" | "expired" | "revoked";
  usedAt?: number;
  acceptedBy?: string;
}

// Generate cryptographically secure invitation token
export function generateInvitationToken(): string {
  const buffer = new Uint8Array(32);
  crypto.getRandomValues(buffer);
  return Array.from(buffer, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Hash phone number for privacy
export async function hashPhone(phone: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(phone + (process.env.NEXT_PUBLIC_PHONE_SALT || 'marco-polo-salt'));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function canonicalizePhone(phone: string): string {
  return normalizePhoneNumber(phone);
}

// Create and send invitation
export async function createInvitation(
  inviteePhone: string,
  message?: string
): Promise<{ success: boolean; token?: string; error?: string }> {
  try {
    const uid = currentUid();
    if (!uid) {
      return { success: false, error: "Not authenticated" };
    }

    // Get inviter's name
    const userData = await dbGet(`users/${uid}`);
    if (!userData) {
      return { success: false, error: "User profile not found" };
    }

    // Check if invitation already exists for this phone
    const phoneHash = await hashPhone(canonicalizePhone(inviteePhone));
    const existingInvitation = await getInvitationByPhoneHash(phoneHash);
    if (existingInvitation && existingInvitation.status === "pending") {
      // If pending, return the existing token to avoid duplicates
      return { success: true, token: existingInvitation.token };
    }

    // Generate secure token
    const token = generateInvitationToken();
    const invitationId = `inv_${Date.now()}_${token.substring(0, 8)}`;

    // Create invitation
    // IMPORTANT: Firebase set() fails if any property is explicitly undefined.
    // We must ensure message is null or a string, not undefined.
    const invitation: Invitation = {
      id: invitationId,
      token,
      inviterId: uid,
      inviterName: userData.displayName || userData.firstName || userData.phone || "Someone",
      inviterPhone: userData.phone || "",
      inviteePhone: inviteePhone,
      inviteePhoneHash: phoneHash,
      message: message || "", // Default to empty string if undefined/null
      createdAt: Date.now(),
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
      status: "pending",
    };

    // Save to database
    await dbSet(`invitations/${invitationId}`, invitation);

    return { success: true, token };
  } catch (error: any) {
    console.error("Error creating invitation:", error);
    return { success: false, error: error.message };
  }
}

// Live list of the current user's pending SMS invitations (people not yet on the
// app that they invited by number). Mirrors the dual-mode subscribe pattern:
// web onValue, native 5s poll. Filters out used/expired invites.
export function subscribeToSentInvitations(
  uid: string,
  callback: (invitations: Invitation[]) => void
): Unsubscribe {
  const collect = (raw: Record<string, any> | null): Invitation[] => {
    const now = Date.now();
    const list: Invitation[] = [];
    if (raw) {
      for (const [id, inv] of Object.entries(raw)) {
        if (inv && inv.status === "pending" && (!inv.expiresAt || inv.expiresAt > now)) {
          list.push({ ...inv, id });
        }
      }
    }
    return list;
  };

  if (isNative()) {
    let active = true;
    (async () => {
      while (active) {
        try {
          const raw = (await restDbQueryByChild("invitations", "inviterId", uid)) as Record<string, any> | null;
          if (active) callback(collect(raw));
        } catch (error) {
          console.error("Sent invitations poll error:", error);
        }
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    })();
    return () => { active = false; };
  }

  const q = query(ref(database, "invitations"), orderByChild("inviterId"), equalTo(uid));
  const unsub = onValue(q, (snapshot) => {
    callback(collect(snapshot.exists() ? (snapshot.val() as Record<string, any>) : null));
  });
  return () => off(q, "value", unsub);
}

// Get invitation by token
export async function getInvitationByToken(token: string): Promise<Invitation | null> {
  try {
    const invitations = await dbQueryByChild('invitations', 'token', token);

    if (!invitations) {
      return null;
    }

    const invitationId = Object.keys(invitations)[0];
    const invitation = invitations[invitationId];

    // Check if expired
    if (invitation.expiresAt < Date.now()) {
      await updateInvitationStatus(invitationId, "expired");
      return null;
    }

    return { ...invitation, id: invitationId };
  } catch (error) {
    console.error("Error getting invitation:", error);
    return null;
  }
}

// Get invitation by phone hash
async function getInvitationByPhoneHash(phoneHash: string): Promise<Invitation | null> {
  try {
    const invitations = await dbQueryByChild('invitations', 'inviteePhoneHash', phoneHash);

    if (!invitations) {
      return null;
    }

    const invitationId = Object.keys(invitations)[0];
    return { ...invitations[invitationId], id: invitationId };
  } catch (error) {
    console.error("Error getting invitation by phone hash:", error);
    return null;
  }
}

// Update invitation status
export async function updateInvitationStatus(
  invitationId: string,
  status: Invitation["status"],
  acceptedBy?: string
): Promise<void> {
  const current = await dbGet(`invitations/${invitationId}`);
  if (current) {
    await dbSet(`invitations/${invitationId}`, {
      ...current,
      status,
      ...(status === "accepted" ? { usedAt: Date.now() } : {}),
      ...(acceptedBy ? { acceptedBy } : {}),
    });
  }
}

// Accept invitation
export async function acceptInvitation(token: string, newUserId: string): Promise<{ success: boolean; inviterId?: string; error?: string }> {
  try {
    const invitation = await getInvitationByToken(token);
    
    if (!invitation) {
      return { success: false, error: "Invalid or expired invitation" };
    }

    if (invitation.status !== "pending") {
      return { success: false, error: "Invitation already used" };
    }

    const newUserData = await dbGet(`users/${newUserId}`);

    if (!newUserData) {
       return { success: false, error: "User profile is missing" };
    }

    const currentUserPhone = newUserData.phone || "";
    if (!currentUserPhone) {
      return { success: false, error: "User phone number is missing" };
    }

    const [canonicalPhoneHash, legacyPhoneHash] = await Promise.all([
      hashPhone(canonicalizePhone(currentUserPhone)),
      hashPhone(currentUserPhone),
    ]);

    if (
      invitation.inviteePhoneHash !== canonicalPhoneHash &&
      invitation.inviteePhoneHash !== legacyPhoneHash
    ) {
      return { success: false, error: "This invitation is for a different phone number" };
    }
    
    // Mark invitation as accepted
    await updateInvitationStatus(invitation.id, "accepted", newUserId);

    // 1. Add to inviter's friend list (they see the new user)
    const connectionForInviter = {
      phone: newUserData.phone, // REQUIRED by Friend interface
      displayName: newUserData.displayName || newUserData.phone || "Friend",
      status: "IDLE", 
      lastActionTime: Date.now(),
      isPinned: false
    };
    await dbSet(`connections/${invitation.inviterId}/${newUserId}`, connectionForInviter);

    // 2. Add to new user's friend list (they see the inviter)
    const connectionForNewUser = {
      phone: invitation.inviterPhone, // REQUIRED by Friend interface
      displayName: invitation.inviterName || invitation.inviterPhone || "Friend",
      status: "IDLE",
      lastActionTime: Date.now(),
      isPinned: false
    };
    await dbSet(`connections/${newUserId}/${invitation.inviterId}`, connectionForNewUser);

    return { success: true, inviterId: invitation.inviterId };
  } catch (error: any) {
    console.error("Error accepting invitation:", error);
    return { success: false, error: error.message };
  }
}

// Get user's sent invitations
export async function getUserInvitations(userId: string): Promise<Invitation[]> {
  try {
    const invitations = await dbQueryByChild('invitations', 'inviterId', userId);

    if (!invitations) {
      return [];
    }

    return Object.keys(invitations).map(id => ({
      ...invitations[id],
      id,
    }));
  } catch (error) {
    console.error("Error getting user invitations:", error);
    return [];
  }
}

// Revoke invitation
export async function revokeInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await updateInvitationStatus(invitationId, "revoked");
    return { success: true };
  } catch (error: any) {
    console.error("Error revoking invitation:", error);
    return { success: false, error: error.message };
  }
}

// Delete expired invitations
export async function deleteExpiredInvitations(): Promise<number> {
  try {
    const invitations = await dbGet('invitations');

    if (!invitations) {
      return 0;
    }

    const now = Date.now();
    let deletedCount = 0;

    for (const id in invitations) {
      const invitation = invitations[id];
      if (invitation.expiresAt < now || invitation.status === "expired") {
        await dbRemove(`invitations/${id}`);
        deletedCount++;
      }
    }

    return deletedCount;
  } catch (error) {
    console.error("Error deleting expired invitations:", error);
    return 0;
  }
}
