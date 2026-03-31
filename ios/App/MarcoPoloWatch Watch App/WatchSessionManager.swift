import Foundation
import WatchConnectivity
import Combine

/// Manages WatchConnectivity communication with the iPhone app.
/// Uses both PUSH (iPhone sends on login) and PULL (watch requests) for reliability.
class WatchSessionManager: NSObject, ObservableObject, WCSessionDelegate {
    static let shared = WatchSessionManager()

    @Published var isPhoneReachable = false
    @Published var debugStatus = "Starting..."
    
    private var authRequestTimer: Timer?

    override private init() {
        super.init()
        if WCSession.isSupported() {
            let session = WCSession.default
            session.delegate = self
            session.activate()
            debugStatus = "WCSession activating..."
            print("⌚ WatchSessionManager: WCSession activating")
        } else {
            debugStatus = "WCSession not supported!"
        }
    }

    // MARK: - WCSession Delegate

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        DispatchQueue.main.async {
            self.isPhoneReachable = session.isReachable
            
            if let error = error {
                self.debugStatus = "Activation error: \(error.localizedDescription)"
                print("⌚ WatchSessionManager: activation error: \(error)")
                return
            }
            
            self.debugStatus = "Activated (reachable: \(session.isReachable))"
            print("⌚ WatchSessionManager: activated (reachable: \(session.isReachable))")
            
            // Check for pending application context
            let context = session.receivedApplicationContext
            if !context.isEmpty {
                print("⌚ WatchSessionManager: Found pending context: \(context.keys)")
                self.processAuthPayload(context)
            }
            
            // If not authenticated yet, start requesting credentials from iPhone
            if !FirebaseManager.shared.isAuthenticated {
                self.startRequestingAuth()
            }
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            self.isPhoneReachable = session.isReachable
            print("⌚ WatchSessionManager: reachability → \(session.isReachable)")
            
            // When phone becomes reachable and we're not authenticated, request auth immediately
            if session.isReachable && !FirebaseManager.shared.isAuthenticated {
                self.requestAuthFromPhone()
            }
        }
    }

    // MARK: - PULL-BASED: Watch requests credentials from iPhone
    
    func startRequestingAuth() {
        authRequestTimer?.invalidate()
        
        // Request immediately
        requestAuthFromPhone()
        
        // Then retry every 5 seconds until authenticated
        authRequestTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            guard let self = self else { return }
            if FirebaseManager.shared.isAuthenticated {
                self.authRequestTimer?.invalidate()
                self.authRequestTimer = nil
                print("⌚ WatchSessionManager: Authenticated! Stopped requesting.")
                return
            }
            self.requestAuthFromPhone()
        }
    }
    
    private func requestAuthFromPhone() {
        let session = WCSession.default
        guard session.activationState == .activated else {
            debugStatus = "Not activated yet"
            return
        }
        
        guard session.isReachable else {
            debugStatus = "iPhone not reachable"
            print("⌚ WatchSessionManager: Phone not reachable, can't request auth")
            return
        }
        
        debugStatus = "Requesting auth..."
        print("⌚ WatchSessionManager: Sending NEED_AUTH to iPhone...")
        
        session.sendMessage(
            ["action": "NEED_AUTH"],
            replyHandler: { [weak self] reply in
                print("⌚ WatchSessionManager: Got reply: \(reply)")
                DispatchQueue.main.async {
                    if reply["uid"] as? String != nil, reply["token"] as? String != nil {
                        self?.debugStatus = "Auth received!"
                        self?.processAuthPayload(reply)
                    } else if let error = reply["error"] as? String {
                        self?.debugStatus = "iPhone: \(error)"
                    } else {
                        self?.debugStatus = "Empty reply"
                    }
                }
            },
            errorHandler: { [weak self] error in
                print("⌚ WatchSessionManager: NEED_AUTH error: \(error.localizedDescription)")
                DispatchQueue.main.async {
                    self?.debugStatus = "Error: \(error.localizedDescription)"
                }
            }
        )
    }

    // MARK: - PUSH-BASED: Receive credentials pushed from iPhone
    
    func session(_ session: WCSession, didReceiveMessage message: [String: Any]) {
        print("📥 WatchSessionManager: didReceiveMessage: \(message.keys)")
        DispatchQueue.main.async {
            self.processAuthPayload(message)
        }
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        print("📥 WatchSessionManager: didReceiveApplicationContext: \(applicationContext.keys)")
        DispatchQueue.main.async {
            self.processAuthPayload(applicationContext)
        }
    }
    
    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any] = [:]) {
        print("📥 WatchSessionManager: didReceiveUserInfo: \(userInfo.keys)")
        DispatchQueue.main.async {
            self.processAuthPayload(userInfo)
        }
    }
    
    // MARK: - Process Auth
    
    private func processAuthPayload(_ payload: [String: Any]) {
        if let uid = payload["uid"] as? String, let token = payload["token"] as? String {
            print("✅ WatchSessionManager: Auth received! uid=\(uid.prefix(8))...")
            debugStatus = "Authenticated ✓"
            let refreshToken = payload["refreshToken"] as? String
            if let apiKey = payload["apiKey"] as? String {
                UserDefaults.standard.set(apiKey, forKey: "firebaseApiKey")
            }
            FirebaseManager.shared.saveAuth(uid: uid, token: token, refreshToken: refreshToken)
            
            // Stop requesting
            authRequestTimer?.invalidate()
            authRequestTimer = nil
        }
    }
}

// MARK: - Data Model

struct WatchFriend: Identifiable {
    let id: String
    var name: String
    var status: String
    var heartColor: String
    var iconShape: String  // "heart", "circle", or "hand"
}
