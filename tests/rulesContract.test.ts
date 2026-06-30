import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

// Regression guard for the "Permission denied" connections bug (Jun 2026):
// the client queried `users` by a field the security rules didn't index/allow,
// so every friend lookup was rejected. This test ties the query fields used in
// the client code to the `.indexOn` declarations in database.rules.json. If the
// code queries a node by a field the rules don't index, this fails — before ship.

const root = join(__dirname, "..");
const rules = JSON.parse(readFileSync(join(root, "database.rules.json"), "utf8")).rules as Record<
    string,
    { ".indexOn"?: string[]; ".read"?: string }
>;

// The fields a collection's `.read` rule actually permits clients to query by
// (every `query.orderByChild == 'X'` clause). This is the real permission gate —
// a field can be in `.indexOn` yet still be rejected by `.read` (exactly the bug:
// `phone` was indexed but only `phoneNormalized` queries were allowed).
function allowedQueryFields(node: string): string[] {
    const read = rules[node]?.[".read"] ?? "";
    return [...read.matchAll(/query\.orderByChild\s*==\s*['"](\w+)['"]/g)].map((m) => m[1]);
}

function clientSource(): string {
    const dir = join(root, "lib", "firebase");
    return readdirSync(dir)
        .filter((f) => f.endsWith(".ts"))
        .map((f) => readFileSync(join(dir, f), "utf8"))
        .join("\n");
}

// Collect every (node, field) the client queries by, across both data paths:
//  - native REST: restDbQueryByChild("node", "field", ...) / dbQueryByChild("node", "field", ...)
//  - web JS SDK:  query(ref(database, "node"), orderByChild("field"), ...)
function collectQueryPairs(src: string): Array<{ node: string; field: string }> {
    const pairs: Array<{ node: string; field: string }> = [];
    const byChild = /(?:restDbQueryByChild|dbQueryByChild)\(\s*["'`](\w+)["'`]\s*,\s*["'`](\w+)["'`]/g;
    for (const m of src.matchAll(byChild)) pairs.push({ node: m[1], field: m[2] });
    const sdk = /ref\(\s*database\s*,\s*["'`](\w+)["'`]\s*\)\s*,\s*orderByChild\(\s*["'`](\w+)["'`]/g;
    for (const m of src.matchAll(sdk)) pairs.push({ node: m[1], field: m[2] });
    return pairs;
}

describe("security rules ↔ client query contract", () => {
    const src = clientSource();
    const pairs = collectQueryPairs(src);

    it("finds the known indexed queries in the client (sanity check on the parser)", () => {
        const has = (node: string, field: string) => pairs.some((p) => p.node === node && p.field === field);
        expect(has("users", "phoneNormalized")).toBe(true);
        expect(has("friendRequests", "to")).toBe(true);
        expect(has("friendRequests", "from")).toBe(true);
        expect(has("invitations", "inviterId")).toBe(true);
    });

    it("every field the client queries by is permitted by the node's .read rule", () => {
        const violations: string[] = [];
        for (const { node, field } of pairs) {
            const allowed = allowedQueryFields(node);
            if (!allowed.includes(field)) {
                violations.push(
                    `${node} is queried by "${field}" but rules[${node}].read only permits query.orderByChild in [${allowed.join(", ")}]`
                );
            }
        }
        expect(violations, "\n" + violations.join("\n")).toEqual([]);
    });

    it("every field the client queries by is also indexed (avoids slow scans / warnings)", () => {
        const violations: string[] = [];
        for (const { node, field } of pairs) {
            const indexOn = rules[node]?.[".indexOn"] ?? [];
            if (!indexOn.includes(field)) {
                violations.push(`${node} queried by "${field}" but rules[${node}].indexOn = [${indexOn.join(", ")}]`);
            }
        }
        expect(violations, "\n" + violations.join("\n")).toEqual([]);
    });

    it("never queries users by raw `phone` (must use phoneNormalized — the indexed field)", () => {
        // The original bug: lookups by "phone" instead of "phoneNormalized".
        const queriesPhone = pairs.some((p) => p.node === "users" && p.field === "phone");
        expect(queriesPhone).toBe(false);
    });
});
