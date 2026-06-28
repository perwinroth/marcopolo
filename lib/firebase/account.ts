import { auth, database } from "./config";
import { ref, remove, get, query, orderByChild, equalTo } from "firebase/database";
import { deleteUser } from "firebase/auth";
import { Capacitor } from "@capacitor/core";
import { decryptCustomMessage } from "../crypto/encryption";
import { getNativeAuthToken, restDbGet, restDbSet, restDbQueryByChild } from "./auth";

// On native iOS the app signs in via the Firebase REST API (skipNativeAuth: true),
// so the JS SDK is unauthenticated. These dual-mode helpers mirror
// lib/firebase/database.ts so account export/deletion work on web and native.
function isNative(): boolean { return Capacitor.isNativePlatform(); }

async function dbGet(path: string): Promise<any> {
    if (isNative()) return restDbGet(path);
    const s = await get(ref(database, path));
    return s.exists() ? s.val() : null;
}

async function dbRemove(path: string): Promise<void> {
    if (isNative()) { await restDbSet(path, null); return; } // PUT null deletes in RTDB REST
    await remove(ref(database, path));
}

// IMPORTANT: the security rules deny unfiltered reads of `invitations` and
// `friendRequests` — only indexed equality queries are allowed. Always query
// by child, never read the whole node.
async function dbQueryByChild(path: string, child: string, value: string): Promise<Record<string, any>> {
    if (isNative()) {
        return ((await restDbQueryByChild(path, child, value)) as Record<string, any> | null) || {};
    }
    const q = query(ref(database, path), orderByChild(child), equalTo(value));
    const s = await get(q);
    return s.exists() ? (s.val() as Record<string, any>) : {};
}

export interface UserDataExport {
    profile: {
        phone: string;
        email?: string;
        customMarco: string;
        customPolo: string;
        createdAt?: number;
    };
    connections: Array<{
        friendId: string;
        friendPhone: string;
        status: string;
        isPinned: boolean;
        lastActionTime?: number;
    }>;
    invitationsSent: Array<{
        token: string;
        inviteePhone: string;
        message?: string;
        createdAt: number;
        expiresAt: number;
    }>;
    friendRequests: {
        sent: Array<{
            to: string;
            status: string;
            createdAt: number;
        }>;
        received: Array<{
            from: string;
            status: string;
            createdAt: number;
        }>;
    };
    exportedAt: string;
}

/**
 * Export all user data in JSON format (GDPR compliance)
 */
export async function exportUserData(uid: string): Promise<UserDataExport> {
    try {
        // Get user profile
        const userData = (await dbGet(`users/${uid}`)) || {};

        // Decrypt custom messages for export
        const customMarcoRaw = userData.customMarco || userData.customMarko;
        const customMarco = customMarcoRaw
            ? await decryptCustomMessage(customMarcoRaw)
            : "Marco?";
        const customPolo = userData.customPolo
            ? await decryptCustomMessage(userData.customPolo)
            : "Polo!";

        // Get connections
        const connectionsData = (await dbGet(`connections/${uid}`)) || {};

        const connections = await Promise.all(
            Object.entries(connectionsData).map(async ([friendId, data]: [string, any]) => {
                // Get friend's phone number (allowed: we have a connection with them)
                const friendData = (await dbGet(`users/${friendId}`)) || {};

                return {
                    friendId,
                    friendPhone: friendData.phone || "Unknown",
                    status: data.status || "unknown",
                    isPinned: data.isPinned || false,
                    lastActionTime: data.lastActionTime,
                };
            })
        );

        // Get sent invitations (filtered query — full-node reads are denied by rules)
        const myInvitations = await dbQueryByChild("invitations", "inviterId", uid);
        const invitationsSent = Object.entries(myInvitations).map(([id, inv]: [string, any]) => ({
            token: inv.token || id,
            inviteePhone: inv.inviteePhone || "Unknown",
            message: inv.message,
            createdAt: inv.createdAt,
            expiresAt: inv.expiresAt,
        }));

        // Get friend requests (filtered queries by `from` / `to`)
        const sentRaw = await dbQueryByChild("friendRequests", "from", uid);
        const receivedRaw = await dbQueryByChild("friendRequests", "to", uid);

        const sentRequests = Object.values(sentRaw).map((req: any) => ({
            to: req.to,
            status: req.status,
            createdAt: req.createdAt,
        }));

        const receivedRequests = Object.values(receivedRaw).map((req: any) => ({
            from: req.from,
            status: req.status,
            createdAt: req.createdAt,
        }));

        return {
            profile: {
                phone: userData.phone || "Unknown",
                email: userData.email,
                customMarco,
                customPolo,
                createdAt: userData.createdAt,
            },
            connections,
            invitationsSent,
            friendRequests: {
                sent: sentRequests,
                received: receivedRequests,
            },
            exportedAt: new Date().toISOString(),
        };
    } catch (error: any) {
        console.error("Error exporting user data:", error);
        throw new Error("Failed to export data: " + error.message);
    }
}

/**
 * Delete the Firebase Auth account on the current platform.
 * Web uses the JS SDK; native uses the Identity Toolkit REST API with the
 * stored ID token (the JS SDK has no signed-in user on native).
 */
async function deleteAuthAccount(): Promise<void> {
    if (isNative()) {
        const idToken = getNativeAuthToken();
        const apiKey = (auth.app.options as any).apiKey;
        if (idToken && apiKey) {
            const resp = await fetch(
                `https://identitytoolkit.googleapis.com/v1/accounts:delete?key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ idToken }),
                }
            );
            if (!resp.ok) {
                const err = await resp.text();
                throw new Error(`Auth account deletion failed: ${resp.status} ${err}`);
            }
        }
        return;
    }
    if (auth.currentUser) {
        await deleteUser(auth.currentUser);
    }
}

/**
 * Delete user account and all associated data (GDPR compliance)
 */
export async function deleteAccount(uid: string): Promise<void> {
    try {
        const deletionPromises: Promise<void>[] = [];

        // Delete connections per-child. The security rules only grant write on
        // connections/$uid/$friendUid (per-child), NOT on the whole
        // connections/$uid node — so removing the whole node fails with
        // PERMISSION_DENIED. Also remove the friend's reverse pointer to us.
        const myConnections = (await dbGet(`connections/${uid}`)) || {};
        Object.keys(myConnections).forEach((friendUid) => {
            deletionPromises.push(dbRemove(`connections/${uid}/${friendUid}`));
            deletionPromises.push(dbRemove(`connections/${friendUid}/${uid}`));
        });

        // Delete sent invitations (filtered query — full-node reads are denied by rules)
        const myInvitations = await dbQueryByChild("invitations", "inviterId", uid);
        Object.keys(myInvitations).forEach((id) => {
            deletionPromises.push(dbRemove(`invitations/${id}`));
        });

        // Delete friend requests where I'm sender or recipient
        const sentRequests = await dbQueryByChild("friendRequests", "from", uid);
        const receivedRequests = await dbQueryByChild("friendRequests", "to", uid);
        const requestIds = new Set([...Object.keys(sentRequests), ...Object.keys(receivedRequests)]);
        requestIds.forEach((id) => {
            deletionPromises.push(dbRemove(`friendRequests/${id}`));
        });

        // Wait for all deletions
        await Promise.all(deletionPromises);

        // Delete the user profile (after connections were read above)
        await dbRemove(`users/${uid}`);

        // Delete Firebase Auth account (must be last)
        await deleteAuthAccount();
    } catch (error: any) {
        console.error("Error deleting account:", error);
        throw new Error("Failed to delete account: " + error.message);
    }
}
