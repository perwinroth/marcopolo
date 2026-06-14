import { describe, expect, it } from "vitest";
import { getUserPushTokenField, normalizePushBundleId } from "@/functions/src/pushTokens";

describe("push token routing", () => {
    it("stores iPhone app tokens as fcmToken", () => {
        expect(getUserPushTokenField("co.polomar.app")).toBe("fcmToken");
    });

    it("stores watch tokens as watchToken", () => {
        expect(getUserPushTokenField("co.polomar.app.watchkitapp")).toBe("watchToken");
    });

    it("falls back unknown bundle ids to the watch target", () => {
        expect(normalizePushBundleId("unknown.bundle")).toBe("co.polomar.app.watchkitapp");
    });
});
