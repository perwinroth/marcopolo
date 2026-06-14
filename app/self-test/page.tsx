"use client";

import { useState } from "react";

type ActionState = "idle" | "working" | "done" | "error";
const TARGET_PHONE = "+46760366102";

export default function SelfTestPage() {
    const [secret, setSecret] = useState("");
    const [status, setStatus] = useState("No action run yet.");
    const [connectionStatus, setConnectionStatus] = useState("unknown");
    const [actionState, setActionState] = useState<ActionState>("idle");

    const run = async (action: string, label: string) => {
        setActionState("working");
        setStatus(`${label}...`);
        try {
            const response = await fetch("/api/self-test", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ secret, action }),
            });
            const data = await response.json();
            if (!response.ok) {
                setActionState("error");
                setStatus(data.error || `${label} failed.`);
                return;
            }
            if (data.status) setConnectionStatus(data.status);
            setActionState("done");
            setStatus(`${label} complete.`);
        } catch (error) {
            console.error(error);
            setActionState("error");
            setStatus(`${label} failed.`);
        }
    };

    return (
        <main className="min-h-screen bg-[#0b1220] px-6 py-16 text-white">
            <div className="mx-auto max-w-4xl">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-white/45">
                    Self test admin
                </p>
                <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] sm:text-6xl">
                    Drive Marco and Polo against a fake contact.
                </h1>
                <p className="mt-5 max-w-3xl text-base leading-7 text-white/60 sm:text-lg">
                    This page is admin-gated by a secret and targets only <span className="text-white">{TARGET_PHONE}</span>.
                </p>

                <div className="mt-10 rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(8,15,30,0.98))] p-6 shadow-[0_24px_64px_rgba(2,6,23,0.42)]">
                    <label className="block">
                        <span className="text-sm font-semibold uppercase tracking-[0.18em] text-white/45">Secret</span>
                        <input
                            type="password"
                            value={secret}
                            onChange={(e) => setSecret(e.target.value)}
                            placeholder="Enter admin secret"
                            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/28"
                        />
                    </label>

                    <div className="mt-8 grid gap-3 sm:grid-cols-2">
                        <button
                            onClick={() => void run("setup", "Creating fake contact")}
                            className="rounded-2xl border border-white/10 bg-white/8 px-4 py-4 text-left transition hover:bg-white/12"
                        >
                            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-white/50">Setup</div>
                            <div className="mt-2 text-xl font-semibold tracking-[-0.03em]">Create Fake Contact</div>
                            <div className="mt-1 text-sm text-white/60">Creates or refreshes `Self Test` for the target phone.</div>
                        </button>

                        <button
                            onClick={() => void run("reset", "Resetting self-test contact")}
                            className="rounded-2xl border border-white/10 bg-white/8 px-4 py-4 text-left transition hover:bg-white/12"
                        >
                            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-white/50">Reset</div>
                            <div className="mt-2 text-xl font-semibold tracking-[-0.03em]">Reset To Idle</div>
                            <div className="mt-1 text-sm text-white/60">Puts the fake contact back in the idle state.</div>
                        </button>

                        <button
                            onClick={() => void run("marco", "Triggering incoming Marco")}
                            className="rounded-2xl border border-white/10 bg-white/8 px-4 py-4 text-left transition hover:bg-white/12"
                        >
                            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-white/50">Trigger</div>
                            <div className="mt-2 text-xl font-semibold tracking-[-0.03em]">Incoming Marco</div>
                            <div className="mt-1 text-sm text-white/60">Makes `Self Test` send a Marco to the target number.</div>
                        </button>

                        <button
                            onClick={() => void run("polo", "Triggering Polo confirmation")}
                            className="rounded-2xl border border-white/10 bg-white/8 px-4 py-4 text-left transition hover:bg-white/12"
                        >
                            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-white/50">Trigger</div>
                            <div className="mt-2 text-xl font-semibold tracking-[-0.03em]">Polo Received</div>
                            <div className="mt-1 text-sm text-white/60">Forces the fake contact into the Polo confirmation state.</div>
                        </button>
                    </div>

                    <button
                        onClick={() => void run("status", "Refreshing status")}
                        className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-black/30"
                    >
                        Refresh Status
                    </button>

                    <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/72">
                        {status}
                    </div>

                    <div className="mt-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/72">
                        Fake contact status: <span className="font-semibold text-white">{connectionStatus}</span>
                    </div>

                    {actionState === "working" && <p className="mt-3 text-sm text-white/45">Working...</p>}
                </div>
            </div>
        </main>
    );
}
