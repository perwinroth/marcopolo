"use client";

import { Capacitor } from "@capacitor/core";

export interface PickedContact {
    name: string;
    phone: string;
}

/**
 * Opens the native iOS contact picker and returns the selected contact's
 * name and phone number. Returns null on web or if user cancels.
 */
export async function pickContact(): Promise<PickedContact | null> {
    // Only available on native platforms
    if (!Capacitor.isNativePlatform()) {
        return null;
    }

    try {
        // Dynamic import to avoid bundling issues on web
        const { CapacitorContacts } = await import("@capgo/capacitor-contacts");

        // Check permission first
        const permStatus = await CapacitorContacts.checkPermissions();
        if (permStatus.readContacts === "denied") {
            // Permission permanently denied — user needs to go to Settings
            return null;
        }

        if (permStatus.readContacts !== "granted" && permStatus.readContacts !== "limited") {
            // Request permission
            const reqResult = await CapacitorContacts.requestPermissions({
                permissions: ["readContacts"],
            });
            if (reqResult.readContacts !== "granted" && reqResult.readContacts !== "limited") {
                return null;
            }
        }

        // Show native contact picker
        const result = await CapacitorContacts.pickContacts({
            fields: ["fullName", "givenName", "familyName", "phoneNumbers"],
            multiple: false,
        });

        if (!result.contacts || result.contacts.length === 0) {
            return null;
        }

        const contact = result.contacts[0];
        const name = contact.fullName
            || [contact.givenName, contact.familyName].filter(Boolean).join(" ")
            || "Unknown";

        // Get the first phone number
        if (!contact.phoneNumbers || contact.phoneNumbers.length === 0) {
            return null;
        }

        // Prefer mobile number, fall back to first available
        const mobilePhone = contact.phoneNumbers.find(p => p.type === "MOBILE");
        const phone = (mobilePhone || contact.phoneNumbers[0]).value;

        // Clean up phone number — remove spaces, dashes, parens
        const cleanPhone = phone.replace(/[\s\-\(\)]/g, "");

        return { name, phone: cleanPhone };
    } catch (error) {
        console.warn("📇 Contact picker error:", error);
        return null;
    }
}

/**
 * Returns true if the contact picker is available (native platform only).
 */
export function isContactPickerAvailable(): boolean {
    return Capacitor.isNativePlatform();
}
