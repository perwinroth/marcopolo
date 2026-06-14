import Foundation
import Capacitor
import UIKit
import AudioToolbox
import CoreHaptics

@objc(SignalFeedbackPlugin)
public class SignalFeedbackPlugin: CAPPlugin {
    private var holdGenerator: UISelectionFeedbackGenerator?
    private var impactLight: UIImpactFeedbackGenerator?
    private var impactMedium: UIImpactFeedbackGenerator?
    private var impactHeavy: UIImpactFeedbackGenerator?
    private var notificationGenerator: UINotificationFeedbackGenerator?
    private var hapticEngine: CHHapticEngine?

    public override func load() {
        super.load()
        DispatchQueue.main.async {
            self.impactLight = UIImpactFeedbackGenerator(style: .light)
            self.impactMedium = UIImpactFeedbackGenerator(style: .medium)
            self.impactHeavy = UIImpactFeedbackGenerator(style: .heavy)
            self.notificationGenerator = UINotificationFeedbackGenerator()
            self.prepareGenerators()
        }
    }

    @objc func startHold(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            let generator = UISelectionFeedbackGenerator()
            generator.prepare()
            generator.selectionChanged()
            self.holdGenerator = generator
            self.impactLight?.impactOccurred(intensity: 0.75)
            self.prepareGenerators()
            call.resolve(["success": true])
        }
    }

    @objc func tickHold(_ call: CAPPluginCall) {
        let progress = max(0, min(call.getDouble("progress") ?? 0, 1))
        DispatchQueue.main.async {
            self.holdGenerator?.selectionChanged()
            if progress > 0.66 {
                self.impactLight?.impactOccurred(intensity: 0.9)
            } else if progress > 0.33 {
                self.impactLight?.impactOccurred(intensity: 0.55)
            }
            self.prepareGenerators()
            call.resolve(["success": true])
        }
    }

    @objc func endHold(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.holdGenerator = nil
            call.resolve(["success": true])
        }
    }

    @objc func playSignal(_ call: CAPPluginCall) {
        let signal = call.getString("signal") ?? "hand"
        let state = call.getString("state") ?? "marco-sent"

        DispatchQueue.main.async {
            self.playNativeSignal(signal: signal, state: state)
            call.resolve(["success": true])
        }
    }

    @objc func testTap(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.notificationGenerator?.notificationOccurred(.success)
            self.impactHeavy?.impactOccurred(intensity: 1.0)
            AudioServicesPlayAlertSound(kSystemSoundID_Vibrate)
            self.prepareGenerators()
            call.resolve(["success": true])
        }
    }

    private func prepareGenerators() {
        impactLight?.prepare()
        impactMedium?.prepare()
        impactHeavy?.prepare()
        notificationGenerator?.prepare()
        holdGenerator?.prepare()
    }

    private func playNativeSignal(signal: String, state: String) {
        switch signal {
        case "heart":
            playHeart(state: state)
        case "fist":
            playFist(state: state)
        case "hand":
            playHand(state: state)
        case "wind":
            playWind(state: state)
        case "sphere":
            playSphere(state: state)
        case "eye":
            playEye(state: state)
        default:
            playHand(state: state)
        }
        prepareGenerators()
    }

    private func playHeart(state: String) {
        let incoming = state == "marco-received"
        notificationGenerator?.notificationOccurred(incoming ? .warning : .success)
        impactMedium?.impactOccurred(intensity: incoming ? 0.85 : 0.7)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) {
            self.impactHeavy?.impactOccurred(intensity: incoming ? 1.0 : 0.82)
        }
    }

    private func playFist(state: String) {
        notificationGenerator?.notificationOccurred(state == "marco-received" ? .warning : .success)
        impactHeavy?.impactOccurred(intensity: 1.0)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.08) {
            self.impactMedium?.impactOccurred(intensity: 0.75)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.16) {
            self.impactLight?.impactOccurred(intensity: 0.5)
        }
    }

    private func playHand(state: String) {
        notificationGenerator?.notificationOccurred(state == "marco-received" ? .warning : .success)
        [0.0, 0.05, 0.1, 0.15].forEach { delay in
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
                self.impactLight?.impactOccurred(intensity: 0.55)
            }
        }
    }

    private func playWind(state: String) {
        notificationGenerator?.notificationOccurred(state == "marco-received" ? .warning : .success)
        playTransientPattern(intensities: [0.25, 0.35], sharpness: 0.15, spacing: 0.08)
    }

    private func playSphere(state: String) {
        notificationGenerator?.notificationOccurred(state == "marco-received" ? .warning : .success)
        impactMedium?.impactOccurred(intensity: 0.8)
    }

    private func playEye(state: String) {
        notificationGenerator?.notificationOccurred(state == "marco-received" ? .warning : .success)
        impactLight?.impactOccurred(intensity: 0.45)
    }

    private func playTransientPattern(intensities: [Float], sharpness: Float, spacing: TimeInterval) {
        guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else {
            impactLight?.impactOccurred(intensity: CGFloat(intensities.first ?? 0.3))
            return
        }

        do {
            if hapticEngine == nil {
                hapticEngine = try CHHapticEngine()
                try hapticEngine?.start()
            }

            var events: [CHHapticEvent] = []
            for (index, intensity) in intensities.enumerated() {
                let params = [
                    CHHapticEventParameter(parameterID: .hapticIntensity, value: intensity),
                    CHHapticEventParameter(parameterID: .hapticSharpness, value: sharpness),
                ]
                let event = CHHapticEvent(
                    eventType: .hapticTransient,
                    parameters: params,
                    relativeTime: spacing * Double(index)
                )
                events.append(event)
            }

            let pattern = try CHHapticPattern(events: events, parameters: [])
            let player = try hapticEngine?.makePlayer(with: pattern)
            try player?.start(atTime: 0)
        } catch {
            impactLight?.impactOccurred(intensity: 0.5)
        }
    }
}
