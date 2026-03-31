import SwiftUI
import WatchKit

struct ContentView: View {
    @ObservedObject var fb = FirebaseManager.shared
    @ObservedObject var session = WatchSessionManager.shared
    
    var body: some View {
        if !fb.isAuthenticated {
            // Login screen
            VStack(spacing: 12) {
                Image(systemName: "iphone.and.arrow.forward")
                    .font(.system(size: 36))
                    .foregroundColor(.gray)
                Text("Open Marco Polo\non your iPhone")
                    .font(.footnote)
                    .foregroundColor(.gray)
                    .multilineTextAlignment(.center)
                
                Text(session.debugStatus)
                    .font(.system(size: 9))
                    .foregroundColor(.yellow)
                    .multilineTextAlignment(.center)
                    .padding(.top, 4)
                
                if session.isPhoneReachable {
                    Button("Sync Now") {
                        session.startRequestingAuth()
                    }
                    .font(.caption2)
                    .foregroundColor(.blue)
                }
            }
        } else if fb.friends.isEmpty {
            // Loading screen
            VStack(spacing: 8) {
                ProgressView()
                Text("Loading Friends...")
                    .font(.footnote)
                    .foregroundColor(.gray)
                Text(fb.fetchStatus)
                    .font(.system(size: 9))
                    .foregroundColor(.yellow)
                    .multilineTextAlignment(.center)
                    .padding(.top, 4)
            }
        } else {
            // Main UI: Full-screen paging through friends + Help
            TabView {
                ForEach(fb.friends) { friend in
                    FriendPage(friend: friend)
                }
                HelpPage()
            }
            .tabViewStyle(.verticalPage)
        }
    }
}

// MARK: - Full-Screen Friend Page

struct FriendPage: View {
    let friend: WatchFriend
    @State private var isSending = false
    @State private var showSentConfirmation = false
    
    var isIdle: Bool { friend.status == "IDLE" }
    var sentMarco: Bool { friend.status == "MARCO_SENT" }
    var receivedMarco: Bool { friend.status == "MARCO_RECEIVED" }
    var receivedPolo: Bool { friend.status == "POLO_RECEIVED" }
    var isSOS: Bool { friend.status == "SOS_SENT" || friend.status == "SOS_RECEIVED" }
    var sosReceived: Bool { friend.status == "SOS_RECEIVED" }
    
    var canTap: Bool { isIdle || receivedMarco }
    
    var body: some View {
        ZStack {
            // Background glow for received states
            backgroundGlow
            
            VStack(spacing: 16) {
                Spacer()
                
                // Icon (heart, circle, or hand based on friend theme)
                iconView
                    .frame(width: 140, height: 140)
                
                // Name
                Text(friend.name)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundColor(nameColor)
                    .lineLimit(1)
                
                // Status text
                Text(statusText)
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(statusColor)
                    .textCase(.uppercase)
                    .tracking(1)
                
                Spacer()
            }
            .padding()
            
            // Sent confirmation overlay
            if showSentConfirmation {
                VStack {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 50))
                        .foregroundColor(.green)
                    Text("Sent!")
                        .font(.headline)
                        .foregroundColor(.green)
                }
                .transition(.scale.combined(with: .opacity))
            }
        }
        .containerBackground(for: .tabView) { Color.black }
        .onTapGesture {
            guard canTap, !isSending else { return }
            handleTap()
        }
    }
    
    // MARK: - Icon View
    
    @ViewBuilder
    var iconView: some View {
        let color = Color(hex: friend.heartColor)
        let shape = friend.iconShape
        
        Group {
            if receivedPolo {
                // Checkmark for connected state
                Image(systemName: "checkmark")
                    .font(.system(size: 44, weight: .bold))
                    .foregroundColor(color)
            } else if sosReceived {
                // Pulsing help alert
                Image(systemName: "hand.raised.fill")
                    .font(.system(size: 44))
                    .foregroundColor(.red)
                    .modifier(PulseModifier(isActive: true))
            } else if friend.status == "SOS_SENT" {
                Image(systemName: "hand.raised")
                    .font(.system(size: 44))
                    .foregroundColor(.red.opacity(0.6))
            } else {
                // Normal icon based on shape preference
                shapeIcon(shape: shape, color: color, filled: receivedMarco || sentMarco)
            }
        }
    }
    
    func getIconName(shape: String, filled: Bool) -> String {
        switch shape {
        case "circle":
            return filled ? "circle.fill" : "circle"
        case "hand":
            return "hand.wave"  // Always outline for hand
        default: // "heart"
            return filled ? "heart.fill" : "heart"
        }
    }
    
    @ViewBuilder
    func shapeIcon(shape: String, color: Color, filled: Bool) -> some View {
        Image(systemName: getIconName(shape: shape, filled: filled))
            .font(.system(size: 100))
            .foregroundColor(color.opacity(filled ? 1.0 : 0.5))
            .modifier(PulseModifier(isActive: receivedMarco))
    }
    
    // MARK: - Background
    
    @ViewBuilder
    var backgroundGlow: some View {
        if receivedMarco {
            RoundedRectangle(cornerRadius: 0)
                .fill(Color(hex: friend.heartColor).opacity(0.15))
                .ignoresSafeArea()
        } else if sosReceived {
            RoundedRectangle(cornerRadius: 0)
                .fill(Color.red.opacity(0.15))
                .ignoresSafeArea()
        } else {
            Color.clear
        }
    }
    
    // MARK: - Text Properties
    
    var nameColor: Color {
        if receivedMarco { return .white }
        return .primary
    }
    
    var statusText: String {
        if receivedMarco { return "Tap: Polo!" }
        if sentMarco { return "Marco Sent ✓" }
        if receivedPolo { return "Connected 💙" }
        if sosReceived { return "Help Needed" }
        if friend.status == "SOS_SENT" { return "Help Sent" }
        return "Tap: Marco?"
    }
    
    var statusColor: Color {
        if receivedMarco { return .white.opacity(0.9) }
        if receivedPolo { return Color(hex: friend.heartColor) }
        if isSOS { return .red }
        return .gray
    }
    
    // MARK: - Actions
    
    func handleTap() {
        WKInterfaceDevice.current().play(receivedMarco ? .success : .click)
        isSending = true
        
        if receivedMarco {
            FirebaseManager.shared.sendPolo(friendId: friend.id)
        } else if isIdle {
            FirebaseManager.shared.sendMarco(friendId: friend.id)
        }
        
        withAnimation(.spring()) {
            showSentConfirmation = true
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
            withAnimation {
                showSentConfirmation = false
                isSending = false
            }
        }
    }
}

// MARK: - Help Page (last page when swiping)

struct HelpPage: View {
    @State private var showConfirm = false
    @State private var helpSent = false
    
    var body: some View {
        VStack(spacing: 16) {
            Spacer()
            
            if helpSent {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 44))
                    .foregroundColor(.red)
                Text("Help Sent")
                    .font(.headline)
                    .foregroundColor(.red)
            } else if showConfirm {
                Text("Send help request to\nall connections?")
                    .font(.footnote)
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                
                HStack(spacing: 12) {
                    Button("Cancel") {
                        showConfirm = false
                    }
                    .font(.caption2)
                    .foregroundColor(.gray)
                    
                    Button("SEND") {
                        WKInterfaceDevice.current().play(.failure)
                        FirebaseManager.shared.sendHelpRequest()
                        helpSent = true
                        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
                            helpSent = false
                            showConfirm = false
                        }
                    }
                    .font(.caption2)
                    .foregroundColor(.white)
                    .background(Color.red)
                    .cornerRadius(8)
                }
            } else {
                // Large circular red button — matches flat app style
                Button(action: {
                    WKInterfaceDevice.current().play(.click)
                    showConfirm = true
                }) {
                    ZStack {
                        Circle()
                            .fill(Color.red)
                            .frame(width: 140, height: 140)
                        
                        Image(systemName: "hand.raised.circle.fill")
                            .font(.system(size: 50))
                            .foregroundColor(.white)
                    }
                }
                .buttonStyle(.plain)
                
                Text("NEED HELP")
                    .font(.caption)
                    .fontWeight(.bold)
                    .foregroundColor(.red)
                    .textCase(.uppercase)
                    .tracking(1)
            }
            
            Spacer()
        }
        .containerBackground(for: .tabView) { Color.black }
    }
}

// MARK: - Pulse Animation Modifier

struct PulseModifier: ViewModifier {
    let isActive: Bool
    @State private var scale: CGFloat = 1.0
    
    func body(content: Content) -> some View {
        content
            .scaleEffect(scale)
            .animation(
                isActive
                    ? .easeInOut(duration: 0.8).repeatForever(autoreverses: true)
                    : .default,
                value: scale
            )
            .onAppear {
                if isActive { scale = 1.15 }
            }
            .onChange(of: isActive) { _, active in
                scale = active ? 1.15 : 1.0
            }
    }
}

// MARK: - Color Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: UInt64
        switch hex.count {
        case 3:
            (r, g, b) = ((int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (r, g, b) = (int >> 16, int >> 8 & 0xFF, int & 0xFF)
        default:
            (r, g, b) = (225, 29, 72)
        }
        self.init(.sRGB, red: Double(r) / 255, green: Double(g) / 255, blue: Double(b) / 255)
    }
}

#Preview {
    ContentView()
}
