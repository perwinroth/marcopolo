import { beforeEach, describe, expect, it, vi } from "vitest";

const firebaseSignOutMock = vi.fn();
const nativePluginSignOutMock = vi.fn();

vi.mock("@capacitor/core", () => ({
    Capacitor: {
        isNativePlatform: vi.fn(() => true),
    },
}));

vi.mock("@capacitor/preferences", () => ({
    Preferences: {
        set: vi.fn(),
        get: vi.fn(),
        remove: vi.fn(),
    },
}));

vi.mock("firebase/auth", () => ({
    signInWithCustomToken: vi.fn(),
    signOut: firebaseSignOutMock,
    setPersistence: vi.fn(),
    browserLocalPersistence: {},
    signInWithCredential: vi.fn(),
    PhoneAuthProvider: {},
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    RecaptchaVerifier: vi.fn(),
    signInWithPhoneNumber: vi.fn(),
}));

vi.mock("@capacitor-firebase/authentication", () => ({
    FirebaseAuthentication: {
        signOut: nativePluginSignOutMock,
    },
}));

vi.mock("firebase/database", () => ({
    ref: vi.fn(),
    set: vi.fn(),
    get: vi.fn(),
}));

vi.mock("@/lib/firebase/config", () => ({
    auth: {
        app: {
            options: {
                apiKey: "demo-api-key",
                databaseURL: "https://demo-db.firebaseio.com",
            },
        },
        currentUser: null,
        onAuthStateChanged: vi.fn(),
    },
    database: {},
}));

describe("native auth REST retry", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.restoreAllMocks();
        vi.useRealTimers();
        firebaseSignOutMock.mockReset();
        nativePluginSignOutMock.mockReset();
    });

    it("retries database requests only after a successful token refresh", async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce({
                status: 401,
                ok: false,
                text: async () => "Permission denied",
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    id_token: "fresh-token",
                    refresh_token: "fresh-refresh-token",
                    user_id: "user-1",
                }),
            })
            .mockResolvedValueOnce({
                status: 200,
                ok: true,
                json: async () => ({ ok: true }),
            });

        vi.stubGlobal("fetch", fetchMock);

        const authModule = await import("@/lib/firebase/auth");
        authModule.__test__.setNativeSession({
            idToken: "expired-token",
            refreshToken: "refresh-token",
            uid: "user-1",
        });

        const result = await authModule.restDbGet("users/user-1");

        expect(result).toEqual({ ok: true });
        expect(fetchMock).toHaveBeenNthCalledWith(
            1,
            "https://demo-db.firebaseio.com/users/user-1.json?auth=expired-token",
            undefined
        );
        expect(fetchMock).toHaveBeenNthCalledWith(
            2,
            "https://securetoken.googleapis.com/v1/token?key=demo-api-key",
            expect.objectContaining({
                method: "POST",
            })
        );
        expect(fetchMock).toHaveBeenNthCalledWith(
            3,
            "https://demo-db.firebaseio.com/users/user-1.json?auth=fresh-token",
            undefined
        );
    });

    it("resolves logout even if native plugin signOut hangs", async () => {
        vi.useFakeTimers();
        nativePluginSignOutMock.mockImplementation(() => new Promise(() => {}));
        firebaseSignOutMock.mockResolvedValue(undefined);

        const authModule = await import("@/lib/firebase/auth");
        const logoutPromise = authModule.signOut();

        await vi.advanceTimersByTimeAsync(1500);
        await logoutPromise;

        expect(nativePluginSignOutMock).toHaveBeenCalledTimes(1);
        expect(firebaseSignOutMock).toHaveBeenCalledTimes(1);
    });

    it("resolves logout even if firebase signOut hangs", async () => {
        vi.useFakeTimers();
        nativePluginSignOutMock.mockResolvedValue(undefined);
        firebaseSignOutMock.mockImplementation(() => new Promise(() => {}));

        const authModule = await import("@/lib/firebase/auth");
        const logoutPromise = authModule.signOut();

        await vi.advanceTimersByTimeAsync(1500);
        await logoutPromise;

        expect(nativePluginSignOutMock).toHaveBeenCalledTimes(1);
        expect(firebaseSignOutMock).toHaveBeenCalledTimes(1);
    });
});
