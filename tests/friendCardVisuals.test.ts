import { describe, expect, it } from "vitest";
import { getFriendCardVisualState } from "@/lib/friendCardVisualState";

describe("friend card visual state", () => {
    it("does not render a background glow during hold only", () => {
        const visualState = getFriendCardVisualState({
            signalType: "eye",
            holdProgress: 64,
            isHolding: true,
            isSending: false,
            signalState: "idle",
            signalColor: "#2dd4bf",
        });

        expect(visualState.showBackgroundGlow).toBe(false);
        expect(visualState.iconUsesHoldAnimation).toBe(false);
        expect(visualState.holdScale).toBeGreaterThan(1);
    });

    it("shows the background glow only for active receive/send states", () => {
        const sending = getFriendCardVisualState({
            signalType: "heart",
            holdProgress: 0,
            isHolding: false,
            isSending: true,
            signalState: "marco-sent",
            signalColor: "#f43f5e",
        });
        const received = getFriendCardVisualState({
            signalType: "wind",
            holdProgress: 0,
            isHolding: false,
            isSending: false,
            signalState: "marco-received",
            signalColor: "#38bdf8",
        });

        expect(sending.showBackgroundGlow).toBe(true);
        expect(received.showBackgroundGlow).toBe(true);
        expect(received.backgroundGlowClass).toBe("animate-signal-wind");
    });

    it("keeps hold aura sizes compact instead of flooding the card", () => {
        const visualState = getFriendCardVisualState({
            signalType: "hand",
            holdProgress: 100,
            isHolding: true,
            isSending: false,
            signalState: "idle",
            signalColor: "#2dd4bf",
        });

        expect(visualState.holdAuraSize).toBe("9.4rem");
        expect(visualState.holdRingSize).toBe("8.7rem");
        expect(visualState.backgroundGlowColor).toBe("#2dd4bf2e");
    });
});
