import { beforeEach, describe, expect, it, vi } from "vitest";

const callFunctionMock = vi.fn();
const signOutMock = vi.fn();

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false } }));
vi.mock("firebase/database", () => ({
    ref: vi.fn(),
    get: vi.fn(),
    query: vi.fn(),
    orderByChild: vi.fn(),
    equalTo: vi.fn(),
}));
vi.mock("@/lib/firebase/config", () => ({ database: {}, auth: { currentUser: null, app: { options: {} } } }));
vi.mock("@/lib/crypto/encryption", () => ({ decryptCustomMessage: vi.fn(async (v: string) => v) }));
vi.mock("@/lib/firebase/auth", () => ({
    restDbGet: vi.fn(),
    restDbQueryByChild: vi.fn(),
    signOut: signOutMock,
}));
vi.mock("@/lib/firebase/functions", () => ({ callFunction: callFunctionMock }));

describe("account deletion (GDPR)", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.restoreAllMocks();
        callFunctionMock.mockReset();
        signOutMock.mockReset();
    });

    it("delegates to the admin deleteAccount Cloud Function, then signs out", async () => {
        callFunctionMock.mockResolvedValueOnce({ success: true });
        signOutMock.mockResolvedValueOnce(undefined);

        const { deleteAccount } = await import("@/lib/firebase/account");
        await deleteAccount("user-1");

        expect(callFunctionMock).toHaveBeenCalledWith("deleteAccount", { withAuth: true });
        expect(signOutMock).toHaveBeenCalledTimes(1);
    });

    it("throws a clear error and does not sign out if deletion fails", async () => {
        callFunctionMock.mockRejectedValueOnce(new Error("Function deleteAccount failed with 500"));

        const { deleteAccount } = await import("@/lib/firebase/account");
        await expect(deleteAccount("user-1")).rejects.toThrow(/Failed to delete account/);
        expect(signOutMock).not.toHaveBeenCalled();
    });
});
