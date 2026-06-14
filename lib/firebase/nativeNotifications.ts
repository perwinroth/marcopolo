/**
 * Native iOS notification helpers using Capacitor Local Notifications
 * Triggered by the polling loop when it detects new Marco/help signals
 */
import { Capacitor } from "@capacitor/core";
import { PushNotifications, Token } from "@capacitor/push-notifications";
import { callFunction } from "./functions";
import { playIncomingSignalHaptic } from "../haptics";
import { playSignalHaptics, type SignalPlaybackState } from "../signalAudio";
import type { SignalType } from "../signals";

let notificationsInitialized = false;
let notificationIdCounter = 1;
let pushRegistrationStarted = false;
let pushRegistrationComplete = false;
let pushListenerInstalled = false;

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

async function registerNativePushToken(apnsToken: string) {
    const storedToken = localStorage.getItem("mp_registered_apns_token");
    if (storedToken === apnsToken) {
        return;
    }

    await callFunction<{ success: boolean }>("registerWatch", {
        body: { apnsToken, bundleId: "co.polomar.app" },
    });
    localStorage.setItem("mp_registered_apns_token", apnsToken);
}

function installPushListeners() {
    if (pushListenerInstalled) return;
    pushListenerInstalled = true;

    void PushNotifications.addListener("registration", (token: Token) => {
        console.log("📲 Native push registration token:", token.value);
        void registerNativePushToken(token.value).catch((error) => {
            console.error("Error registering native push token:", error);
        });
    });

    void PushNotifications.addListener("registrationError", (error) => {
        console.error("Native push registration error:", error);
    });

    void PushNotifications.addListener("pushNotificationReceived", (notification) => {
        const type = String(notification.data?.type || "").toLowerCase();
        const signalType = normalizeSignalType(notification.data?.signalType);
        const signalState = normalizeSignalState(type, notification.data?.signalState);
        if (signalType && signalState) {
            void playSignalHaptics(signalType, signalState);
            return;
        }
        if (type === "marco") {
            void playIncomingSignalHaptic("marco");
        } else if (type === "polo") {
            void playIncomingSignalHaptic("polo");
        } else if (type === "sos") {
            void playIncomingSignalHaptic("help");
        }
    });
}

export async function initNativePushNotifications(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;

    installPushListeners();

    const permission = await PushNotifications.checkPermissions();
    if (permission.receive !== "granted") {
        const requested = await PushNotifications.requestPermissions();
        if (requested.receive !== "granted") {
            return false;
        }
    }

    if (!pushRegistrationStarted || !pushRegistrationComplete) {
        pushRegistrationStarted = true;
        await PushNotifications.register();
        pushRegistrationComplete = true;
    }

    return true;
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
