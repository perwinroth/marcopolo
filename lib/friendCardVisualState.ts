import type { SignalType } from "@/lib/signals";
import type { SignalPlaybackState } from "@/lib/signalAudio";

function cardAnimationClass(signalType: SignalType, state: SignalPlaybackState | "idle" | "sos") {
    if (state === "idle") {
        return signalType === "sphere" ? "animate-breathe" : "";
    }
    if (state === "sos") {
        return "animate-breathe";
    }
    if (signalType === "heart") {
        return state === "marco-received" ? "animate-signal-heart-receive" : "animate-signal-heart-send";
    }
    if (signalType === "wind") {
        return "animate-signal-wind";
    }
    if (signalType === "fist") {
        return "animate-signal-fist";
    }
    if (signalType === "hand") {
        return "animate-signal-hand";
    }
    if (signalType === "sphere") {
        return "animate-signal-sphere";
    }
    if (signalType === "eye") {
        return "animate-signal-eye";
    }
    return "animate-signal-hand";
}

export function getFriendCardVisualState({
    signalType,
    holdProgress,
    isHolding,
    isSending,
    signalState,
    signalColor,
}: {
    signalType: SignalType;
    holdProgress: number;
    isHolding: boolean;
    isSending: boolean;
    signalState: SignalPlaybackState | "idle" | "sos";
    signalColor: string;
}) {
    const holdScale = isHolding ? 1 + holdProgress * 0.0007 : 1;
    const showBackgroundGlow = isSending || signalState === "marco-received" || signalState === "polo-sent";
    const backgroundGlowClass = cardAnimationClass(signalType, signalState);
    const iconUsesHoldAnimation = isHolding && signalType !== "eye";
    const marcoSentClass = cardAnimationClass(signalType, "marco-sent");

    return {
        holdScale,
        showBackgroundGlow,
        backgroundGlowClass,
        backgroundGlowColor: `${signalColor}2e`,
        iconUsesHoldAnimation,
        holdAuraSize: `${4.4 + holdProgress * 0.05}rem`,
        holdRingSize: `${4.7 + holdProgress * 0.04}rem`,
        iconStateClass: cardAnimationClass(signalType, signalState),
        marcoSentClass,
    };
}
