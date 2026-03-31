import Foundation
import Capacitor
import WatchConnectivity

@objc(WatchPlugin)
public class WatchPlugin: CAPPlugin {
    
    // NOTE: WCSession delegate is handled by AppDelegate (activates at app launch).
    // This plugin only provides the JS bridge for Capacitor calls.
    
    @objc func updateApplicationContext(_ call: CAPPluginCall) {
        guard let uid = call.getString("uid"),
              let token = call.getString("token") else {
            call.reject("Must provide uid and token")
            return
        }
        
        let session = WCSession.default
        var payload: [String: Any] = ["uid": uid, "token": token]
        if let refreshToken = call.getString("refreshToken") {
            payload["refreshToken"] = refreshToken
        }
        if let apiKey = call.getString("apiKey") {
            payload["apiKey"] = apiKey
        }
        
        // Push via all methods (WCSession is already activated by AppDelegate)
        if session.activationState == .activated {
            if session.isReachable {
                session.sendMessage(payload, replyHandler: nil, errorHandler: nil)
            }
            session.transferUserInfo(payload)
            try? session.updateApplicationContext(payload)
            print("✅ WatchPlugin: JS-triggered auth push sent")
            call.resolve(["success": true])
        } else {
            print("⚠️ WatchPlugin: WCSession not activated yet")
            call.reject("WCSession not activated")
        }
    }
}
