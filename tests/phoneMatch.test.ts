import { beforeEach, describe, expect, it, vi } from "vitest";

const restDbGetMock = vi.fn();
const restDbQueryByChildMock = vi.fn();
const restDbSetMock = vi.fn();
const restDbUpdateMock = vi.fn();

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: vi.fn(() => true) } }));
vi.mock("firebase/database", () => ({
    ref: vi.fn(), set: vi.fn(), get: vi.fn(), update: vi.fn(), push: vi.fn(),
    onValue: vi.fn(), off: vi.fn(), query: vi.fn(), orderByChild: vi.fn(), equalTo: vi.fn(), serverTimestamp: vi.fn(),
}));
vi.mock("@/lib/firebase/config", () => ({ database: { app: { options: {} } } }));
vi.mock("@/lib/firebase/nativeNotifications", () => ({
    notifyMarcoReceived: vi.fn(), notifyPoloReceived: vi.fn(), notifySOSReceived: vi.fn(),
}));
vi.mock("@/lib/crypto/encryption", () => ({
    encryptCustomMessage: vi.fn(async (v: string) => v), decryptCustomMessage: vi.fn(async (v: string) => v),
}));
vi.mock("@/lib/firebase/auth", () => ({
    normalizePhoneNumber: (p: string) => p.replace(/\D/g, ""),
    restDbGet: restDbGetMock, restDbQueryByChild: restDbQueryByChildMock,
    restDbSet: restDbSetMock, restDbUpdate: restDbUpdateMock, restDbPush: vi.fn(),
}));

describe("friend lookup tolerates phone format (registered user in national format)", () => {
    beforeEach(() => {
        vi.resetModules();
        restDbGetMock.mockReset();
        restDbQueryByChildMock.mockReset();
        restDbSetMock.mockReset();
        restDbUpdateMock.mockReset();
    });

    it("finds a user stored as +46760366102 when typed as national 0760366102", async () => {
        // Sender is a +46 (Sweden) number. Target typed in local format with leading 0.
        // Candidate #1 (exact "0760366102") misses; candidate #2 (E.164 "46760366102") hits.
        restDbQueryByChildMock
            .mockResolvedValueOnce(null) // users query for "0760366102"
            .mockResolvedValueOnce({     // users query for "46760366102"
                "target-user": { phone: "+46760366102", displayName: "Registered Rita" },
            });
        restDbGetMock
            .mockResolvedValueOnce({ displayName: "Alex" }) // fromUser
            .mockResolvedValueOnce(null)                    // blocked
            .mockResolvedValueOnce(null)                    // already-connected
            .mockResolvedValueOnce(null);                   // my connections (circle count)

        const { sendFriendRequest } = await import("@/lib/firebase/database");
        const result = await sendFriendRequest("user-1", "+46701112233", "0760366102");

        expect(result).toEqual({ success: true });
        expect(restDbQueryByChildMock).toHaveBeenNthCalledWith(1, "users", "phoneNormalized", "0760366102");
        expect(restDbQueryByChildMock).toHaveBeenNthCalledWith(2, "users", "phoneNormalized", "46760366102");
        expect(restDbSetMock).toHaveBeenCalledWith(
            "friendRequests/user-1_target-user",
            expect.objectContaining({ to: "target-user", toPhone: "+46760366102", status: "pending" })
        );
    });

    it("still reports User not found when no candidate matches", async () => {
        restDbQueryByChildMock.mockResolvedValue(null); // every candidate query misses
        const { sendFriendRequest } = await import("@/lib/firebase/database");
        const result = await sendFriendRequest("user-1", "+46701112233", "0700000000");
        expect(result).toEqual({ success: false, error: "User not found" });
        expect(restDbSetMock).not.toHaveBeenCalled();
    });
});
