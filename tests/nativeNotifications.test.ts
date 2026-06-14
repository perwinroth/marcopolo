import { beforeEach, describe, expect, it, vi } from "vitest";

const requestPermissionsMock = vi.fn();
const registerMock = vi.fn();
const addListenerMock = vi.fn();
const localNotificationPermissionsMock = vi.fn();

vi.mock("@capacitor/core", () => ({
    Capacitor: {
        isNativePlatform: vi.fn(() => true),
    },
}));

vi.mock("@capacitor/push-notifications", () => ({
    PushNotifications: {
        checkPermissions: vi.fn(),
        requestPermissions: requestPermissionsMock,
        register: registerMock,
        addListener: addListenerMock,
    },
}));

vi.mock("@/lib/firebase/functions", () => ({
    callFunction: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("@capacitor/local-notifications", () => ({
    LocalNotifications: {
        requestPermissions: localNotificationPermissionsMock,
        schedule: vi.fn(),
    },
}));

describe("native notifications", () => {
    beforeEach(async () => {
        vi.resetModules();
        vi.restoreAllMocks();
        requestPermissionsMock.mockReset();
        registerMock.mockReset();
        addListenerMock.mockReset();
        localNotificationPermissionsMock.mockReset();
    });

    it("initializes local and push permissions on native", async () => {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        vi.mocked(PushNotifications.checkPermissions).mockResolvedValue({ receive: "prompt" } as never);
        requestPermissionsMock.mockResolvedValue({ receive: "granted" });
        localNotificationPermissionsMock.mockResolvedValue({ display: "granted" });

        const { initNativeNotifications } = await import("@/lib/firebase/nativeNotifications");
        const result = await initNativeNotifications();

        expect(result).toBe(true);
        expect(addListenerMock).toHaveBeenCalledTimes(3);
        expect(registerMock).toHaveBeenCalledTimes(1);
    });

    it("returns false when push permissions are denied", async () => {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        vi.mocked(PushNotifications.checkPermissions).mockResolvedValue({ receive: "prompt" } as never);
        requestPermissionsMock.mockResolvedValue({ receive: "denied" });
        localNotificationPermissionsMock.mockResolvedValue({ display: "granted" });

        const { initNativeNotifications } = await import("@/lib/firebase/nativeNotifications");
        const result = await initNativeNotifications();

        expect(result).toBe(false);
        expect(registerMock).not.toHaveBeenCalled();
    });
});
