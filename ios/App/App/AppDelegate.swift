import UIKit
import Capacitor
import FirebaseCore
import WatchConnectivity
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, WCSessionDelegate, UNUserNotificationCenterDelegate {

    var window: UIWindow?
    
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        FirebaseApp.configure()
        UNUserNotificationCenter.current().delegate = self
        
        // Activate WCSession IMMEDIATELY at launch so the watch never misses a message
        if WCSession.isSupported() {
            let session = WCSession.default
            session.delegate = self
            session.activate()
            print("✅ AppDelegate: WCSession activated at launch (sole delegate)")
        }
        
        // Proactively push auth to watch at app launch
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            self.pushAuthToWatch()
        }
        
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        print("✅ AppDelegate: APNs Device Token: \(token)")

        let defaults = UserDefaults.standard
        defaults.set(token, forKey: "mp_apns_token")

        NotificationCenter.default.post(
            name: Notification.Name("MarcoPoloDidRegisterAPNsToken"),
            object: nil,
            userInfo: ["token": token]
        )
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("⚠️ AppDelegate: Failed to register for remote notifications: \(error.localizedDescription)")
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound, .badge, .list])
    }
    
    // MARK: - WCSession Delegate
    
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if let error = error {
            print("⚠️ AppDelegate: WCSession error: \(error.localizedDescription)")
        } else {
            print("✅ AppDelegate: WCSession activated (paired: \(session.isPaired), installed: \(session.isWatchAppInstalled))")
            pushAuthToWatch()
        }
    }
    
    func sessionDidBecomeInactive(_ session: WCSession) {}
    func sessionDidDeactivate(_ session: WCSession) {
        WCSession.default.activate()
    }
    
    // MARK: - Receive messages FROM Watch (no reply handler)
    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        print("📥 AppDelegate: Watch message: \(message)")
        if let action = message["action"] as? String, action == "NEED_AUTH" {
            pushAuthToWatch()
        }
    }
    
    // MARK: - Receive messages FROM Watch (WITH reply handler — watch expects immediate response)
    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        print("📥 AppDelegate: Watch message (reply): \(message)")
        
        if let action = message["action"] as? String, action == "NEED_AUTH" {
            let defaults = UserDefaults.standard
            // Capacitor Preferences stores with "CapacitorStorage." prefix
            if let uid = defaults.string(forKey: "CapacitorStorage.mp_native_uid"),
               let token = defaults.string(forKey: "CapacitorStorage.mp_native_idToken") {
                print("✅ AppDelegate: Replying with auth credentials to watch!")
                var reply: [String: Any] = ["uid": uid, "token": token]
                if let rt = defaults.string(forKey: "CapacitorStorage.mp_native_refreshToken") {
                    reply["refreshToken"] = rt
                }
                // Include apiKey so the watch can refresh its own token even if the
                // queued transferUserInfo/applicationContext channels haven't landed yet.
                if let plistPath = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
                   let plist = NSDictionary(contentsOfFile: plistPath),
                   let apiKey = plist["API_KEY"] as? String {
                    reply["apiKey"] = apiKey
                }
                replyHandler(reply)
                let refreshToken = defaults.string(forKey: "CapacitorStorage.mp_native_refreshToken")
                sendAuthToWatch(uid: uid, token: token, refreshToken: refreshToken)
            } else {
                print("⚠️ AppDelegate: No stored tokens yet")
                replyHandler(["error": "not_logged_in"])
            }
            return
        }
        
        replyHandler([:])
    }
    
    // MARK: - Push Auth to Watch (reads from Capacitor Preferences natively)
    
    private func pushAuthToWatch() {
        let defaults = UserDefaults.standard
        guard let uid = defaults.string(forKey: "CapacitorStorage.mp_native_uid"),
              let token = defaults.string(forKey: "CapacitorStorage.mp_native_idToken") else {
            print("ℹ️ AppDelegate: No stored tokens yet (user not logged in)")
            return
        }
        let refreshToken = defaults.string(forKey: "CapacitorStorage.mp_native_refreshToken")
        sendAuthToWatch(uid: uid, token: token, refreshToken: refreshToken)
    }
    
    private func sendAuthToWatch(uid: String, token: String, refreshToken: String? = nil) {
        let session = WCSession.default
        guard session.activationState == .activated else { return }
        
        var payload: [String: Any] = ["uid": uid, "token": token]
        if let rt = refreshToken { payload["refreshToken"] = rt }
        // Send API key so watch can refresh tokens independently
        if let plistPath = Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist"),
           let plist = NSDictionary(contentsOfFile: plistPath),
           let apiKey = plist["API_KEY"] as? String {
            payload["apiKey"] = apiKey
        }
        
        // Method 1: sendMessage (real-time)
        if session.isReachable {
            session.sendMessage(payload, replyHandler: nil) { error in
                print("⚠️ AppDelegate: sendMessage error: \(error.localizedDescription)")
            }
            print("📡 AppDelegate: Sent auth via sendMessage")
        }
        
        // Method 2: transferUserInfo (queued, guaranteed)
        session.transferUserInfo(payload)
        print("📦 AppDelegate: Queued auth via transferUserInfo")
        
        // Method 3: updateApplicationContext (persistent)
        try? session.updateApplicationContext(payload)
    }
    
    // MARK: - Standard Capacitor Delegate Methods

    func applicationWillResignActive(_ application: UIApplication) {}
    func applicationDidEnterBackground(_ application: UIApplication) {}
    func applicationWillEnterForeground(_ application: UIApplication) {
        // Re-push auth when app returns to foreground
        pushAuthToWatch()
    }
    func applicationDidBecomeActive(_ application: UIApplication) {}
    func applicationWillTerminate(_ application: UIApplication) {}

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }
}
