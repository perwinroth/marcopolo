 import Foundation
import Combine
import WatchKit

class FirebaseManager: ObservableObject {
    static let shared = FirebaseManager()
    
    @Published var friends: [WatchFriend] = []
    @Published var isAuthenticated: Bool = false
    @Published var fetchStatus: String = ""
    
    // Auth stored in UserDefaults (watch-side)
    var uid: String? {
        UserDefaults.standard.string(forKey: "uid")
    }
    
    var token: String? {
        UserDefaults.standard.string(forKey: "idToken")
    }
    
    var refreshToken: String? {
        UserDefaults.standard.string(forKey: "refreshToken")
    }
    
    private var timer: Timer?
    
    private let databaseURL = "https://marcopolo-3fa43-default-rtdb.europe-west1.firebasedatabase.app"

    private init() {
        if uid != nil && token != nil {
            isAuthenticated = true
            startPolling()
        }
    }
    
    func saveAuth(uid: String, token: String, refreshToken: String? = nil) {
        UserDefaults.standard.set(uid, forKey: "uid")
        UserDefaults.standard.set(token, forKey: "idToken")
        if let rt = refreshToken {
            UserDefaults.standard.set(rt, forKey: "refreshToken")
        }
        print("FirebaseManager: Auth saved for \(uid.prefix(8))...")
        DispatchQueue.main.async {
            self.isAuthenticated = true
            self.fetchStatus = "Auth saved, fetching..."
        }
        
        // As soon as auth is saved, try registering the APNs token
        registerWatchTokenWithBackend()
        
        startPolling()
    }
    
    // MARK: - APNs Token Registration
    
    func registerWatchTokenWithBackend() {
        guard let uid = self.uid,
              let idToken = self.token,
              let apnsToken = UserDefaults.standard.string(forKey: "apnsToken") else {
            print("ℹ️ FirebaseManager: Missing auth or APNs token, skipping registration")
            return
        }
        
        // Prevent re-registering the same token unnecessarily
        if UserDefaults.standard.string(forKey: "registeredApnsToken") == apnsToken {
            print("✅ FirebaseManager: APNs token already registered")
            return
        }
        
        let backendDomain = "https://europe-west1-marcopolo-3fa43.cloudfunctions.net"
        guard let url = URL(string: "\(backendDomain)/registerWatch") else { return }
        
        print("📡 FirebaseManager: Registering APNs token with backend...")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(idToken)", forHTTPHeaderField: "Authorization")
        
        let dict: [String: Any] = [
            "apnsToken": apnsToken,
            "uid": uid,
            "bundleId": "co.polomar.app.watchkitapp"
        ]
        
        request.httpBody = try? JSONSerialization.data(withJSONObject: dict)
        
        URLSession.shared.dataTask(with: request) { data, response, error in
            if let error = error {
                print("⚠️ FirebaseManager: Registration failed: \(error.localizedDescription)")
                return
            }
            
            if let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 {
                print("✅ FirebaseManager: Successfully registered watch APNs token with backend")
                UserDefaults.standard.set(apnsToken, forKey: "registeredApnsToken")
            } else {
                let statusCode = (response as? HTTPURLResponse)?.statusCode ?? 0
                print("⚠️ FirebaseManager: Registration returned status code \(statusCode)")
                if let data = data, let str = String(data: data, encoding: .utf8) {
                    print("⚠️ Response body: \(str)")
                }
            }
        }.resume()
    }
    
    func startPolling() {
        timer?.invalidate()
        fetchFriends()
        timer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: true) { [weak self] _ in
            self?.fetchFriends()
        }
    }
    
    func stopPolling() {
        timer?.invalidate()
        timer = nil
    }
    
    // MARK: - Token Refresh
    
    private func refreshIdToken(completion: @escaping (Bool) -> Void) {
        guard let rt = refreshToken,
              let apiKey = UserDefaults.standard.string(forKey: "firebaseApiKey") else {
            print("⚠️ FirebaseManager: No refreshToken or apiKey stored")
            completion(false)
            return
        }
        
        let urlString = "https://securetoken.googleapis.com/v1/token?key=\(apiKey)"
        guard let url = URL(string: urlString) else {
            completion(false)
            return
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/x-www-form-urlencoded", forHTTPHeaderField: "Content-Type")
        request.httpBody = "grant_type=refresh_token&refresh_token=\(rt)".data(using: .utf8)
        
        URLSession.shared.dataTask(with: request) { data, _, _ in
            guard let data = data,
                  let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let newToken = dict["id_token"] as? String,
                  let newRefresh = dict["refresh_token"] as? String else {
                print("⚠️ FirebaseManager: Token refresh failed")
                completion(false)
                return
            }
            
            UserDefaults.standard.set(newToken, forKey: "idToken")
            UserDefaults.standard.set(newRefresh, forKey: "refreshToken")
            print("✅ FirebaseManager: Token refreshed!")
            completion(true)
        }.resume()
    }
    
    // MARK: - Fetch Friends
    
    private func fetchFriends() {
        guard let uid = uid, let token = token else {
            DispatchQueue.main.async { self.fetchStatus = "No auth tokens" }
            return
        }
        
        // Path: connections/{uid} — NOT connections/{uid}/active
        let urlString = "\(databaseURL)/connections/\(uid).json?auth=\(token)"
        guard let url = URL(string: urlString) else { return }
        
        DispatchQueue.main.async { self.fetchStatus = "Fetching connections..." }
        
        URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            guard let self = self else { return }
            
            if let error = error {
                DispatchQueue.main.async { self.fetchStatus = "Network: \(error.localizedDescription)" }
                return
            }
            
            guard let data = data else {
                DispatchQueue.main.async { self.fetchStatus = "No data received" }
                return
            }
            
            // Check for HTTP errors
            if let httpResponse = response as? HTTPURLResponse {
                if httpResponse.statusCode == 401 || httpResponse.statusCode == 403 {
                    DispatchQueue.main.async { self.fetchStatus = "Token expired, refreshing..." }
                    self.refreshIdToken { success in
                        if success {
                            self.fetchFriends() // retry with new token
                        } else {
                            DispatchQueue.main.async { self.fetchStatus = "Auth expired" }
                        }
                    }
                    return
                }
                if httpResponse.statusCode != 200 {
                    let body = String(data: data, encoding: .utf8) ?? "?"
                    DispatchQueue.main.async { self.fetchStatus = "HTTP \(httpResponse.statusCode): \(body.prefix(50))" }
                    return
                }
            }
            
            // Parse response — could be null (no connections) or a dict of friendId -> connection data
            let responseStr = String(data: data, encoding: .utf8) ?? ""
            
            if responseStr == "null" || responseStr.isEmpty {
                DispatchQueue.main.async {
                    self.friends = []
                    self.fetchStatus = "No connections found"
                }
                return
            }
            
            do {
                if let connectionsDict = try JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    let friendIds = Array(connectionsDict.keys)
                    DispatchQueue.main.async { self.fetchStatus = "Found \(friendIds.count) connections" }
                    self.resolveFriendData(friendUids: friendIds, connections: connectionsDict)
                } else {
                    DispatchQueue.main.async { self.fetchStatus = "Unexpected response format" }
                }
            } catch {
                DispatchQueue.main.async { self.fetchStatus = "Parse error: \(error.localizedDescription)" }
            }
        }.resume()
    }
    
    private func resolveFriendData(friendUids: [String], connections: [String: Any]) {
        guard let token = token else { return }
        
        let group = DispatchGroup()
        var newFriends: [WatchFriend] = []
        let queue = DispatchQueue(label: "friendResolverQueue")
        
        for fid in friendUids {
            group.enter()
            
            // Connection data has status, phone, and theme
            let connData = connections[fid] as? [String: Any]
            let connStatus = connData?["status"] as? String ?? "IDLE"
            let connectionDisplayName = connData?["displayName"] as? String
            
            // Theme is stored on the connection, not the user profile
            let connTheme = connData?["theme"] as? [String: Any]
            let heartColor = connTheme?["heartColor"] as? String ?? "#e11d48"
            let iconShape = connTheme?["iconShape"] as? String ?? "heart"
            
            // Fetch user profile for display name only
            let urlString = "\(databaseURL)/users/\(fid).json?auth=\(token)"
            guard let url = URL(string: urlString) else {
                let phone = connectionDisplayName ?? connData?["phone"] as? String ?? "Friend"
                queue.sync {
                    newFriends.append(WatchFriend(id: fid, name: phone, status: connStatus, heartColor: heartColor, iconShape: iconShape))
                }
                group.leave()
                continue
            }
            
            URLSession.shared.dataTask(with: url) { data, _, _ in
                defer { group.leave() }
                
                var name = connectionDisplayName ?? connData?["phone"] as? String ?? "Friend"

                if connectionDisplayName == nil,
                   let data = data,
                   let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                    name = dict["displayName"] as? String ?? dict["phone"] as? String ?? name
                }
                
                queue.sync {
                    newFriends.append(WatchFriend(id: fid, name: name, status: connStatus, heartColor: heartColor, iconShape: iconShape))
                }
            }.resume()
        }
        
        group.notify(queue: .main) {
            self.friends = newFriends
            self.fetchStatus = "\(newFriends.count) friends loaded"
            print("✅ FirebaseManager: Loaded \(newFriends.count) friends")
        }
    }
    
    // MARK: - Sending Actions
    
    func sendMarco(friendId: String) {
        guard let uid = uid, let token = token else { return }
        
        let updates: [String: Any] = [
            "connections/\(uid)/\(friendId)/status": "MARCO_SENT",
            "connections/\(uid)/\(friendId)/lastActionTime": Int(Date().timeIntervalSince1970 * 1000),
            "connections/\(friendId)/\(uid)/status": "MARCO_RECEIVED",
            "connections/\(friendId)/\(uid)/lastActionTime": Int(Date().timeIntervalSince1970 * 1000)
        ]
        
        performPatch(updates: updates, token: token)
    }
    
    func sendPolo(friendId: String) {
        guard let uid = uid, let token = token else { return }
        
        let updates: [String: Any] = [
            "connections/\(uid)/\(friendId)/status": "IDLE",
            "connections/\(uid)/\(friendId)/lastActionTime": Int(Date().timeIntervalSince1970 * 1000),
            "connections/\(friendId)/\(uid)/status": "POLO_RECEIVED",
            "connections/\(friendId)/\(uid)/lastActionTime": Int(Date().timeIntervalSince1970 * 1000)
        ]
        
        performPatch(updates: updates, token: token)
    }
    
    func sendHelpRequest() {
        guard let uid = uid, let token = token else { return }
        let helpExpirySeconds: TimeInterval = 30
        
        // Fetch connections first
        let urlString = "\(databaseURL)/connections/\(uid).json?auth=\(token)"
        guard let url = URL(string: urlString) else { return }
        
        URLSession.shared.dataTask(with: url) { data, _, _ in
            guard let data = data,
                  let dict = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return }
            
            var updates: [String: Any] = [:]
            var previousStatuses: [(friendId: String, myStatus: String, theirStatus: String)] = []
            
            for (fid, rawValue) in dict {
                let myConnection = rawValue as? [String: Any]
                let myPreviousStatus = myConnection?["status"] as? String ?? "IDLE"
                let theirPreviousStatus = self.fetchConnectionStatus(ownerId: fid, friendId: uid, token: token) ?? "IDLE"

                updates["connections/\(uid)/\(fid)/status"] = "SOS_SENT"
                updates["connections/\(uid)/\(fid)/lastActionTime"] = Int(Date().timeIntervalSince1970 * 1000)
                updates["connections/\(fid)/\(uid)/status"] = "SOS_RECEIVED"
                updates["connections/\(fid)/\(uid)/lastActionTime"] = Int(Date().timeIntervalSince1970 * 1000)
                previousStatuses.append((friendId: fid, myStatus: myPreviousStatus, theirStatus: theirPreviousStatus))
            }
            
            self.performPatch(updates: updates, token: token)

            DispatchQueue.global().asyncAfter(deadline: .now() + helpExpirySeconds) {
                var restoreUpdates: [String: Any] = [:]

                for previous in previousStatuses {
                    let myCurrentStatus = self.fetchConnectionStatus(ownerId: uid, friendId: previous.friendId, token: token)
                    if myCurrentStatus == "SOS_SENT" {
                        restoreUpdates["connections/\(uid)/\(previous.friendId)/status"] = previous.myStatus
                    }

                    let theirCurrentStatus = self.fetchConnectionStatus(ownerId: previous.friendId, friendId: uid, token: token)
                    if theirCurrentStatus == "SOS_RECEIVED" {
                        restoreUpdates["connections/\(previous.friendId)/\(uid)/status"] = previous.theirStatus
                    }
                }

                if !restoreUpdates.isEmpty {
                    self.performPatch(updates: restoreUpdates, token: token)
                }
            }
        }.resume()
    }
    
    // MARK: - Helpers
    
    private func performPatch(updates: [String: Any], token: String) {
        guard let url = URL(string: "\(databaseURL)/.json?auth=\(token)") else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.httpBody = try? JSONSerialization.data(withJSONObject: updates)
        
        URLSession.shared.dataTask(with: request) { _, _, error in
            if let error = error {
                print("⚠️ FirebaseManager Patch Error: \(error)")
            } else {
                self.fetchFriends()
            }
        }.resume()
    }

    private func fetchConnectionStatus(ownerId: String, friendId: String, token: String) -> String? {
        guard let url = URL(string: "\(databaseURL)/connections/\(ownerId)/\(friendId)/status.json?auth=\(token)") else {
            return nil
        }

        let semaphore = DispatchSemaphore(value: 0)
        var status: String?

        URLSession.shared.dataTask(with: url) { data, _, _ in
            defer { semaphore.signal() }

            guard let data = data else { return }

            if let decodedStatus = try? JSONDecoder().decode(String.self, from: data) {
                status = decodedStatus
            }
        }.resume()

        _ = semaphore.wait(timeout: .now() + 5)
        return status
    }
}
