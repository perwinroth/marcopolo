import { beforeEach, describe, expect, it, vi } from "vitest";

const getMock = vi.fn();
const setMock = vi.fn();
const queryMock = vi.fn((value) => value);
const refMock = vi.fn((_db, path: string) => path);
const orderByChildMock = vi.fn((value: string) => value);
const equalToMock = vi.fn((value: string) => value);
const removeMock = vi.fn();

vi.mock("firebase/database", () => ({
    get: getMock,
    set: setMock,
    remove: removeMock,
    query: queryMock,
    ref: refMock,
    orderByChild: orderByChildMock,
    equalTo: equalToMock,
}));

vi.mock("@/lib/firebase/config", () => ({
    auth: {
        currentUser: { uid: "user-1" },
    },
    database: {},
}));

vi.mock("@/lib/firebase/auth", () => ({
    normalizePhoneNumber: (phone: string) => phone.replace(/\D/g, ""),
}));

describe("invitations", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.restoreAllMocks();
        getMock.mockReset();
        setMock.mockReset();
        removeMock.mockReset();
    });

    it("creates a new invitation when the invitee is not already pending", async () => {
        getMock
            .mockResolvedValueOnce({
                exists: () => true,
                val: () => ({ displayName: "Jane", phone: "+46701112233" }),
            })
            .mockResolvedValueOnce({
                exists: () => false,
                val: () => null,
            });

        const { createInvitation } = await import("@/lib/firebase/invitations");
        const result = await createInvitation("+46 70 999 88 77");

        expect(result.success).toBe(true);
        expect(result.token).toBeTruthy();
        expect(setMock).toHaveBeenCalledTimes(1);
        expect(setMock.mock.calls[0]?.[1]).toMatchObject({
            inviterId: "user-1",
            inviterName: "Jane",
            inviterPhone: "+46701112233",
            inviteePhone: "+46 70 999 88 77",
            status: "pending",
        });
    });

    it("reuses the existing token for an already pending invitation", async () => {
        getMock
            .mockResolvedValueOnce({
                exists: () => true,
                val: () => ({ displayName: "Jane", phone: "+46701112233" }),
            })
            .mockResolvedValueOnce({
                exists: () => true,
                val: () => ({
                    existing: {
                        token: "existing-token",
                        status: "pending",
                    },
                }),
            });

        const { createInvitation } = await import("@/lib/firebase/invitations");
        const result = await createInvitation("+46 70 999 88 77");

        expect(result).toEqual({ success: true, token: "existing-token" });
        expect(setMock).not.toHaveBeenCalled();
    });

    it("rejects invitation acceptance when the logged-in phone does not match", async () => {
        getMock
            .mockResolvedValueOnce({
                exists: () => true,
                val: () => ({
                    invite: {
                        token: "abc",
                        inviterId: "inviter",
                        inviterName: "Alex",
                        inviterPhone: "+46701234567",
                        inviteePhoneHash: "different-hash",
                        status: "pending",
                        expiresAt: Date.now() + 10000,
                    },
                }),
            })
            .mockResolvedValueOnce({
                exists: () => true,
                val: () => ({ phone: "+46709998877", displayName: "Taylor" }),
            });

        const { acceptInvitation } = await import("@/lib/firebase/invitations");
        const result = await acceptInvitation("abc", "user-2");

        expect(result).toEqual({
            success: false,
            error: "This invitation is for a different phone number",
        });
    });
});
