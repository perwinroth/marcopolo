import { beforeEach, describe, expect, it, vi } from "vitest";

const fbRequestPermissionsMock = vi.fn();
const getTokenMock = vi.fn();
const addListenerMock = vi.fn();
const localNotificationPermissionsMock = vi.fn();
const restDbUpdateMock = vi.fn();
const getNativeUidMock = vi.fn(() => "user-1");

vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: vi.fn(() => true) } }));

vi.mock("@capacitor/local-notifications", () => ({
    LocalNotifications: { requestPermissions: localNotificationPermissionsMock, schedule: vi.fn() },
}));

vi.mock("@capacitor-firebase/messaging", () => ({
    FirebaseMessaging: {
        requestPermissions: fbRequestPermissionsMock,
        getToken: getTokenMock,
        addListener: addListenerMock,
    },
}));

// nativeNotifications now stores the token via the REST helpers (native path),
// so mock ./auth to avoid initializing the real Firebase config.
vi.mock("@/lib/firebase/auth", () => ({
    getNativeUid: getNativeUidMock,
    restDbUpdate: restDbUpdateMock,
}));

describe("native notifications", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.restoreAllMocks();
        fbRequestPermissionsMock.mockReset();
        getTokenMock.mockReset();
        addListenerMock.mockReset();
        localNotificationPermissionsMock.mockReset();
        restDbUpdateMock.mockReset();
        getNativeUidMock.mockReturnValue("user-1");
    });

    it("registers a real FCM token and stores it on the user record", async () => {
        localNotificationPermissionsMock.mockResolvedValue({ display: "granted" });
        fbRequestPermissionsMock.mockResolvedValue({ receive: "granted" });
        getTokenMock.mockResolvedValue({ token: "fcm-token-abc" });
        addListenerMock.mockResolvedValue({ remove: vi.fn() });

        const { initNativeNotifications } = await import("@/lib/firebase/nativeNotifications");
        const result = await initNativeNotifications();

        expect(result).toBe(true);
        expect(getTokenMock).toHaveBeenCalled();
        expect(restDbUpdateMock).toHaveBeenCalledWith(
            "users/user-1",
            expect.objectContaining({ fcmToken: "fcm-token-abc", notificationsEnabled: true })
        );
        // tokenReceived + notificationReceived listeners
        expect(addListenerMock).toHaveBeenCalledTimes(2);
    });

    it("returns false and stores no token when notification permission is denied", async () => {
        localNotificationPermissionsMock.mockResolvedValue({ display: "granted" });
        fbRequestPermissionsMock.mockResolvedValue({ receive: "denied" });

        const { initNativeNotifications } = await import("@/lib/firebase/nativeNotifications");
        const result = await initNativeNotifications();

        expect(result).toBe(false);
        expect(getTokenMock).not.toHaveBeenCalled();
        expect(restDbUpdateMock).not.toHaveBeenCalled();
    });
});
