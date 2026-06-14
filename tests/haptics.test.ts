import { beforeEach, describe, expect, it, vi } from "vitest";

const impactMock = vi.fn();

vi.mock("@capacitor/core", () => ({
    Capacitor: {
        isNativePlatform: vi.fn(() => true),
    },
}));

vi.mock("@capacitor/haptics", () => ({
    Haptics: {
        impact: impactMock,
    },
    ImpactStyle: {
        Light: "LIGHT",
        Medium: "MEDIUM",
        Heavy: "HEAVY",
    },
}));

describe("haptics helpers", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        vi.useFakeTimers();
        impactMock.mockReset();
    });

    it("plays a triple heavy haptic for help signals", async () => {
        const { playIncomingSignalHaptic } = await import("@/lib/haptics");
        await playIncomingSignalHaptic("help");
        await vi.advanceTimersByTimeAsync(400);

        expect(impactMock).toHaveBeenCalledTimes(3);
        expect(impactMock).toHaveBeenNthCalledWith(1, { style: "HEAVY" });
        expect(impactMock).toHaveBeenNthCalledWith(2, { style: "HEAVY" });
        expect(impactMock).toHaveBeenNthCalledWith(3, { style: "HEAVY" });
    });

    it("maps animation completion haptics by signal type", async () => {
        const { playAnimationCompletionHaptic } = await import("@/lib/haptics");

        await playAnimationCompletionHaptic("marco");
        await playAnimationCompletionHaptic("polo");

        expect(impactMock).toHaveBeenNthCalledWith(1, { style: "LIGHT" });
        expect(impactMock).toHaveBeenNthCalledWith(2, { style: "MEDIUM" });
    });
});
