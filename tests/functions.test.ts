import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebase/auth", () => ({
    getNativeAuthToken: vi.fn(),
}));

vi.mock("@/lib/firebase/config", () => ({
    auth: {
        currentUser: null,
    },
}));

describe("firebase function client", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
    });

    it("builds function URLs from project id", async () => {
        vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "demo-project");
        const { getFunctionUrl } = await import("@/lib/firebase/functions");

        expect(getFunctionUrl("sendNotification")).toBe(
            "https://europe-west1-demo-project.cloudfunctions.net/sendNotification"
        );
    });

    it("prefers native auth token when available", async () => {
        const authModule = await import("@/lib/firebase/auth");
        vi.mocked(authModule.getNativeAuthToken).mockReturnValue("native-token");
        const { getAuthBearerToken } = await import("@/lib/firebase/functions");

        await expect(getAuthBearerToken()).resolves.toBe("native-token");
    });

    it("throws when no auth token is available", async () => {
        const authModule = await import("@/lib/firebase/auth");
        vi.mocked(authModule.getNativeAuthToken).mockReturnValue(null);
        const { getAuthBearerToken } = await import("@/lib/firebase/functions");

        await expect(getAuthBearerToken()).rejects.toThrow("Not authenticated");
    });

    it("sends authenticated JSON requests", async () => {
        vi.stubEnv("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "demo-project");
        const authModule = await import("@/lib/firebase/auth");
        vi.mocked(authModule.getNativeAuthToken).mockReturnValue("native-token");
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ success: true }),
        });
        vi.stubGlobal("fetch", fetchMock);

        const { callFunction } = await import("@/lib/firebase/functions");
        const response = await callFunction<{ success: boolean }>("sendRecoveryCode", {
            body: { email: "test@example.com" },
        });

        expect(response.success).toBe(true);
        expect(fetchMock).toHaveBeenCalledWith(
            "https://europe-west1-demo-project.cloudfunctions.net/sendRecoveryCode",
            expect.objectContaining({
                method: "POST",
                headers: expect.objectContaining({
                    Authorization: "Bearer native-token",
                    "Content-Type": "application/json",
                }),
                body: JSON.stringify({ email: "test@example.com" }),
            })
        );
    });
});
