/**
 * Native iOS notification helpers using Capacitor Local Notifications
 * Triggered by the polling loop when it detects new Marco/help signals
 */
import { Capacitor } from "@capacitor/core";
import { getNativeUid, restDbUpdate } from "./auth";
import { playIncomingSignalHaptic } from "../haptics";
import { playSignalHaptics, type SignalPlaybackState } from "../signalAudio";
import type { SignalType } from "../signals";

let notificationsInitialized = false;
let notificationIdCounter = 1;
let fcmListenersInstalled = false;

function normalizeSignalType(raw: unknown): SignalType | null {
    const signal = String(raw || "").toLowerCase();
    if (signal === "finger") {
        return "hand";
    }
    if (signal === "heart" || signal === "wind" || signal === "fist" || signal === "hand" || signal === "sphere" || signal === "eye") {
        return signal;
    }
    return null;
}

function normalizeSignalState(type: string, raw: unknown): SignalPlaybackState | null {
    const state = String(raw || "").toLowerCase();
    if (state === "marco-sent" || state === "marco-received" || state === "polo-sent") {
        return state;
    }
    if (type === "marco") return "marco-received";
    if (type === "polo") return "polo-sent";
    return null;
}

async function getLocalNotifications() {
    const { LocalNotifications } = await import("@capacitor/local-notifications");
    return LocalNotifications;
}

// Store the FCM registration token on the user's record so the notification
// Cloud Function can push to it. Written directly (own-node write, allowed by
// the security rules on the native REST path) — no legacy APNs->FCM conversion.
async function storeFcmToken(token: string): Promise<void> {
    const uid = getNativeUid();
    if (!uid || !token) return;
    try {
        await restDbUpdate(`users/${uid}`, {
            fcmToken: token,
            notificationsEnabled: true,
            lastTokenUpdate: Date.now(),
        });
        console.log("📲 FCM token stored for", uid);
    } catch (error) {
        console.error("Failed to store FCM token:", error);
    }
}

function handleForegroundHaptics(data: Record<string, unknown> | undefined) {
    const type = String(data?.type || "").toLowerCase();
    const signalType = normalizeSignalType(data?.signalType);
    const signalState = normalizeSignalState(type, data?.signalState);
    if (signalType && signalState) {
        void playSignalHaptics(signalType, signalState);
        return;
    }
    if (type === "marco") void playIncomingSignalHaptic("marco");
    else if (type === "polo") void playIncomingSignalHaptic("polo");
    else if (type === "sos") void playIncomingSignalHaptic("help");
}

export async function initNativePushNotifications(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;

    try {
        // Get a real FCM registration token directly from the Firebase iOS SDK.
        // Replaces the dead legacy iid.googleapis.com batchImport conversion.
        const { FirebaseMessaging } = await import("@capacitor-firebase/messaging");

        const permission = await FirebaseMessaging.requestPermissions();
        if (permission.receive !== "granted") return false;

        if (!fcmListenersInstalled) {
            fcmListenersInstalled = true;
            await FirebaseMessaging.addListener("tokenReceived", (event) => {
                if (event?.token) void storeFcmToken(event.token);
            });
            await FirebaseMessaging.addListener("notificationReceived", (event) => {
                handleForegroundHaptics(event?.notification?.data as Record<string, unknown> | undefined);
            });
        }

        const { token } = await FirebaseMessaging.getToken();
        if (token) await storeFcmToken(token);
        return !!token;
    } catch (error) {
        console.error("FCM registration error:", error);
        return false;
    }
}

/**
 * Initialize notification permissions on native iOS
 * Call this once on app launch
 */
export async function initNativeNotifications(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;

    try {
        const LocalNotifications = await getLocalNotifications();

        // Request permission
        const result = await LocalNotifications.requestPermissions();
        console.log("Notification permission:", result.display);

        if (result.display === "granted") {
            const pushReady = await initNativePushNotifications();
            notificationsInitialized = pushReady;
            return pushReady;
        }
        return false;
    } catch (error) {
        console.error("Error initializing notifications:", error);
        return false;
    }
}

/**
 * Send a local notification for Marco received
 */
export async function notifyMarcoReceived(fromName: string) {
    if (!Capacitor.isNativePlatform()) return;

    try {
        const LocalNotifications = await getLocalNotifications();
        await LocalNotifications.schedule({
            notifications: [{
                title: "Marco? 💙",
                body: `${fromName} is checking in on you`,
                id: notificationIdCounter++,
                sound: "default",
                smallIcon: "ic_notification",
                largeIcon: "ic_notification",
            }]
        });
        await playIncomingSignalHaptic("marco");
    } catch (error) {
        console.error("Error sending Marco notification:", error);
    }
}

/**
 * Send a local notification for Polo received
 */
export async function notifyPoloReceived(fromName: string) {
    if (!Capacitor.isNativePlatform()) return;

    try {
        const LocalNotifications = await getLocalNotifications();
        await LocalNotifications.schedule({
            notifications: [{
                title: "Polo! 💚",
                body: `${fromName} responded — they're okay!`,
                id: notificationIdCounter++,
                sound: "default",
                smallIcon: "ic_notification",
                largeIcon: "ic_notification",
            }]
        });
        await playIncomingSignalHaptic("polo");
    } catch (error) {
        console.error("Error sending Polo notification:", error);
    }
}

/**
 * Send an urgent local notification for a help request
 */
export async function notifySOSReceived(fromName: string) {
    if (!Capacitor.isNativePlatform()) return;

    try {
        const LocalNotifications = await getLocalNotifications();

        // Schedule the main help notification
        await LocalNotifications.schedule({
            notifications: [{
                title: "Help Needed",
                body: `${fromName} is asking for help right now.`,
                id: notificationIdCounter++,
                sound: "default",
                smallIcon: "ic_notification",
                largeIcon: "ic_notification",
            }]
        });

        await playIncomingSignalHaptic("help");
    } catch (error) {
        console.error("Error sending help notification:", error);
    }
}
