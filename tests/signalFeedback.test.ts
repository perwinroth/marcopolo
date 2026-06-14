import { beforeEach, describe, expect, it, vi } from "vitest";

const startHoldMock = vi.fn();
const tickHoldMock = vi.fn();
const endHoldMock = vi.fn();
const playSignalMock = vi.fn();
const testTapMock = vi.fn();
const registerPluginMock = vi.fn(() => ({
    startHold: startHoldMock,
    tickHold: tickHoldMock,
    endHold: endHoldMock,
    playSignal: playSignalMock,
    testTap: testTapMock,
}));

vi.mock("@capacitor/core", () => ({
    Capacitor: {
        getPlatform: vi.fn(() => "ios"),
        isNativePlatform: vi.fn(() => true),
    },
    registerPlugin: registerPluginMock,
}));

describe("native signal feedback bridge", () => {
    beforeEach(() => {
        vi.resetModules();
        startHoldMock.mockReset();
        tickHoldMock.mockReset();
        endHoldMock.mockReset();
        playSignalMock.mockReset();
        testTapMock.mockReset();
        registerPluginMock.mockClear();
    });

    it("registers the native plugin and routes signal playback through it", async () => {
        const { nativePlaySignalHaptics } = await import("@/lib/native/signalFeedback");

        playSignalMock.mockResolvedValue({ success: true });

        const result = await nativePlaySignalHaptics("hand", "marco-sent");

        expect(registerPluginMock).toHaveBeenCalledWith("SignalFeedbackPlugin");
        expect(playSignalMock).toHaveBeenCalledWith({ signal: "hand", state: "marco-sent" });
        expect(result).toBe(true);
    });

    it("routes hold lifecycle through the native plugin", async () => {
        const {
            nativeStartHoldHaptics,
            nativeTickHoldHaptics,
            nativeEndHoldHaptics,
        } = await import("@/lib/native/signalFeedback");

        startHoldMock.mockResolvedValue({ success: true });
        tickHoldMock.mockResolvedValue({ success: true });
        endHoldMock.mockResolvedValue({ success: true });

        await nativeStartHoldHaptics();
        await nativeTickHoldHaptics(0.67);
        await nativeEndHoldHaptics();

        expect(startHoldMock).toHaveBeenCalledTimes(1);
        expect(tickHoldMock).toHaveBeenCalledWith({ progress: 0.67 });
        expect(endHoldMock).toHaveBeenCalledTimes(1);
    });
});
