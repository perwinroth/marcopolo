import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const restDbGetMock = vi.fn();
const restDbQueryByChildMock = vi.fn();
const restDbSetMock = vi.fn();
const restDbUpdateMock = vi.fn();
const restDbPushMock = vi.fn();

vi.mock("@capacitor/core", () => ({
    Capacitor: {
        isNativePlatform: vi.fn(() => true),
    },
}));

vi.mock("firebase/database", () => ({
    ref: vi.fn(),
    set: vi.fn(),
    get: vi.fn(),
    update: vi.fn(),
    push: vi.fn(),
    onValue: vi.fn(),
    off: vi.fn(),
    query: vi.fn(),
    orderByChild: vi.fn(),
    equalTo: vi.fn(),
    serverTimestamp: vi.fn(),
}));

vi.mock("@/lib/firebase/config", () => ({
    database: {
        app: {
            options: {},
        },
    },
}));

vi.mock("@/lib/firebase/nativeNotifications", () => ({
    notifyMarcoReceived: vi.fn(),
    notifyPoloReceived: vi.fn(),
    notifySOSReceived: vi.fn(),
}));

vi.mock("@/lib/crypto/encryption", () => ({
    encryptCustomMessage: vi.fn(async (value: string) => value),
    decryptCustomMessage: vi.fn(async (value: string) => value),
}));

vi.mock("@/lib/firebase/auth", () => ({
    normalizePhoneNumber: (phone: string) => phone.replace(/\D/g, ""),
    restDbGet: restDbGetMock,
    restDbQueryByChild: restDbQueryByChildMock,
    restDbSet: restDbSetMock,
    restDbUpdate: restDbUpdateMock,
    restDbPush: restDbPushMock,
}));

describe("database native friend requests", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.restoreAllMocks();
        vi.useRealTimers();
        restDbGetMock.mockReset();
        restDbQueryByChildMock.mockReset();
        restDbSetMock.mockReset();
        restDbUpdateMock.mockReset();
        restDbPushMock.mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("creates native friend requests through restDbPush", async () => {
        restDbQueryByChildMock.mockResolvedValueOnce({
            "target-user": {
                phone: "+46709998877",
                displayName: "Taylor",
            },
        });
        restDbGetMock
            .mockResolvedValueOnce({ displayName: "Alex" })
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null);
        restDbPushMock.mockResolvedValueOnce("request-1");

        const { sendFriendRequest } = await import("@/lib/firebase/database");
        const result = await sendFriendRequest("user-1", "+46701112233", "+46 70 999 88 77");

        expect(result).toEqual({ success: true });
        expect(restDbPushMock).toHaveBeenCalledWith(
            "friendRequests",
            expect.objectContaining({
                from: "user-1",
                fromPhone: "+46701112233",
                to: "target-user",
                toPhone: "+46709998877",
                toDisplayName: "Taylor",
                status: "pending",
            })
        );
    });

    it("surfaces native push failures from friend request creation", async () => {
        restDbQueryByChildMock.mockResolvedValueOnce({
            "target-user": {
                phone: "+46709998877",
                displayName: "Taylor",
            },
        });
        restDbGetMock
            .mockResolvedValueOnce({ displayName: "Alex" })
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null);
        restDbPushMock.mockRejectedValueOnce(new Error("DB PUSH failed: 401 Permission denied"));

        const { sendFriendRequest } = await import("@/lib/firebase/database");
        const result = await sendFriendRequest("user-1", "+46701112233", "+46 70 999 88 77");

        expect(result).toEqual({
            success: false,
            error: "DB PUSH failed: 401 Permission denied",
        });
    });

    it("rejects friend requests when the target user has blocked the sender", async () => {
        restDbQueryByChildMock.mockResolvedValueOnce({
            "target-user": {
                phone: "+46709998877",
                displayName: "Taylor",
            },
        });
        restDbGetMock
            .mockResolvedValueOnce({ displayName: "Alex" })
            .mockResolvedValueOnce({ blockedAt: 123456 });

        const { sendFriendRequest } = await import("@/lib/firebase/database");
        const result = await sendFriendRequest("user-1", "+46701112233", "+46 70 999 88 77");

        expect(result).toEqual({
            success: false,
            error: "Unable to send request",
        });
        expect(restDbGetMock).toHaveBeenCalledWith("blocked/target-user/user-1");
    });

    it("expires help statuses back to the prior Marco/Polo state", async () => {
        vi.useFakeTimers();

        const now = 1234567890;
        const state: Record<string, any> = {
            "connections/user-1": {
                "friend-1": {
                    phone: "+46709998877",
                    displayName: "Taylor",
                    status: "MARCO_RECEIVED",
                    lastActionTime: now,
                },
            },
            "connections/user-1/friend-1": { status: "MARCO_RECEIVED" },
            "connections/friend-1/user-1": { status: "IDLE" },
        };

        restDbGetMock.mockImplementation(async (path: string) => state[path] ?? null);
        restDbUpdateMock.mockImplementation(async (path: string, data: Record<string, unknown>) => {
            state[path] = { ...(state[path] ?? {}), ...data };
        });

        const { HELP_STATUS_EXPIRY_MS, sendEmergencySOS } = await import("@/lib/firebase/database");
        const result = await sendEmergencySOS("user-1");

        expect(result).toEqual({ success: true });
        expect(restDbUpdateMock).toHaveBeenCalledWith(
            "connections/user-1/friend-1",
            expect.objectContaining({ status: "SOS_SENT" })
        );
        expect(restDbUpdateMock).toHaveBeenCalledWith(
            "connections/friend-1/user-1",
            expect.objectContaining({ status: "SOS_RECEIVED" })
        );

        restDbUpdateMock.mockClear();

        await vi.advanceTimersByTimeAsync(HELP_STATUS_EXPIRY_MS);

        expect(restDbUpdateMock).toHaveBeenCalledWith(
            "connections/user-1/friend-1",
            { status: "MARCO_RECEIVED" }
        );
        expect(restDbUpdateMock).toHaveBeenCalledWith(
            "connections/friend-1/user-1",
            { status: "IDLE" }
        );
    });
});
