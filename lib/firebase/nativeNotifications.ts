/**
 * Native iOS notification helpers using Capacitor Local Notifications
 * Triggered by the polling loop when it detects new Marco/help signals
 */
import { Capacitor } from "@capacitor/core";
import { PushNotifications, Token } from "@capacitor/push-notifications";
import { callFunction } from "./functions";

let notificationsInitialized = false;
let notificationIdCounter = 1;
let pushRegistrationStarted = false;
let pushRegistrationComplete = false;
let pushListenerInstalled = false;

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

        // Also trigger haptics for urgency
        try {
            const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
            // Triple heavy impact for help requests
            await Haptics.impact({ style: ImpactStyle.Heavy });
            setTimeout(async () => {
                await Haptics.impact({ style: ImpactStyle.Heavy });
                setTimeout(async () => {
                    await Haptics.impact({ style: ImpactStyle.Heavy });
                }, 200);
            }, 200);
        } catch { /* haptics optional */ }
    } catch (error) {
        console.error("Error sending help notification:", error);
    }
}
