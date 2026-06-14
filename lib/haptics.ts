import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { nativePlaySignalHaptics } from "./native/signalFeedback";

export type IncomingSignalKind = "marco" | "polo" | "help";
export type CompletionSignalKind = "marco" | "polo";

async function impact(style: ImpactStyle) {
    if (!Capacitor.isNativePlatform()) return;
    await Haptics.impact({ style });
}

export async function playIncomingSignalHaptic(kind: IncomingSignalKind) {
    if (kind === "marco" && await nativePlaySignalHaptics("hand", "marco-received")) return;
    if (kind === "polo" && await nativePlaySignalHaptics("hand", "polo-sent")) return;
    if (kind === "help" && await nativePlaySignalHaptics("fist", "marco-received")) return;

    if (kind === "help") {
        await impact(ImpactStyle.Heavy);
        setTimeout(() => void impact(ImpactStyle.Heavy), 200);
        setTimeout(() => void impact(ImpactStyle.Heavy), 400);
        return;
    }

    await impact(kind === "marco" ? ImpactStyle.Medium : ImpactStyle.Light);
}

export async function playAnimationCompletionHaptic(kind: CompletionSignalKind) {
    if (kind === "marco" && await nativePlaySignalHaptics("hand", "marco-sent")) return;
    if (kind === "polo" && await nativePlaySignalHaptics("hand", "polo-sent")) return;
    await impact(kind === "marco" ? ImpactStyle.Light : ImpactStyle.Medium);
}
