import * as CapacitorCore from "@capacitor/core";
import type { SignalType } from "@/lib/signals";
import type { SignalPlaybackState } from "@/lib/signalAudio";

type SignalFeedbackPlugin = {
    startHold(): Promise<{ success: boolean }>;
    tickHold(options: { progress: number }): Promise<{ success: boolean }>;
    endHold(): Promise<{ success: boolean }>;
    playSignal(options: { signal: SignalType; state: SignalPlaybackState }): Promise<{ success: boolean }>;
    testTap(): Promise<{ success: boolean }>;
};

let registerPluginFn: typeof CapacitorCore.registerPlugin | undefined;
try {
    registerPluginFn = (CapacitorCore as typeof CapacitorCore & {
        registerPlugin?: typeof CapacitorCore.registerPlugin;
    }).registerPlugin;
} catch {
    registerPluginFn = undefined;
}

const NativeSignalFeedback = typeof registerPluginFn === "function"
    ? registerPluginFn<SignalFeedbackPlugin>("SignalFeedbackPlugin")
    : null;

function isIOSNative() {
    const capacitor = CapacitorCore.Capacitor as typeof CapacitorCore.Capacitor & {
        getPlatform?: () => string;
        isNativePlatform?: () => boolean;
    };

    if (typeof capacitor.getPlatform === "function") {
        return capacitor.getPlatform() === "ios";
    }

    if (typeof capacitor.isNativePlatform === "function") {
        return capacitor.isNativePlatform();
    }

    return false;
}

export async function nativeStartHoldHaptics() {
    if (!isIOSNative() || !NativeSignalFeedback?.startHold) return false;
    try {
        await NativeSignalFeedback?.startHold?.();
        return true;
    } catch {
        return false;
    }
}

export async function nativeTickHoldHaptics(progress: number) {
    if (!isIOSNative() || !NativeSignalFeedback?.tickHold) return false;
    try {
        await NativeSignalFeedback?.tickHold?.({ progress });
        return true;
    } catch {
        return false;
    }
}

export async function nativeEndHoldHaptics() {
    if (!isIOSNative() || !NativeSignalFeedback?.endHold) return false;
    try {
        await NativeSignalFeedback?.endHold?.();
        return true;
    } catch {
        return false;
    }
}

export async function nativePlaySignalHaptics(signal: SignalType, state: SignalPlaybackState) {
    if (!isIOSNative() || !NativeSignalFeedback?.playSignal) return false;
    try {
        await NativeSignalFeedback?.playSignal?.({ signal, state });
        return true;
    } catch {
        return false;
    }
}

export async function nativeTestSignalTap() {
    if (!isIOSNative() || !NativeSignalFeedback?.testTap) return false;
    try {
        await NativeSignalFeedback?.testTap?.();
        return true;
    } catch {
        return false;
    }
}
