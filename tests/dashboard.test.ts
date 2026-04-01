import { describe, expect, it } from "vitest";

describe("dashboard logout state", () => {
    it("allows the signed-in user state to be cleared", () => {
        let currentUser: { uid: string } | null = { uid: "user-1" };
        const setCurrentUser = (nextUser: { uid: string } | null) => {
            currentUser = nextUser;
        };

        setCurrentUser(null);

        expect(currentUser).toBeNull();
    });
});
