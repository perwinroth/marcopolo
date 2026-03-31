import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@capacitor/core", () => ({
    Capacitor: {
        isNativePlatform: vi.fn(),
    },
}));

vi.mock("@capgo/capacitor-contacts", () => ({
    CapacitorContacts: {
        checkPermissions: vi.fn(),
        requestPermissions: vi.fn(),
        pickContacts: vi.fn(),
    },
}));

describe("contact picker", () => {
    beforeEach(() => {
        vi.resetModules();
        vi.restoreAllMocks();
    });

    it("is unavailable on web", async () => {
        const { Capacitor } = await import("@capacitor/core");
        vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
        const { isContactPickerAvailable, pickContact } = await import("@/lib/contactPicker");

        expect(isContactPickerAvailable()).toBe(false);
        await expect(pickContact()).resolves.toBeNull();
    });

    it("returns the selected mobile number on native", async () => {
        const { Capacitor } = await import("@capacitor/core");
        const { CapacitorContacts } = await import("@capgo/capacitor-contacts");
        vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
        vi.mocked(CapacitorContacts.checkPermissions).mockResolvedValue({ readContacts: "granted" } as never);
        vi.mocked(CapacitorContacts.pickContacts).mockResolvedValue({
            contacts: [
                {
                    fullName: "Jane Doe",
                    phoneNumbers: [
                        { type: "HOME", value: "+46 70 111 22 33" },
                        { type: "MOBILE", value: "+46 70 999 88 77" },
                    ],
                },
            ],
        } as never);

        const { pickContact } = await import("@/lib/contactPicker");

        await expect(pickContact()).resolves.toEqual({
            name: "Jane Doe",
            phone: "+46709998877",
        });
    });

    it("requests permission when needed and aborts if denied", async () => {
        const { Capacitor } = await import("@capacitor/core");
        const { CapacitorContacts } = await import("@capgo/capacitor-contacts");
        vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
        vi.mocked(CapacitorContacts.checkPermissions).mockResolvedValue({ readContacts: "prompt" } as never);
        vi.mocked(CapacitorContacts.requestPermissions).mockResolvedValue({ readContacts: "denied" } as never);

        const { pickContact } = await import("@/lib/contactPicker");

        await expect(pickContact()).resolves.toBeNull();
        expect(CapacitorContacts.requestPermissions).toHaveBeenCalled();
    });
});
