"use client";

import { encryptCustomMessage, decryptCustomMessage } from "../crypto/encryption";
import {
    ref, set, get, update, push, onValue, off,
    query, orderByChild, equalTo, Unsubscribe, serverTimestamp
} from "firebase/database";
import { database } from "./config";
// Status types for Marco/Polo signals
type GameStatus = "IDLE" | "MARCO" | "POLO" | "SOS" | "MARCO_SENT" | "MARCO_RECEIVED" | "POLO_SENT" | "POLO_RECEIVED" | "SOS_SENT" | "SOS_RECEIVED";
import { Capacitor } from "@capacitor/core";
import { normalizePhoneNumber, restDbGet, restDbPush, restDbQueryByChild, restDbSet, restDbUpdate } from "./auth";
import { notifyMarcoReceived, notifyPoloReceived, notifySOSReceived } from "./nativeNotifications";
import { DEFAULT_SIGNAL_COLOR, DEFAULT_SIGNAL_TYPE, mapLegacyShapeToSignal, type SignalType } from "../signals";

function isNative(): boolean { return Capacitor.isNativePlatform(); }
export const HELP_STATUS_EXPIRY_MS = 30000;
export const DEBUG_SELF_TEST_PHONE = "46760366102";
export const DEBUG_SELF_TEST_UID = "__debug_self_test__";

// Dual-mode DB helpers
async function dbGet(path: string): Promise<any> {
    if (isNative()) return restDbGet(path);
    const s = await get(ref(database, path));
    return s.exists() ? s.val() : null;
}
async function dbSet(path: string, data: any): Promise<void> {
    if (isNative()) return restDbSet(path, data);
    await set(ref(database, path), data);
}
async function dbUpdate(path: string, data: any): Promise<void> {
    if (isNative()) return restDbUpdate(path, data);
    await update(ref(database, path), data);
}
async function dbPush(path: string, data: any): Promise<string> {
    if (isNative()) return restDbPush(path, data);
    const newRef = push(ref(database, path));
    await set(newRef, data);
    return newRef.key!;
}

export interface Friend {
    id?: string; phone: string; status: GameStatus; lastActionTime: number;
    customMarco?: string; customPolo?: string; displayName?: string;
    theme?: { heartColor: string; nameColor: string; iconShape?: string; signalType?: SignalType; signalColor?: string; }
    heartColor: string; nameColor: string;
}
export interface FriendRequest {
    id: string; from: string; fromPhone: string; to: string; toPhone: string;
    fromDisplayName?: string; toDisplayName?: string;
    status: "pending" | "accepted" | "rejected"; createdAt: number;
}

function dedupePendingRequests(requests: FriendRequest[]): FriendRequest[] {
    const latestByPair = new Map<string, FriendRequest>();
    for (const request of requests) {
        const key = `${request.from}:${request.to}`;
        const existing = latestByPair.get(key);
        if (!existing || request.createdAt > existing.createdAt) {
            latestByPair.set(key, request);
        }
    }
    return Array.from(latestByPair.values());
}

function arePhoneNumbersEquivalent(p1: string, p2: string): boolean {
    let n1 = normalizePhoneNumber(p1), n2 = normalizePhoneNumber(p2);
    if (n1 === n2) return true;
    if (n1.startsWith('0')) n1 = n1.substring(1);
    if (n2.startsWith('0')) n2 = n2.substring(1);
    return n1.length >= 7 && n2.length >= 7 && (n1.endsWith(n2) || n2.endsWith(n1));
}

// Block/unblock a user
export async function blockUser(uid: string, blockedUid: string) {
    try {
        await dbSet(`blocked/${uid}/${blockedUid}`, { blockedAt: Date.now() });
        // Also remove connection if exists
        await dbSet(`connections/${uid}/${blockedUid}`, null);
        return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function unblockUser(uid: string, blockedUid: string) {
    try {
        await dbSet(`blocked/${uid}/${blockedUid}`, null);
        return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function getBlockedUsers(uid: string): Promise<string[]> {
    try {
        const data = await dbGet(`blocked/${uid}`);
        return data ? Object.keys(data) : [];
    } catch { return []; }
}

export async function sendFriendRequest(fromUid: string, fromPhone: string, toPhone: string) {
    try {
        const normalizedPhone = normalizePhoneNumber(toPhone);
        let toUid: string | null = null;
        let targetUserPhone = toPhone;
        let targetDisplayName = "";

        if (isNative()) {
            const usersData = await restDbQueryByChild("users", "phoneNormalized", normalizedPhone);
            if (usersData) {
                const [uid, userData] = Object.entries(usersData as Record<string, any>)[0] || [];
                if (uid && userData?.phone && arePhoneNumbersEquivalent(userData.phone, toPhone)) {
                    toUid = uid;
                    targetUserPhone = userData.phone;
                    targetDisplayName = userData.displayName || userData.name || "";
                }
            }
        } else {
            const snapshot = await get(query(ref(database, "users"), orderByChild("phoneNormalized"), equalTo(normalizedPhone)));
            snapshot.forEach((child) => {
                const userData = child.val();
                if (!toUid && userData?.phone && arePhoneNumbersEquivalent(userData.phone, toPhone)) {
                    toUid = child.key;
                    targetUserPhone = userData.phone;
                    targetDisplayName = userData.displayName || userData.name || "";
                }
            });
        }

        if (!toUid) return { success: false, error: "User not found" };
        if (toUid === fromUid) return { success: false, error: "Cannot add yourself" };
        const fromUser = await dbGet(`users/${fromUid}`);
        const fromDisplayName = fromUser?.displayName || fromUser?.name || fromPhone;
        // Check if blocked
        const blocked = await dbGet(`blocked/${toUid}/${fromUid}`);
        if (blocked) return { success: false, error: "Unable to send request" };
        if (await dbGet(`connections/${fromUid}/${toUid}`)) return { success: false, error: "Already connected" };
        const myConn = await dbGet(`connections/${fromUid}`);
        if (myConn && Object.keys(myConn).length >= 3) return { success: false, error: "Circle is full (Max 3 connections)" };
        const existingRequests = await getPendingRequestsBySender(fromUid);
        if (existingRequests.some((request) => request.to === toUid && request.status === "pending")) {
            return { success: false, error: "Request already pending" };
        }
        const requestId = `${fromUid}_${toUid}`;
        await dbSet(`friendRequests/${requestId}`, {
            from: fromUid,
            fromPhone,
            fromDisplayName,
            to: toUid,
            toPhone: targetUserPhone,
            toDisplayName: targetDisplayName,
            status: "pending",
            createdAt: Date.now(),
        });
        return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
}

async function getPendingRequestsBySender(uid: string): Promise<FriendRequest[]> {
    try {
        if (isNative()) {
            const data = await restDbQueryByChild("friendRequests", "from", uid);
            const requests: FriendRequest[] = [];
            if (data) for (const [key, val] of Object.entries(data as Record<string, any>)) {
                if (val.status === "pending") requests.push({ id: key, ...val });
            }
            return dedupePendingRequests(requests);
        }

        const snapshot = await get(query(ref(database, "friendRequests"), orderByChild("from"), equalTo(uid)));
        const requests: FriendRequest[] = [];
        snapshot.forEach((c) => {
            const d = c.val();
            if (d.status === "pending") requests.push({ id: c.key as string, ...d });
        });
        return dedupePendingRequests(requests);
    } catch {
        return [];
    }
}

export async function getPendingRequests(uid: string): Promise<FriendRequest[]> {
    try {
        if (isNative()) {
            const data = await restDbQueryByChild("friendRequests", "to", uid);
            const requests: FriendRequest[] = [];
            if (data) for (const [key, val] of Object.entries(data as Record<string, any>)) {
                if (val.to === uid && val.status === "pending") requests.push({ id: key, ...val });
            }
            return dedupePendingRequests(requests);
        }
        const snapshot = await get(query(ref(database, "friendRequests"), orderByChild("to"), equalTo(uid)));
        const requests: FriendRequest[] = [];
        snapshot.forEach((c) => { const d = c.val(); if (d.status === "pending") requests.push({ id: c.key as string, ...d }); });
        return dedupePendingRequests(requests);
    } catch (error: any) { console.error("Error getting pending requests:", error); return []; }
}

export function subscribeToPendingRequests(uid: string, callback: (requests: FriendRequest[]) => void): Unsubscribe {
    if (isNative()) {
        let active = true;
        (async () => {
            while (active) {
                try {
                    const data = await restDbQueryByChild("friendRequests", "to", uid);
                    const requests: FriendRequest[] = [];
                    if (data) {
                        for (const [key, val] of Object.entries(data as Record<string, any>)) {
                            if (val.to === uid && val.status === "pending") {
                                requests.push({ id: key, ...val });
                            }
                        }
                    }
                    if (active) callback(dedupePendingRequests(requests));
                } catch (error) {
                    console.error("Pending requests poll error:", error);
                }
                await new Promise((resolve) => setTimeout(resolve, 5000));
            }
        })();
        return () => { active = false; };
    }

    const requestsQuery = query(ref(database, "friendRequests"), orderByChild("to"), equalTo(uid));
    const unsubscribe = onValue(requestsQuery, (snapshot) => {
        const requests: FriendRequest[] = [];
        snapshot.forEach((child) => {
            const data = child.val();
            if (data.status === "pending") {
                requests.push({ id: child.key as string, ...data });
            }
        });
        callback(dedupePendingRequests(requests));
    });

    return () => off(requestsQuery, "value", unsubscribe);
}

// Outgoing requests this user has sent that are still awaiting acceptance.
export function subscribeToSentRequests(uid: string, callback: (requests: FriendRequest[]) => void): Unsubscribe {
    if (isNative()) {
        let active = true;
        (async () => {
            while (active) {
                try {
                    const data = await restDbQueryByChild("friendRequests", "from", uid);
                    const requests: FriendRequest[] = [];
                    if (data) {
                        for (const [key, val] of Object.entries(data as Record<string, any>)) {
                            if (val.from === uid && val.status === "pending") {
                                requests.push({ id: key, ...val });
                            }
                        }
                    }
                    if (active) callback(dedupePendingRequests(requests));
                } catch (error) {
                    console.error("Sent requests poll error:", error);
                }
                await new Promise((resolve) => setTimeout(resolve, 5000));
            }
        })();
        return () => { active = false; };
    }

    const requestsQuery = query(ref(database, "friendRequests"), orderByChild("from"), equalTo(uid));
    const unsubscribe = onValue(requestsQuery, (snapshot) => {
        const requests: FriendRequest[] = [];
        snapshot.forEach((child) => {
            const data = child.val();
            if (data.status === "pending") {
                requests.push({ id: child.key as string, ...data });
            }
        });
        callback(dedupePendingRequests(requests));
    });

    return () => off(requestsQuery, "value", unsubscribe);
}

// Sender cancels their own outgoing request (rules allow from == auth.uid).
export async function cancelFriendRequest(requestId: string) {
    await dbSet(`friendRequests/${requestId}`, null);
}

export async function acceptFriendRequest(requestId: string) {
    try {
        const request = await dbGet(`friendRequests/${requestId}`);
        if (!request) return { success: false, error: "Request not found" };
        const defaultTheme = {
            heartColor: DEFAULT_SIGNAL_COLOR,
            nameColor: DEFAULT_SIGNAL_COLOR,
            iconShape: "hand",
            signalType: DEFAULT_SIGNAL_TYPE,
            signalColor: DEFAULT_SIGNAL_COLOR,
        };
        await dbUpdate(`friendRequests/${requestId}`, { status: "accepted" });
        await dbSet(`connections/${request.from}/${request.to}`, {
            phone: request.toPhone,
            displayName: request.toDisplayName || request.toPhone,
            status: "IDLE",
            lastActionTime: Date.now(),
            customMarco: "Marco?",
            customPolo: "Polo!",
            theme: defaultTheme,
        });
        await dbSet(`connections/${request.to}/${request.from}`, {
            phone: request.fromPhone,
            displayName: request.fromDisplayName || request.fromPhone,
            status: "IDLE",
            lastActionTime: Date.now(),
            customMarco: "Marco?",
            customPolo: "Polo!",
            theme: defaultTheme,
        });
        // If the accepter had also sent the other person a request, clear it so it
        // doesn't linger as "pending" now that they're connected.
        const reciprocalId = `${request.to}_${request.from}`;
        if (reciprocalId !== requestId) {
            try { await dbSet(`friendRequests/${reciprocalId}`, null); } catch { /* ignore */ }
        }
        return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function rejectFriendRequest(requestId: string) {
    await dbUpdate(`friendRequests/${requestId}`, { status: "rejected" });
}

export async function getConnections(uid: string): Promise<Friend[]> {
    const data = await dbGet(`connections/${uid}`);
    if (!data) return [];
    return Object.entries(data as Record<string, any>).map(([key, val]) => ({ id: key, ...val }));
}

export function subscribeToConnections(uid: string, callback: (friends: Friend[]) => void): Unsubscribe {
    if (isNative()) {
        let active = true;
        (async () => {
            while (active) {
                try {
                    const data = await restDbGet(`connections/${uid}`);
                    const friends: Friend[] = [];
                    if (data) for (const [fuid, val] of Object.entries(data as Record<string, any>)) {
                        if (!val) continue;
                        let dn = val.displayName || val.phone;
                        if (!val.displayName) {
                            try {
                                const u = await restDbGet(`users/${fuid}`);
                                if (u?.displayName) dn = u.displayName;
                                else if (u?.name) dn = u.name;
                            } catch { }
                        }
                        const theme = val.theme || {};
                        friends.push({
                            id: fuid,
                            ...val,
                            phone: val.phone || "Unknown",
                            displayName: dn,
                            theme: {
                                ...theme,
                                signalType: theme.signalType || mapLegacyShapeToSignal(theme.iconShape),
                                signalColor: theme.signalColor || theme.heartColor || DEFAULT_SIGNAL_COLOR,
                                heartColor: theme.heartColor || theme.signalColor || DEFAULT_SIGNAL_COLOR,
                                nameColor: theme.nameColor || theme.signalColor || theme.heartColor || DEFAULT_SIGNAL_COLOR,
                            },
                        });
                    }
                    if (active) callback(friends);
                } catch (e) { console.error("Poll error:", e); }
                await new Promise(r => setTimeout(r, 5000));
            }
        })();
        return () => { active = false; };
    }
    const connectionsRef = ref(database, `connections/${uid}`);
    const unsubscribe = onValue(connectionsRef, async (snapshot) => {
        const friends: Friend[] = [];
        if (snapshot.exists()) {
            const cd = snapshot.val();
            const resolved = await Promise.all(Object.keys(cd).map(async (fuid) => {
                const val = cd[fuid]; if (!val) return null;
                let dn = val.displayName || val.phone;
                if (!val.displayName) {
                    try {
                        const us = await get(ref(database, `users/${fuid}`));
                        if (us.exists()) {
                            const ud = us.val();
                            dn = ud.displayName || ud.name || dn;
                        }
                    } catch { }
                }
                const theme = val.theme || {};
                return {
                    id: fuid,
                    ...val,
                    phone: val.phone || "Unknown",
                    displayName: dn,
                    theme: {
                        ...theme,
                        signalType: theme.signalType || mapLegacyShapeToSignal(theme.iconShape),
                        signalColor: theme.signalColor || theme.heartColor || DEFAULT_SIGNAL_COLOR,
                        heartColor: theme.heartColor || theme.signalColor || DEFAULT_SIGNAL_COLOR,
                        nameColor: theme.nameColor || theme.signalColor || theme.heartColor || DEFAULT_SIGNAL_COLOR,
                    },
                };
            }));
            friends.push(...resolved.filter(f => f !== null));
        }
        callback(friends);
    });
    return () => off(connectionsRef, "value", unsubscribe);
}

export async function sendMarco(fromUid: string, toUid: string, toPhone: string) {
    try {
        // Check if they removed us first
        const reverseConn = await dbGet(`connections/${toUid}/${fromUid}`);
        if (!reverseConn) {
            // They removed us — clean up our side
            await dbSet(`connections/${fromUid}/${toUid}`, null);
            return { success: false, error: "removed" };
        }
        await dbUpdate(`connections/${fromUid}/${toUid}`, { status: "MARCO_SENT", lastActionTime: Date.now() });
        await dbUpdate(`connections/${toUid}/${fromUid}`, { status: "MARCO_RECEIVED", lastActionTime: Date.now() });
        return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function sendPolo(fromUid: string, toUid: string) {
    try {
        // Check if they removed us first
        const reverseConn = await dbGet(`connections/${toUid}/${fromUid}`);
        if (!reverseConn) {
            await dbSet(`connections/${fromUid}/${toUid}`, null);
            return { success: false, error: "removed" };
        }
        await dbUpdate(`connections/${toUid}/${fromUid}`, { status: "POLO_RECEIVED", lastActionTime: Date.now() });
        await dbUpdate(`connections/${fromUid}/${toUid}`, { status: "IDLE", lastActionTime: Date.now() });
        setTimeout(async () => { try { await dbUpdate(`connections/${toUid}/${fromUid}`, { status: "IDLE" }); } catch { } }, 4000);
        return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function sendEmergencySOS(uid: string) {
    try {
        const connections = await getConnections(uid);
        const savedStatuses: { fid: string; myStatus: string; theirStatus: string }[] = [];
        for (const friend of connections) {
            if (friend.id) {
                // Save current statuses before overwriting with SOS
                const myConn = await dbGet(`connections/${uid}/${friend.id}`);
                const myPrevStatus = myConn?.status || "IDLE";
                
                await dbUpdate(`connections/${uid}/${friend.id}`, { status: "SOS_SENT", lastActionTime: Date.now() });
                
                const reverseConn = await dbGet(`connections/${friend.id}/${uid}`);
                const theirPrevStatus = reverseConn?.status || "IDLE";
                if (reverseConn) {
                    await dbUpdate(`connections/${friend.id}/${uid}`, { status: "SOS_RECEIVED", lastActionTime: Date.now() });
                }
                savedStatuses.push({ fid: friend.id, myStatus: myPrevStatus, theirStatus: theirPrevStatus });
            }
        }
        // Help is temporary. Restore the prior Marco/Polo state if nothing else changed.
        setTimeout(async () => {
            for (const { fid, myStatus, theirStatus } of savedStatuses) {
                try {
                    // Only restore if status is still SOS (user may have sent new Marco in the meantime)
                    const myConn = await dbGet(`connections/${uid}/${fid}`);
                    if (myConn && myConn.status === "SOS_SENT") {
                        await dbUpdate(`connections/${uid}/${fid}`, { status: myStatus });
                    }
                    const rev = await dbGet(`connections/${fid}/${uid}`);
                    if (rev && rev.status === "SOS_RECEIVED") {
                        await dbUpdate(`connections/${fid}/${uid}`, { status: theirStatus });
                    }
                } catch {}
            }
        }, HELP_STATUS_EXPIRY_MS);
        return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function updateCustomMessages(uid: string, marco: string, polo: string, recoveryEmail?: string, displayName?: string) {
    try {
        const updates: any = { customMarco: await encryptCustomMessage(marco), customPolo: await encryptCustomMessage(polo) };
        if (recoveryEmail !== undefined) updates.email = recoveryEmail;
        if (displayName !== undefined) updates.displayName = displayName;
        await dbUpdate(`users/${uid}`, updates);
        return { success: true };
    } catch (error: any) { return { success: false, error: error.message }; }
}

export async function updateFriendCardSettings(
    myUid: string,
    friendUid: string,
    settings: {
        theme?: { heartColor: string; nameColor: string; iconShape?: string; signalType?: SignalType; signalColor?: string };
        customMarco?: string;
        customPolo?: string;
    }
) {
    try {
        const updates: Record<string, unknown> = {};
        if (settings.theme) updates.theme = settings.theme;
        if (settings.customMarco !== undefined) updates.customMarco = settings.customMarco;
        if (settings.customPolo !== undefined) updates.customPolo = settings.customPolo;
        await dbUpdate(`connections/${myUid}/${friendUid}`, updates);
        await dbUpdate(`connections/${friendUid}/${myUid}`, updates);
        return { success: true };
    }
    catch (error: any) { return { success: false, error: error.message }; }
}

export async function removeConnection(myUid: string, friendUid: string) {
    try { await dbSet(`connections/${myUid}/${friendUid}`, null); await dbSet(`connections/${friendUid}/${myUid}`, null); return { success: true }; }
    catch (error: any) { return { success: false, error: error.message }; }
}

export async function updateUserName(uid: string, name: string) {
    try { await dbUpdate(`users/${uid}`, { displayName: name }); return { success: true }; }
    catch (error: any) { return { success: false, error: error.message }; }
}

function makeDebugSelfTestTheme() {
    return {
        heartColor: DEFAULT_SIGNAL_COLOR,
        nameColor: DEFAULT_SIGNAL_COLOR,
        signalType: DEFAULT_SIGNAL_TYPE,
        signalColor: DEFAULT_SIGNAL_COLOR,
    };
}

export async function ensureDebugSelfTestConnection(uid: string) {
    const theme = makeDebugSelfTestTheme();
    const fakeConnection = {
        phone: "+46700000000",
        displayName: "Self Test",
        status: "IDLE" as GameStatus,
        lastActionTime: Date.now(),
        customMarco: "Marco?",
        customPolo: "Polo!",
        theme,
    };

    await dbSet(`connections/${uid}/${DEBUG_SELF_TEST_UID}`, fakeConnection);
    await dbSet(`connections/${DEBUG_SELF_TEST_UID}/${uid}`, {
        ...fakeConnection,
        phone: "",
        displayName: "You",
    });
    return { success: true };
}

export async function resetDebugSelfTestConnection(uid: string) {
    await ensureDebugSelfTestConnection(uid);
    await dbUpdate(`connections/${uid}/${DEBUG_SELF_TEST_UID}`, {
        status: "IDLE",
        lastActionTime: Date.now(),
    });
    await dbUpdate(`connections/${DEBUG_SELF_TEST_UID}/${uid}`, {
        status: "IDLE",
        lastActionTime: Date.now(),
    });
    return { success: true };
}

export async function triggerDebugSelfTestMarco(uid: string) {
    await ensureDebugSelfTestConnection(uid);
    await dbUpdate(`connections/${uid}/${DEBUG_SELF_TEST_UID}`, {
        status: "MARCO_RECEIVED",
        lastActionTime: Date.now(),
    });
    await dbUpdate(`connections/${DEBUG_SELF_TEST_UID}/${uid}`, {
        status: "MARCO_SENT",
        lastActionTime: Date.now(),
    });
    return { success: true };
}

export async function triggerDebugSelfTestPolo(uid: string) {
    await ensureDebugSelfTestConnection(uid);
    await dbUpdate(`connections/${uid}/${DEBUG_SELF_TEST_UID}`, {
        status: "POLO_RECEIVED",
        lastActionTime: Date.now(),
    });
    await dbUpdate(`connections/${DEBUG_SELF_TEST_UID}/${uid}`, {
        status: "IDLE",
        lastActionTime: Date.now(),
    });
    setTimeout(async () => {
        try {
            await dbUpdate(`connections/${uid}/${DEBUG_SELF_TEST_UID}`, { status: "IDLE" });
        } catch {}
    }, 4000);
    return { success: true };
}
