import { database } from "./config";
import { ref, get, query, orderByChild, equalTo } from "firebase/database";
import { Capacitor } from "@capacitor/core";
import { decryptCustomMessage } from "../crypto/encryption";
import { restDbGet, restDbQueryByChild, signOut } from "./auth";
import { callFunction } from "./functions";

// On native iOS the app signs in via the Firebase REST API (skipNativeAuth: true),
// so the JS SDK is unauthenticated. These dual-mode read helpers mirror
// lib/firebase/database.ts so the data export works on web and native.
function isNative(): boolean { return Capacitor.isNativePlatform(); }

async function dbGet(path: string): Promise<any> {
    if (isNative()) return restDbGet(path);
    const s = await get(ref(database, path));
    return s.exists() ? s.val() : null;
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
 * Delete the account and ALL associated data (GDPR compliance).
 *
 * Delegates to the `deleteAccount` Cloud Function, which runs with admin
 * privileges. This is required for a complete wipe: the security rules prevent
 * the client from deleting recoveryRequests, invitations addressed to the user,
 * and block entries other users created — and from deleting its own Auth record
 * on native. The function identifies the user from their ID token, so a caller
 * can only delete their own account. (`uid` is kept for call-site compatibility;
 * the server derives it from the token.)
 */
export async function deleteAccount(_uid?: string): Promise<void> {
    try {
        await callFunction("deleteAccount", { withAuth: true });
    } catch (error: any) {
        console.error("Error deleting account:", error);
        throw new Error("Failed to delete account: " + error.message);
    }
    // Clear the local/native session so the now-invalid token doesn't linger.
    try {
        await signOut();
    } catch {
        /* session already gone */
    }
}
