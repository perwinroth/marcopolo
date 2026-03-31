import { beforeEach, describe, expect, it } from "vitest";
import {
    decryptCustomMessage,
    decryptMessage,
    encryptCustomMessage,
    encryptMessage,
    exportKey,
    generateEncryptionKey,
    hashData,
    importKey,
} from "@/lib/crypto/encryption";

describe("encryption utilities", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("round-trips exported and imported keys", async () => {
        const key = await generateEncryptionKey();
        const exported = await exportKey(key);
        const imported = await importKey(exported);
        const { encrypted, iv } = await encryptMessage("hello", imported);

        await expect(decryptMessage(encrypted, iv, imported)).resolves.toBe("hello");
    });

    it("encrypts and decrypts custom messages with persisted local key", async () => {
        const encrypted = await encryptCustomMessage("Marco?");

        await expect(decryptCustomMessage(encrypted)).resolves.toBe("Marco?");
    });

    it("returns empty string for undecryptable blobs", async () => {
        await expect(decryptCustomMessage("{\"encrypted\":\"bad\",\"iv\":\"data\"}")).resolves.toBe("");
    });

    it("returns plain text unchanged when stored value is not encrypted json", async () => {
        await expect(decryptCustomMessage("Polo!")).resolves.toBe("Polo!");
    });

    it("produces deterministic hashes when salt is fixed", async () => {
        const first = await hashData("12345", "salt");
        const second = await hashData("12345", "salt");

        expect(first).toBe(second);
        expect(first).toHaveLength(64);
    });
});
