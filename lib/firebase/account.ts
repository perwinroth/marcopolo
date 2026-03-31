import { auth, database } from "./config";
import { ref, remove, get } from "firebase/database";
import { deleteUser } from "firebase/auth";
import { decryptCustomMessage } from "../crypto/encryption";

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
        const userRef = ref(database, `users/${uid}`);
        const userSnapshot = await get(userRef);
        const userData = userSnapshot.val() || {};

        // Decrypt custom messages for export
        const customMarcoRaw = userData.customMarco || userData.customMarko;
        const customMarco = customMarcoRaw
            ? await decryptCustomMessage(customMarcoRaw)
            : "Marco?";
        const customPolo = userData.customPolo
            ? await decryptCustomMessage(userData.customPolo)
            : "Polo!";

        // Get connections
        const connectionsRef = ref(database, `connections/${uid}`);
        const connectionsSnapshot = await get(connectionsRef);
        const connectionsData = connectionsSnapshot.val() || {};

        const connections = await Promise.all(
            Object.entries(connectionsData).map(async ([friendId, data]: [string, any]) => {
                // Get friend's phone number
                const friendRef = ref(database, `users/${friendId}`);
                const friendSnapshot = await get(friendRef);
                const friendData = friendSnapshot.val() || {};

                return {
                    friendId,
                    friendPhone: friendData.phone || "Unknown",
                    status: data.status || "unknown",
                    isPinned: data.isPinned || false,
                    lastActionTime: data.lastActionTime,
                };
            })
        );

        // Get sent invitations
        const invitationsRef = ref(database, "invitations");
        const invitationsSnapshot = await get(invitationsRef);
        const allInvitations = invitationsSnapshot.val() || {};

        const invitationsSent = Object.entries(allInvitations)
            .filter(([_, inv]: [string, any]) => inv.inviterId === uid)
            .map(([token, inv]: [string, any]) => ({
                token,
                inviteePhone: inv.inviteePhone || "Unknown",
                message: inv.message,
                createdAt: inv.createdAt,
                expiresAt: inv.expiresAt,
            }));

        // Get friend requests
        const friendRequestsRef = ref(database, "friendRequests");
        const friendRequestsSnapshot = await get(friendRequestsRef);
        const allRequests = friendRequestsSnapshot.val() || {};

        const sentRequests = Object.entries(allRequests)
            .filter(([_, req]: [string, any]) => req.from === uid)
            .map(([id, req]: [string, any]) => ({
                to: req.to,
                status: req.status,
                createdAt: req.createdAt,
            }));

        const receivedRequests = Object.entries(allRequests)
            .filter(([_, req]: [string, any]) => req.to === uid)
            .map(([id, req]: [string, any]) => ({
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
 * Delete user account and all associated data (GDPR compliance)
 */
export async function deleteAccount(uid: string): Promise<void> {
    try {
        // Delete user profile
        await remove(ref(database, `users/${uid}`));

        // Delete connections
        await remove(ref(database, `connections/${uid}`));

        // Delete sent invitations
        const invitationsRef = ref(database, "invitations");
        const invitationsSnapshot = await get(invitationsRef);
        const allInvitations = invitationsSnapshot.val() || {};

        const deletionPromises: Promise<void>[] = [];

        Object.entries(allInvitations).forEach(([token, inv]: [string, any]) => {
            if (inv.inviterId === uid) {
                deletionPromises.push(remove(ref(database, `invitations/${token}`)));
            }
        });

        // Delete friend requests
        const friendRequestsRef = ref(database, "friendRequests");
        const friendRequestsSnapshot = await get(friendRequestsRef);
        const allRequests = friendRequestsSnapshot.val() || {};

        Object.entries(allRequests).forEach(([id, req]: [string, any]) => {
            if (req.from === uid || req.to === uid) {
                deletionPromises.push(remove(ref(database, `friendRequests/${id}`)));
            }
        });

        // Wait for all deletions
        await Promise.all(deletionPromises);

        // Delete Firebase Auth account (must be last)
        if (auth.currentUser) {
            await deleteUser(auth.currentUser);
        }
    } catch (error: any) {
        console.error("Error deleting account:", error);
        throw new Error("Failed to delete account: " + error.message);
    }
}
