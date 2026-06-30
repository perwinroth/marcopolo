import { beforeEach, describe, expect, it, vi } from "vitest";

// Native (iOS) path: app authenticates via REST (skipNativeAuth), so invitations
// must use getNativeUid + restDb* — not auth.currentUser / the JS SDK.
const getNativeUidMock = vi.fn();
const restDbGetMock = vi.fn();
const restDbSetMock = vi.fn();
const restDbQueryByChildMock = vi.fn();

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true } }));
vi.mock("firebase/database", () => ({
    ref: vi.fn(),
    set: vi.fn(),
    get: vi.fn(),
    remove: vi.fn(),
    query: vi.fn(),
    orderByChild: vi.fn(),
    equalTo: vi.fn(),
    onValue: vi.fn(),
    off: vi.fn(),
}));
vi.mock("@/lib/firebase/config", () => ({ auth: { currentUser: null }, database: {} }));
vi.mock("@/lib/firebase/auth", () => ({
    normalizePhoneNumber: (phone: string) => phone.replace(/\D/g, ""),
    getNativeUid: getNativeUidMock,
    restDbGet: restDbGetMock,
    restDbSet: restDbSetMock,
    restDbQueryByChild: restDbQueryByChildMock,
}));

describe("invitations (native REST path)", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.restoreAllMocks();
        getNativeUidMock.mockReset();
        restDbGetMock.mockReset();
        restDbSetMock.mockReset();
        restDbQueryByChildMock.mockReset();
    });

    it("creates an invitation using the native uid and writes via REST", async () => {
        getNativeUidMock.mockReturnValue("native-user-1");
        restDbGetMock.mockResolvedValueOnce({ displayName: "Nate", phone: "+46700000000" });
        restDbQueryByChildMock.mockResolvedValueOnce(null); // no existing invite for this phone

        const { createInvitation } = await import("@/lib/firebase/invitations");
        const res = await createInvitation("+46709998877");

        expect(res.success).toBe(true);
        expect(res.token).toBeTruthy();
        expect(getNativeUidMock).toHaveBeenCalled();
        expect(restDbGetMock).toHaveBeenCalledWith("users/native-user-1");
        expect(restDbSetMock).toHaveBeenCalledWith(
            expect.stringMatching(/^invitations\//),
            expect.objectContaining({
                inviterId: "native-user-1",
                inviteePhone: "+46709998877",
                status: "pending",
            })
        );
    });

    it("returns Not authenticated when there is no native session", async () => {
        getNativeUidMock.mockReturnValue(null);

        const { createInvitation } = await import("@/lib/firebase/invitations");
        const res = await createInvitation("+46709998877");

        expect(res).toEqual({ success: false, error: "Not authenticated" });
        expect(restDbSetMock).not.toHaveBeenCalled();
    });

    it("reuses an existing pending invitation instead of creating a duplicate", async () => {
        getNativeUidMock.mockReturnValue("native-user-1");
        restDbGetMock.mockResolvedValueOnce({ displayName: "Nate", phone: "+46700000000" });
        restDbQueryByChildMock.mockResolvedValueOnce({
            "inv_existing": { token: "existing-token", status: "pending" },
        });

        const { createInvitation } = await import("@/lib/firebase/invitations");
        const res = await createInvitation("+46709998877");

        expect(res).toEqual({ success: true, token: "existing-token" });
        expect(restDbSetMock).not.toHaveBeenCalled();
    });
});
