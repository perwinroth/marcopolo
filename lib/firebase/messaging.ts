import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { ref, update } from "firebase/database";
import { database } from "./config";

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(userId: string): Promise<boolean> {
  try {
    // Check if notifications are supported
    const supported = await isSupported();
    if (!supported) {
      console.log("Notifications not supported in this browser");
      return false;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      const messaging = getMessaging();
      
      // Get FCM token
      const token = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
      });
      
      console.log("FCM Token:", token);
      
      // Save token to user profile
      await update(ref(database, `users/${userId}`), {
        fcmToken: token,
        notificationsEnabled: true,
        lastTokenUpdate: Date.now()
      });
      
      return true;
    } else {
      console.log("Notification permission denied");
      return false;
    }
  } catch (error: any) {
    console.error("Error requesting notification permission:", error);
    return false;
  }
}

/**
 * Listen to foreground messages (when app is open)
 */
export function listenToForegroundMessages(callback: (payload: any) => void) {
  isSupported().then((supported) => {
    if (!supported) return;
    
    const messaging = getMessaging();
    return onMessage(messaging, (payload) => {
      console.log("Foreground message received:", payload);
      callback(payload);
    });
  });
}

/**
 * Check if user has granted notification permission
 */
export function hasNotificationPermission(): boolean {
  return typeof Notification !== 'undefined' && Notification.permission === 'granted';
}

/**
 * Check if notifications are supported
 */
export async function areNotificationsSupported(): Promise<boolean> {
  return await isSupported();
}
