import { webcrypto } from "node:crypto";
import { Buffer } from "node:buffer";

class MemoryStorage implements Storage {
    private store = new Map<string, string>();

    get length(): number {
        return this.store.size;
    }

    clear(): void {
        this.store.clear();
    }

    getItem(key: string): string | null {
        return this.store.get(key) ?? null;
    }

    key(index: number): string | null {
        return Array.from(this.store.keys())[index] ?? null;
    }

    removeItem(key: string): void {
        this.store.delete(key);
    }

    setItem(key: string, value: string): void {
        this.store.set(key, value);
    }
}

Object.defineProperty(globalThis, "crypto", {
    value: webcrypto,
    configurable: true,
});

Object.defineProperty(globalThis, "localStorage", {
    value: new MemoryStorage(),
    configurable: true,
});

Object.defineProperty(globalThis, "btoa", {
    value: (value: string) => Buffer.from(value, "binary").toString("base64"),
    configurable: true,
});

Object.defineProperty(globalThis, "atob", {
    value: (value: string) => Buffer.from(value, "base64").toString("binary"),
    configurable: true,
});
