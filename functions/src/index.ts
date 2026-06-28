import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import * as nodemailer from "nodemailer";
import * as crypto from "crypto";
import { normalizePushBundleId, getUserPushTokenField } from "./pushTokens";

const corsLib = require("cors") as typeof import("cors");

admin.initializeApp();

const cors = corsLib({ origin: true });
const region = "europe-west1";

type DeliveryPriority = "normal" | "high";
type NotificationKind = "marco" | "polo" | "sos";
type SignalType = "heart" | "wind" | "fist" | "hand" | "sphere" | "eye" | "finger";
type RecoveryRequestRecord = {
    code: string;
    email: string;
    expiresAt: number;
    requestedAt: number;
};
type UserRecord = {
    displayName?: string;
    email?: string;
    fcmToken?: string;
    notificationsEnabled?: boolean;
    phone?: string;
    watchToken?: string;
};
type ConnectionThemeRecord = {
    signalType?: SignalType;
    iconShape?: string;
};

const DEFAULT_SIGNAL_TYPE: SignalType = "hand";

function normalizeSignalType(signalType?: string, iconShape?: string): SignalType {
    if (signalType === "finger") {
        return "hand";
    }
    if (signalType === "heart" || signalType === "wind" || signalType === "fist" || signalType === "hand" || signalType === "sphere" || signalType === "eye" || signalType === "finger") {
        return signalType;
    }

    if (iconShape === "heart") return "heart";
    if (iconShape === "circle") return "sphere";
    if (iconShape === "hand") return "hand";
    return DEFAULT_SIGNAL_TYPE;
}

function withCors(
    handler: (req: functions.https.Request, res: functions.Response<unknown>) => Promise<void>
): functions.HttpsFunction {
    return functions.region(region).https.onRequest((req, res) => {
        cors(req, res, () => {
            void handler(req, res).catch((error: unknown) => {
                const message = error instanceof Error ? error.message : "Unknown error";
                console.error("[Functions] Unhandled error:", error);
                res.status(500).json({ error: message });
            });
        });
    });
}

async function verifyBearerToken(req: functions.https.Request): Promise<admin.auth.DecodedIdToken> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new functions.https.HttpsError("unauthenticated", "Missing or invalid auth token");
    }

    const idToken = authHeader.slice("Bearer ".length);
    return admin.auth().verifyIdToken(idToken);
}

function requirePost(req: functions.https.Request): void {
    if (req.method !== "POST") {
        throw new functions.https.HttpsError("invalid-argument", "Method Not Allowed");
    }
}

function safeEmailKey(email: string): string {
    return email.trim().toLowerCase().replace(/[.#$[\]]/g, "_");
}

// Mirrors lib/firebase/invitations.ts hashPhone(canonicalizePhone(phone)) so we
// can find pending invitations that were addressed to this user's phone.
function hashUserPhone(phone: string): string {
    const salt = process.env.NEXT_PUBLIC_PHONE_SALT || "marco-polo-salt";
    const normalized = phone.replace(/\D/g, "");
    return crypto.createHash("sha256").update(normalized + salt).digest("hex");
}

function generateRecoveryCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function getMessagingServerKey(): string | undefined {
    return process.env.FCM_SERVER_KEY || functions.config().messaging?.server_key;
}

function getMailer(): nodemailer.Transporter | null {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        return null;
    }

    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
}

async function getUser(uid: string): Promise<UserRecord | null> {
    const snapshot = await admin.database().ref(`users/${uid}`).get();
    return snapshot.exists() ? (snapshot.val() as UserRecord) : null;
}

async function getDisplayName(uid: string): Promise<string> {
    const user = await getUser(uid);
    if (!user) return "Someone";
    return user.displayName || user.phone || "Someone";
}

function buildNotificationMessage(kind: NotificationKind, senderName: string, signalType: SignalType = DEFAULT_SIGNAL_TYPE): {
    title: string;
    body: string;
    priority: DeliveryPriority;
    data: Record<string, string>;
} {
    if (kind === "marco") {
        return {
            title: "Marco?",
            body: `${senderName} is checking in on you`,
            priority: "normal",
            data: {
                type: "marco",
                signalType,
                signalState: "marco-received",
            },
        };
    }

    if (kind === "polo") {
        return {
            title: "Polo!",
            body: `${senderName} responded. They are okay.`,
            priority: "normal",
            data: {
                type: "polo",
                signalType,
                signalState: "polo-sent",
            },
        };
    }

    return {
        title: "Help Needed",
        body: `${senderName} needs help right now.`,
        priority: "high",
        data: {
            type: "sos",
            signalType,
            signalState: "marco-received",
        },
    };
}

async function getConnectionSignalType(uid: string, friendUid: string): Promise<SignalType> {
    const snapshot = await admin.database().ref(`connections/${uid}/${friendUid}/theme`).get();
    if (!snapshot.exists()) {
        return DEFAULT_SIGNAL_TYPE;
    }

    const theme = snapshot.val() as ConnectionThemeRecord;
    return normalizeSignalType(theme.signalType, theme.iconShape);
}

async function sendPushToUser(
    toUid: string,
    payload: {
        title: string;
        body: string;
        data?: Record<string, string>;
        priority?: DeliveryPriority;
    }
): Promise<admin.messaging.BatchResponse | null> {
    const user = await getUser(toUid);
    if (!user) return null;

    const tokens = [user.fcmToken, user.watchToken].filter((token): token is string => Boolean(token));
    if (tokens.length === 0) return null;
    if (user.notificationsEnabled === false) return null;

    const priority = payload.priority || "normal";
    return admin.messaging().sendEachForMulticast({
        tokens,
        notification: {
            title: payload.title,
            body: payload.body,
        },
        data: payload.data,
        android: {
            priority: priority === "high" ? "high" : "normal",
            notification: {
                channelId: priority === "high" ? "help-alerts" : "marco-polo",
                sound: "default",
            },
        },
        apns: {
            headers: {
                "apns-push-type": "alert",
                "apns-priority": priority === "high" ? "10" : "5",
            },
            payload: {
                aps: {
                    sound: "default",
                    badge: 1,
                },
            },
        },
        webpush: {
            headers: {
                Urgency: priority === "high" ? "high" : "normal",
            },
            notification: {
                icon: "/icon-192x192.png",
                badge: "/icon-192x192.png",
            },
        },
    });
}

async function convertApnsToken(apnsToken: string, bundleId: string): Promise<string | null> {
    const serverKey = getMessagingServerKey();
    if (!serverKey) {
        throw new Error("Missing FCM server key");
    }

    const convertUrl = "https://iid.googleapis.com/iid/v1:batchImport";

    for (const isSandbox of [false, true]) {
        const response = await fetch(convertUrl, {
            method: "POST",
            headers: {
                Authorization: `key=${serverKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                application: bundleId,
                sandbox: isSandbox,
                apns_tokens: [apnsToken],
            }),
        });

        const conversionData = (await response.json()) as {
            results?: Array<{ registration_token?: string }>;
        };

        const token = conversionData.results?.[0]?.registration_token;
        if (response.ok && token) {
            console.log(`[WatchAuth] APNs conversion succeeded with sandbox=${isSandbox}`);
            return token;
        }
    }

    return null;
}

export const sendRecoveryCode = withCors(async (req, res) => {
    requirePost(req);

    const email = String(req.body?.email || "").trim().toLowerCase();
    if (!email) {
        res.status(400).json({ error: "Email is required" });
        return;
    }

    const now = Date.now();
    const requestRef = admin.database().ref(`recoveryRequests/${safeEmailKey(email)}`);
    const existingSnapshot = await requestRef.get();
    if (existingSnapshot.exists()) {
        const existing = existingSnapshot.val() as RecoveryRequestRecord;
        if (existing.requestedAt && now - existing.requestedAt < 60_000) {
            res.status(429).json({ error: "Please wait before requesting another code." });
            return;
        }
    }

    const code = generateRecoveryCode();
    const expiresAt = now + 15 * 60_000;
    await requestRef.set({
        code,
        email,
        expiresAt,
        requestedAt: now,
    } satisfies RecoveryRequestRecord);

    const mailer = getMailer();
    if (mailer) {
        await mailer.sendMail({
            from: `"Marco Polo (polomar.co)" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: "Your Account Recovery Code",
            text: `Your recovery code is: ${code}\n\nIt expires in 15 minutes.`,
        });
    } else {
        console.warn(`[Recovery] EMAIL_USER / EMAIL_PASS missing. Code for ${email}: ${code}`);
    }

    res.status(200).json({ success: true });
});

export const verifyRecoveryCode = withCors(async (req, res) => {
    requirePost(req);

    const email = String(req.body?.email || "").trim().toLowerCase();
    const code = String(req.body?.code || "").trim();
    if (!email || !code) {
        res.status(400).json({ error: "Email and code are required" });
        return;
    }

    const requestRef = admin.database().ref(`recoveryRequests/${safeEmailKey(email)}`);
    const snapshot = await requestRef.get();
    if (!snapshot.exists()) {
        res.status(400).json({ error: "Invalid or expired code" });
        return;
    }

    const record = snapshot.val() as RecoveryRequestRecord;
    if (record.code !== code || Date.now() > record.expiresAt) {
        res.status(400).json({ error: "Invalid or expired code" });
        return;
    }

    const userQuery = await admin.database().ref("users").orderByChild("email").equalTo(email).limitToFirst(1).get();
    if (!userQuery.exists()) {
        res.status(404).json({ error: "No account found with this recovery email" });
        return;
    }

    let uid = "";
    userQuery.forEach((child) => {
        uid = child.key || "";
        return true;
    });

    if (!uid) {
        res.status(404).json({ error: "User not found" });
        return;
    }

    await requestRef.remove();
    const token = await admin.auth().createCustomToken(uid);
    res.status(200).json({ success: true, token });
});

export const registerWatch = withCors(async (req, res) => {
    requirePost(req);

    const decodedToken = await verifyBearerToken(req);
    const apnsToken = String(req.body?.apnsToken || "").trim();
    const requestedBundleId = String(req.body?.bundleId || "").trim();
    if (!apnsToken) {
        res.status(400).json({ error: "Missing apnsToken" });
        return;
    }

    const bundleId = normalizePushBundleId(requestedBundleId);

    const fcmToken = await convertApnsToken(apnsToken, bundleId);
    if (!fcmToken) {
        res.status(500).json({ error: "Token conversion failed" });
        return;
    }

    const tokenField = getUserPushTokenField(bundleId);
    await admin.database().ref(`users/${decodedToken.uid}`).update({
        [tokenField]: fcmToken,
        notificationsEnabled: true,
        lastTokenUpdate: Date.now(),
    });

    res.status(200).json({ success: true });
});

export const sendNotification = withCors(async (req, res) => {
    requirePost(req);

    const decodedToken = await verifyBearerToken(req);
    const explicitToUid = typeof req.body?.toUid === "string" ? req.body.toUid : undefined;
    const watchReceiverId = typeof req.body?.receiverId === "string" ? req.body.receiverId : undefined;
    const toUid = explicitToUid || watchReceiverId;

    if (!toUid) {
        res.status(400).json({ error: "Missing recipient user id" });
        return;
    }

    const watchSenderId = typeof req.body?.senderId === "string" ? req.body.senderId : decodedToken.uid;
    if (watchSenderId !== decodedToken.uid) {
        res.status(403).json({ error: "Sender mismatch" });
        return;
    }

    let payload = {
        title: String(req.body?.notification?.title || ""),
        body: String(req.body?.notification?.body || ""),
        data: {} as Record<string, string>,
        priority: (req.body?.data?.priority === "high" ? "high" : "normal") as DeliveryPriority,
    };

    const requestedType = typeof req.body?.type === "string" ? req.body.type.toLowerCase() : "";
    if (requestedType === "marco" || requestedType === "marco_received") {
        payload = buildNotificationMessage(
            "marco",
            await getDisplayName(watchSenderId),
            await getConnectionSignalType(toUid, watchSenderId)
        );
    } else if (requestedType === "polo" || requestedType === "polo_received") {
        payload = buildNotificationMessage(
            "polo",
            await getDisplayName(watchSenderId),
            await getConnectionSignalType(toUid, watchSenderId)
        );
    } else if (requestedType === "sos" || requestedType === "sos_received") {
        payload = buildNotificationMessage(
            "sos",
            await getDisplayName(watchSenderId),
            await getConnectionSignalType(toUid, watchSenderId)
        );
    } else {
        payload.data = Object.fromEntries(
            Object.entries(req.body?.data || {}).map(([key, value]) => [key, String(value)])
        );
    }

    const result = await sendPushToUser(toUid, payload);
    res.status(200).json({ success: true, result });
});

export const notifyOnConnectionStatusChange = functions
    .region(region)
    .database.ref("/connections/{uid}/{friendUid}/status")
    .onWrite(async (change, context) => {
        const before = change.before.val() as string | null;
        const after = change.after.val() as string | null;
        if (!after || before === after) {
            return null;
        }

        let kind: NotificationKind | null = null;
        if (after === "MARCO_RECEIVED") kind = "marco";
        if (after === "POLO_RECEIVED") kind = "polo";
        if (after === "SOS_RECEIVED") kind = "sos";
        if (!kind) {
            return null;
        }

        const recipientUid = String(context.params.uid);
        const senderUid = String(context.params.friendUid);
        const senderName = await getDisplayName(senderUid);
        const signalType = await getConnectionSignalType(recipientUid, senderUid);
        const payload = buildNotificationMessage(kind, senderName, signalType);
        await sendPushToUser(recipientUid, payload);
        return null;
    });

// Full GDPR account deletion. Runs with admin privileges so it can remove data
// the client cannot reach under the security rules: recoveryRequests (admin
// only), invitations addressed to / accepted by the user, and block entries
// other users created against them. The caller is identified by their ID token,
// so a user can only delete their own account.
export const deleteAccount = withCors(async (req, res) => {
    requirePost(req);

    const decoded = await verifyBearerToken(req);
    const uid = decoded.uid;
    const db = admin.database();
    const user = await getUser(uid);

    // Collect every path to null into one atomic multi-location update.
    const updates: Record<string, null> = {};

    // 1. Profile (includes fcmToken / watchToken / email / phone).
    updates[`users/${uid}`] = null;

    // 2. Connections — mine and each friend's reverse pointer back to me.
    const connSnap = await db.ref(`connections/${uid}`).get();
    if (connSnap.exists()) {
        for (const friendUid of Object.keys(connSnap.val() as Record<string, unknown>)) {
            updates[`connections/${uid}/${friendUid}`] = null;
            updates[`connections/${friendUid}/${uid}`] = null;
        }
    }
    updates[`connections/${uid}`] = null;

    // 3. Blocks — mine, plus anyone who blocked me.
    updates[`blocked/${uid}`] = null;
    const blockedSnap = await db.ref("blocked").get();
    if (blockedSnap.exists()) {
        const all = blockedSnap.val() as Record<string, Record<string, unknown>>;
        for (const blockerUid of Object.keys(all)) {
            if (all[blockerUid] && Object.prototype.hasOwnProperty.call(all[blockerUid], uid)) {
                updates[`blocked/${blockerUid}/${uid}`] = null;
            }
        }
    }

    // 4. Friend requests I sent or received.
    const [fromSnap, toSnap] = await Promise.all([
        db.ref("friendRequests").orderByChild("from").equalTo(uid).get(),
        db.ref("friendRequests").orderByChild("to").equalTo(uid).get(),
    ]);
    for (const snap of [fromSnap, toSnap]) {
        if (snap.exists()) {
            for (const id of Object.keys(snap.val() as Record<string, unknown>)) {
                updates[`friendRequests/${id}`] = null;
            }
        }
    }

    // 5. Invitations I sent, accepted, or that were addressed to my phone.
    const phoneHash = user?.phone ? hashUserPhone(user.phone) : null;
    const invSnap = await db.ref("invitations").get();
    if (invSnap.exists()) {
        const all = invSnap.val() as Record<string, { inviterId?: string; acceptedBy?: string; inviteePhoneHash?: string }>;
        for (const id of Object.keys(all)) {
            const inv = all[id];
            if (inv.inviterId === uid || inv.acceptedBy === uid || (phoneHash && inv.inviteePhoneHash === phoneHash)) {
                updates[`invitations/${id}`] = null;
            }
        }
    }

    // 6. Recovery requests (keyed by email).
    if (user?.email) {
        updates[`recoveryRequests/${safeEmailKey(user.email)}`] = null;
    }

    // Apply all database deletions atomically.
    await db.ref().update(updates);

    // Finally remove the Firebase Auth account (revokes the user's tokens).
    try {
        await admin.auth().deleteUser(uid);
    } catch (error: unknown) {
        // If the auth user is already gone, the data wipe still succeeded.
        console.warn("[deleteAccount] auth user delete:", error);
    }

    res.status(200).json({ success: true });
});
