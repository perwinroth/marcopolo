import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

const TARGET_PHONE = "46760366102";
const DEBUG_SELF_TEST_UID = "__debug_self_test__";
const DEBUG_SELF_TEST_SECRET = process.env.SELF_TEST_SECRET || "marco-self-test";

function unauthorized() {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

async function findTargetUid() {
    const snapshot = await adminDb
        .ref("users")
        .orderByChild("phoneNormalized")
        .equalTo(TARGET_PHONE)
        .get();

    if (!snapshot.exists()) return null;
    const entries = Object.entries(snapshot.val() as Record<string, unknown>);
    return entries[0]?.[0] || null;
}

function makeTheme() {
    return {
        heartColor: "#2dd4bf",
        nameColor: "#2dd4bf",
        signalType: "hand",
        signalColor: "#2dd4bf",
    };
}

async function ensureConnection(targetUid: string) {
    const theme = makeTheme();
    const targetRef = adminDb.ref(`connections/${targetUid}/${DEBUG_SELF_TEST_UID}`);
    const reverseRef = adminDb.ref(`connections/${DEBUG_SELF_TEST_UID}/${targetUid}`);
    const [targetSnap, reverseSnap] = await Promise.all([targetRef.get(), reverseRef.get()]);

    if (!targetSnap.exists()) {
        await targetRef.set({
            phone: "+46700000000",
            displayName: "Self Test",
            status: "IDLE",
            lastActionTime: Date.now(),
            customMarco: "Marco?",
            customPolo: "Polo!",
            theme,
        });
    }

    if (!reverseSnap.exists()) {
        await reverseRef.set({
            phone: "",
            displayName: "You",
            status: "IDLE",
            lastActionTime: Date.now(),
            customMarco: "Marco?",
            customPolo: "Polo!",
            theme,
        });
    }
}

async function transitionStatus(targetUid: string, targetStatus: string, reverseStatus: string, resetDelayMs?: number) {
    await adminDb.ref(`connections/${targetUid}/${DEBUG_SELF_TEST_UID}`).update({
        status: "IDLE",
        lastActionTime: Date.now(),
    });
    await adminDb.ref(`connections/${DEBUG_SELF_TEST_UID}/${targetUid}`).update({
        status: "IDLE",
        lastActionTime: Date.now(),
    });

    await new Promise((resolve) => setTimeout(resolve, 180));

    await adminDb.ref(`connections/${targetUid}/${DEBUG_SELF_TEST_UID}`).update({
        status: targetStatus,
        lastActionTime: Date.now(),
    });
    await adminDb.ref(`connections/${DEBUG_SELF_TEST_UID}/${targetUid}`).update({
        status: reverseStatus,
        lastActionTime: Date.now(),
    });

    if (resetDelayMs) {
        setTimeout(() => {
            void adminDb.ref(`connections/${targetUid}/${DEBUG_SELF_TEST_UID}`).update({ status: "IDLE" });
            void adminDb.ref(`connections/${DEBUG_SELF_TEST_UID}/${targetUid}`).update({ status: "IDLE" });
        }, resetDelayMs);
    }
}

export async function POST(req: NextRequest) {
    const { secret, action } = (await req.json()) as { secret?: string; action?: string };
    if (secret !== DEBUG_SELF_TEST_SECRET) {
        return unauthorized();
    }

    const targetUid = await findTargetUid();
    if (!targetUid) {
        return NextResponse.json({ error: "Target user not found" }, { status: 404 });
    }

    await ensureConnection(targetUid);

    if (action === "setup") {
        return NextResponse.json({ success: true, targetUid, status: "IDLE" });
    }

    if (action === "reset") {
        await adminDb.ref(`connections/${targetUid}/${DEBUG_SELF_TEST_UID}`).update({
            status: "IDLE",
            lastActionTime: Date.now(),
        });
        await adminDb.ref(`connections/${DEBUG_SELF_TEST_UID}/${targetUid}`).update({
            status: "IDLE",
            lastActionTime: Date.now(),
        });
        return NextResponse.json({ success: true, targetUid, status: "IDLE" });
    }

    if (action === "marco") {
        await transitionStatus(targetUid, "MARCO_RECEIVED", "MARCO_SENT");
        return NextResponse.json({ success: true, targetUid, status: "MARCO_RECEIVED" });
    }

    if (action === "polo") {
        await transitionStatus(targetUid, "POLO_RECEIVED", "IDLE", 4000);
        return NextResponse.json({ success: true, targetUid, status: "POLO_RECEIVED" });
    }

    if (action === "status") {
        const snapshot = await adminDb.ref(`connections/${targetUid}/${DEBUG_SELF_TEST_UID}`).get();
        return NextResponse.json({
            success: true,
            targetUid,
            status: snapshot.exists() ? snapshot.val().status : "missing",
        });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
