"use client";

import { useState, useEffect } from "react";
import { Bell, X } from "lucide-react";
import { requestNotificationPermission, hasNotificationPermission, areNotificationsSupported } from "@/lib/firebase/messaging";
import { Capacitor } from "@capacitor/core";
import { initNativeNotifications } from "@/lib/firebase/nativeNotifications";

interface NotificationPermissionBannerProps {
  userId: string;
}

export default function NotificationPermissionBanner({ userId }: NotificationPermissionBannerProps) {
  const [show, setShow] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const checkSupport = async () => {
      if (Capacitor.isNativePlatform()) {
        // On native, use Capacitor Local Notifications
        setSupported(true);
        // Auto-request immediately on native (iOS will show system prompt)
        const granted = await initNativeNotifications();
        if (!granted) {
            // Show banner if not granted
            setTimeout(() => setShow(true), 3000);
        }
        // If granted, no banner needed
        return;
      }
      
      // Web: use Firebase messaging
      const isSupported = await areNotificationsSupported();
      setSupported(isSupported);
      
      if (isSupported && !hasNotificationPermission()) {
        setTimeout(() => setShow(true), 3000);
      }
    };
    
    checkSupport();
  }, []);

  const handleRequest = async () => {
    setRequesting(true);
    try {
        if (Capacitor.isNativePlatform()) {
            const granted = await initNativeNotifications();
            if (granted) {
                setShow(false);
            } else {
                alert("Please enable notifications in Settings > Marco Polo");
            }
        } else {
            const granted = await requestNotificationPermission(userId);
            if (granted) {
                alert("Success! Notifications enabled.");
                setShow(false);
            } else {
                alert("Notifications were denied. Check browser settings.");
            }
        }
    } catch (e) {
        alert("Error enabling notifications: " + e);
        console.error(e);
    } finally {
        setRequesting(false);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('notificationBannerDismissed', 'true');
  };

  if (!supported || !show) return null;
  
  if (typeof window !== 'undefined' && localStorage.getItem('notificationBannerDismissed')) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md bg-card border border-primary/30 rounded-xl p-4 shadow-2xl z-50 animate-in slide-in-from-bottom duration-300">
      <button 
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold mb-1">Enable Notifications</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Get instant alerts when someone sends you a Marco or a help request
          </p>
          <button
            onClick={handleRequest}
            disabled={requesting}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50"
          >
            {requesting ? "Requesting..." : "Enable Notifications"}
          </button>
        </div>
      </div>
    </div>
  );
}
