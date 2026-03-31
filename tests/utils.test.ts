import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
    it("joins truthy class values", () => {
        expect(cn("a", "b", true && "c")).toBe("a b c");
    });

    it("drops falsy values", () => {
        expect(cn("a", false, undefined, null, "b")).toBe("a b");
    });
});
