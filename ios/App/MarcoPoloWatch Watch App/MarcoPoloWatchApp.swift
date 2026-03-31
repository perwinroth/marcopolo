import SwiftUI
import UserNotifications
import WatchKit

class ExtensionDelegate: NSObject, WKExtensionDelegate, UNUserNotificationCenterDelegate {
    func applicationDidFinishLaunching() {
        // Request Notification Permissions
        let center = UNUserNotificationCenter.current()
        center.delegate = self
        center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if granted {
                print("✅ MarcoPoloWatchApp: Notification permissions granted")
                DispatchQueue.main.async {
                    WKExtension.shared().registerForRemoteNotifications()
                }
            } else if let error = error {
                print("⚠️ MarcoPoloWatchApp: Notification permissions error: \(error.localizedDescription)")
            } else {
                print("⚠️ MarcoPoloWatchApp: Notification permissions denied")
            }
        }
    }
    
    // Called when the APNs token is successfully received
    func didRegisterForRemoteNotifications(withDeviceToken deviceToken: Data) {
        let tokenParts = deviceToken.map { data in String(format: "%02.2hhx", data) }
        let token = tokenParts.joined()
        print("✅ MarcoPoloWatchApp: APNs Device Token: \(token)")
        
        // Save the raw APNs token so FirebaseManager can send it to the backend
        UserDefaults.standard.set(token, forKey: "apnsToken")
        
        // If we are already authenticated, trigger FirebaseManager to register this token now
        if FirebaseManager.shared.isAuthenticated {
            FirebaseManager.shared.registerWatchTokenWithBackend()
        }
    }
    
    func didFailToRegisterForRemoteNotificationsWithError(_ error: Error) {
        print("⚠️ MarcoPoloWatchApp: Failed to register for remote notifications: \(error.localizedDescription)")
    }
    
    // Handle foreground notifications
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        // Show banner and play sound even when app is in foreground
        completionHandler([.banner, .sound])
    }
}

@main
struct MarcoPoloWatchApp: App {
    @WKExtensionDelegateAdaptor(ExtensionDelegate.self) var extensionDelegate
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}
