import { describe, expect, it } from "vitest";
import { filterVisiblePending } from "@/lib/pendingVisibility";

describe("filterVisiblePending", () => {
    it("hides a sent request for someone already connected (by uid)", () => {
        const friends = [{ id: "user-2", phone: "+46700000002" }];
        const sentRequests = [{ to: "user-2" }, { to: "user-3" }];
        const { visibleSentRequests } = filterVisiblePending(friends, sentRequests, []);
        expect(visibleSentRequests.map((r) => r.to)).toEqual(["user-3"]);
    });

    it("hides an SMS invitation for someone already connected (by phone, formatting-insensitive)", () => {
        const friends = [{ id: "user-2", phone: "+46 70 000 00 02" }];
        const sentInvitations = [
            { inviteePhone: "+46700000002" }, // same person, different formatting → hidden
            { inviteePhone: "+46709998877" }, // not connected → shown
        ];
        const { visibleSentInvitations } = filterVisiblePending(friends, [], sentInvitations);
        expect(visibleSentInvitations.map((i) => i.inviteePhone)).toEqual(["+46709998877"]);
    });

    it("keeps everything when there are no connections", () => {
        const sentRequests = [{ to: "user-9" }];
        const sentInvitations = [{ inviteePhone: "+46701234567" }];
        const out = filterVisiblePending([], sentRequests, sentInvitations);
        expect(out.visibleSentRequests).toHaveLength(1);
        expect(out.visibleSentInvitations).toHaveLength(1);
    });

    it("ignores connections with missing id/phone without crashing", () => {
        const friends = [{}, { phone: "" }, { id: "user-2", phone: "+46700000002" }];
        const sentRequests = [{ to: "user-2" }, { to: "user-5" }];
        const sentInvitations = [{ inviteePhone: "" }, { inviteePhone: "+46700000002" }];
        const out = filterVisiblePending(friends, sentRequests, sentInvitations);
        expect(out.visibleSentRequests.map((r) => r.to)).toEqual(["user-5"]);
        // empty invitee phone is kept (can't match), connected one is hidden
        expect(out.visibleSentInvitations.map((i) => i.inviteePhone)).toEqual([""]);
    });
});
