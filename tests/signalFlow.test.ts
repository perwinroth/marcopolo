import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mirror the mocking style of tests/database.test.ts. We drive the native REST
// helpers (restDbGet/restDbSet/restDbUpdate) directly and assert the exact
// connection paths + status payloads that sendMarco/sendPolo/sendEmergencySOS
// write for a 3-user circle: userA <-> userB and userA <-> userC.

const restDbGetMock = vi.fn();
const restDbQueryByChildMock = vi.fn();
const restDbSetMock = vi.fn();
const restDbUpdateMock = vi.fn();

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
    restDbPush: vi.fn(),
}));

// The 3-user circle.
const A = "userA";
const B = "userB";
const C = "userC";
const B_PHONE = "+46700000002";

describe("signal flow across a 3-user circle (native)", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.restoreAllMocks();
        vi.useRealTimers();
        restDbGetMock.mockReset();
        restDbQueryByChildMock.mockReset();
        restDbSetMock.mockReset();
        restDbUpdateMock.mockReset();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("step 1: userA Marco -> userB sets MARCO_SENT on A's side and MARCO_RECEIVED on B's side", async () => {
        // Reverse connection (connections/userB/userA) exists -> not removed.
        restDbGetMock.mockResolvedValue({ status: "IDLE" });

        const { sendMarco } = await import("@/lib/firebase/database");
        const result = await sendMarco(A, B, B_PHONE);

        expect(result).toEqual({ success: true });

        // Reverse-connection existence check is read first.
        expect(restDbGetMock).toHaveBeenCalledWith(`connections/${B}/${A}`);

        // A's own side -> MARCO_SENT
        expect(restDbUpdateMock).toHaveBeenCalledWith(
            `connections/${A}/${B}`,
            expect.objectContaining({ status: "MARCO_SENT" })
        );
        // B's reverse side -> MARCO_RECEIVED
        expect(restDbUpdateMock).toHaveBeenCalledWith(
            `connections/${B}/${A}`,
            expect.objectContaining({ status: "MARCO_RECEIVED" })
        );
    });

    it("step 2: userB Polo -> userA sets POLO_RECEIVED on connections/userA/userB, then auto-resets to IDLE after the timeout", async () => {
        vi.useFakeTimers();

        // sendPolo(fromUid=userB, toUid=userA): reverse conn is connections/userA/userB.
        restDbGetMock.mockResolvedValue({ status: "MARCO_SENT" });

        const { sendPolo } = await import("@/lib/firebase/database");
        const result = await sendPolo(B, A);

        expect(result).toEqual({ success: true });
        expect(restDbGetMock).toHaveBeenCalledWith(`connections/${A}/${B}`);

        // The Polo lands on the ORIGINAL Marco sender's side: connections/userA/userB.
        expect(restDbUpdateMock).toHaveBeenCalledWith(
            `connections/${A}/${B}`,
            expect.objectContaining({ status: "POLO_RECEIVED" })
        );
        // Polo sender (userB) resets their own side to IDLE immediately.
        expect(restDbUpdateMock).toHaveBeenCalledWith(
            `connections/${B}/${A}`,
            expect.objectContaining({ status: "IDLE" })
        );

        restDbUpdateMock.mockClear();

        // sendPolo schedules a 4s auto-reset of the receiver side back to IDLE.
        await vi.advanceTimersByTimeAsync(4000);

        expect(restDbUpdateMock).toHaveBeenCalledWith(
            `connections/${A}/${B}`,
            { status: "IDLE" }
        );
    });

    it("step 3: userA SOS to circle [userB, userC] writes SOS_SENT on both own sides and SOS_RECEIVED on both reverse sides, then restores prior statuses after the timeout", async () => {
        vi.useFakeTimers();

        // Prior statuses across the circle before the SOS overwrites them.
        const state: Record<string, any> = {
            [`connections/${A}`]: {
                [B]: { status: "IDLE" },
                [C]: { status: "MARCO_SENT" },
            },
            [`connections/${A}/${B}`]: { status: "IDLE" },
            [`connections/${A}/${C}`]: { status: "MARCO_SENT" },
            [`connections/${B}/${A}`]: { status: "IDLE" },
            [`connections/${C}/${A}`]: { status: "MARCO_RECEIVED" },
        };

        restDbGetMock.mockImplementation(async (path: string) => state[path] ?? null);
        restDbUpdateMock.mockImplementation(async (path: string, data: Record<string, unknown>) => {
            state[path] = { ...(state[path] ?? {}), ...data };
        });

        const { HELP_STATUS_EXPIRY_MS, sendEmergencySOS } = await import("@/lib/firebase/database");
        const result = await sendEmergencySOS(A);

        expect(result).toEqual({ success: true });

        // SOS_SENT on userA's own side toward BOTH friends.
        expect(restDbUpdateMock).toHaveBeenCalledWith(
            `connections/${A}/${B}`,
            expect.objectContaining({ status: "SOS_SENT" })
        );
        expect(restDbUpdateMock).toHaveBeenCalledWith(
            `connections/${A}/${C}`,
            expect.objectContaining({ status: "SOS_SENT" })
        );
        // SOS_RECEIVED on BOTH reverse sides.
        expect(restDbUpdateMock).toHaveBeenCalledWith(
            `connections/${B}/${A}`,
            expect.objectContaining({ status: "SOS_RECEIVED" })
        );
        expect(restDbUpdateMock).toHaveBeenCalledWith(
            `connections/${C}/${A}`,
            expect.objectContaining({ status: "SOS_RECEIVED" })
        );

        restDbUpdateMock.mockClear();

        // After the expiry the temporary SOS is rolled back to each side's prior status.
        await vi.advanceTimersByTimeAsync(HELP_STATUS_EXPIRY_MS);

        expect(restDbUpdateMock).toHaveBeenCalledWith(
            `connections/${A}/${B}`,
            { status: "IDLE" }
        );
        expect(restDbUpdateMock).toHaveBeenCalledWith(
            `connections/${A}/${C}`,
            { status: "MARCO_SENT" }
        );
        expect(restDbUpdateMock).toHaveBeenCalledWith(
            `connections/${B}/${A}`,
            { status: "IDLE" }
        );
        expect(restDbUpdateMock).toHaveBeenCalledWith(
            `connections/${C}/${A}`,
            { status: "MARCO_RECEIVED" }
        );
    });

    it("step 4 (edge): sendMarco when the reverse connection is missing returns removed and clears own side", async () => {
        // Reverse connection gone -> the friend removed us.
        restDbGetMock.mockResolvedValue(null);

        const { sendMarco } = await import("@/lib/firebase/database");
        const result = await sendMarco(A, B, B_PHONE);

        expect(result).toEqual({ success: false, error: "removed" });
        expect(restDbGetMock).toHaveBeenCalledWith(`connections/${B}/${A}`);

        // Own dangling side is cleared.
        expect(restDbSetMock).toHaveBeenCalledWith(`connections/${A}/${B}`, null);

        // No status writes happen when the connection was removed.
        expect(restDbUpdateMock).not.toHaveBeenCalled();
    });
});
