// Pure helper for the dashboard "Pending" list: hide any outgoing request or SMS
// invitation for someone you're already connected to (e.g. they added you while
// your request was still pending) — so you can't "cancel" an existing friend.
// Extracted from Dashboard so the logic is unit-tested.

type ConnectionLike = { id?: string; phone?: string };
type RequestLike = { to: string };
type InvitationLike = { inviteePhone?: string };

// Matches lib/firebase/auth.ts normalizePhoneNumber (digits only).
const digitsOnly = (phone: string): string => phone.replace(/\D/g, "");

export function filterVisiblePending<R extends RequestLike, I extends InvitationLike>(
    friends: ConnectionLike[],
    sentRequests: R[],
    sentInvitations: I[]
): { visibleSentRequests: R[]; visibleSentInvitations: I[] } {
    const connectedIds = new Set(friends.map((f) => f.id).filter(Boolean) as string[]);
    const connectedPhones = new Set(friends.map((f) => digitsOnly(f.phone || "")).filter(Boolean));

    const visibleSentRequests = sentRequests.filter((r) => !connectedIds.has(r.to));
    const visibleSentInvitations = sentInvitations.filter((inv) => {
        const p = digitsOnly(inv.inviteePhone || "");
        return !p || !connectedPhones.has(p);
    });

    return { visibleSentRequests, visibleSentInvitations };
}
