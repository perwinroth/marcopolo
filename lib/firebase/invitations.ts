import { ref, set, get, remove, query, orderByChild, equalTo } from "firebase/database";
import { database, auth } from "./config";
import { normalizePhoneNumber } from "./auth";

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
    const user = auth.currentUser;
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Get inviter's name
    const userRef = ref(database, `users/${user.uid}`);
    const userSnapshot = await get(userRef);
    if (!userSnapshot.exists()) {
      return { success: false, error: "User profile not found" };
    }
    const userData = userSnapshot.val();

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
      inviterId: user.uid,
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
    await set(ref(database, `invitations/${invitationId}`), invitation);

    return { success: true, token };
  } catch (error: any) {
    console.error("Error creating invitation:", error);
    return { success: false, error: error.message };
  }
}

// Get invitation by token
export async function getInvitationByToken(token: string): Promise<Invitation | null> {
  try {
    const invitationsRef = ref(database, 'invitations');
    const invitationQuery = query(invitationsRef, orderByChild('token'), equalTo(token));
    const snapshot = await get(invitationQuery);

    if (!snapshot.exists()) {
      return null;
    }

    const invitations = snapshot.val();
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
    const invitationsRef = ref(database, 'invitations');
    const invitationQuery = query(invitationsRef, orderByChild('inviteePhoneHash'), equalTo(phoneHash));
    const snapshot = await get(invitationQuery);

    if (!snapshot.exists()) {
      return null;
    }

    const invitations = snapshot.val();
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
  const invitationRef = ref(database, `invitations/${invitationId}`);
  const currentSnapshot = await get(invitationRef);
  if (currentSnapshot.exists()) {
    const current = currentSnapshot.val();
    await set(invitationRef, {
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

    const newUserRef = ref(database, `users/${newUserId}`);
    const newUserSnapshot = await get(newUserRef);

    if (!newUserSnapshot.exists()) {
       return { success: false, error: "User profile is missing" };
    }

    const newUserData = newUserSnapshot.val();
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
    await set(ref(database, `connections/${invitation.inviterId}/${newUserId}`), connectionForInviter);

    // 2. Add to new user's friend list (they see the inviter)
    const connectionForNewUser = {
      phone: invitation.inviterPhone, // REQUIRED by Friend interface
      displayName: invitation.inviterName || invitation.inviterPhone || "Friend",
      status: "IDLE",
      lastActionTime: Date.now(),
      isPinned: false
    };
    await set(ref(database, `connections/${newUserId}/${invitation.inviterId}`), connectionForNewUser);

    return { success: true, inviterId: invitation.inviterId };
  } catch (error: any) {
    console.error("Error accepting invitation:", error);
    return { success: false, error: error.message };
  }
}

// Get user's sent invitations
export async function getUserInvitations(userId: string): Promise<Invitation[]> {
  try {
    const invitationsRef = ref(database, 'invitations');
    const userInvitationsQuery = query(invitationsRef, orderByChild('inviterId'), equalTo(userId));
    const snapshot = await get(userInvitationsQuery);

    if (!snapshot.exists()) {
      return [];
    }

    const invitations = snapshot.val();
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
    const invitationsRef = ref(database, 'invitations');
    const snapshot = await get(invitationsRef);

    if (!snapshot.exists()) {
      return 0;
    }

    const invitations = snapshot.val();
    const now = Date.now();
    let deletedCount = 0;

    for (const id in invitations) {
      const invitation = invitations[id];
      if (invitation.expiresAt < now || invitation.status === "expired") {
        await remove(ref(database, `invitations/${id}`));
        deletedCount++;
      }
    }

    return deletedCount;
  } catch (error) {
    console.error("Error deleting expired invitations:", error);
    return 0;
  }
}
