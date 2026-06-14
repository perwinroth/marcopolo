"use client";

import { Check, Heart, Hand } from "lucide-react";

type MotionConcept = {
    id: string;
    title: string;
    note: string;
    icon: "heart" | "wind" | "check" | "hand" | "ball" | "fist" | "eye";
    tone: string;
    accent: string;
};

const states = [
    { id: "marco-sent", label: "Marco sent", badge: "outgoing" },
    { id: "marco-received", label: "Marco received", badge: "incoming" },
    { id: "polo-sent", label: "Polo sent", badge: "reply sent" },
] as const;

const concepts: MotionConcept[] = [
    {
        id: "liquid-hold",
        title: "Liquid Hold",
        note: "Best for press, gather, and release.",
        icon: "heart",
        tone: "Warm ember",
        accent: "accent-sunset",
    },
    {
        id: "glass-ripple",
        title: "Glass Ripple",
        note: "Best for clean outgoing motion on dark glass.",
        icon: "wind",
        tone: "Tide blue",
        accent: "accent-ocean",
    },
    {
        id: "reply-exhale",
        title: "Reply Exhale",
        note: "Best for the relief after connection lands.",
        icon: "check",
        tone: "Plum haze",
        accent: "accent-plum",
    },
    {
        id: "fist-bump",
        title: "Fist Bump",
        note: "A closed front-facing fist grows in, hits the glass, then leaves a short shake tail.",
        icon: "fist",
        tone: "Electric indigo",
        accent: "accent-indigo",
    },
    {
        id: "hand-signal",
        title: "Hand Signal",
        note: "Keeps the original human hand feeling, but cleaner and more controlled.",
        icon: "hand",
        tone: "Teal mist",
        accent: "accent-teal",
    },
    {
        id: "ball-signal",
        title: "Ball Signal",
        note: "A pure, universal shape that makes the emotional state carry the meaning.",
        icon: "ball",
        tone: "Moon glass",
        accent: "accent-moon",
    },
    {
        id: "eye-signal",
        title: "Eye Signal",
        note: "A blinking, flirtier signal with a soft wink-like close and reopen.",
        icon: "eye",
        tone: "Silver glance",
        accent: "accent-eye",
    },
];

function FistIcon() {
    return (
        <svg viewBox="0 0 128 128" className="h-16 w-16" fill="none" aria-hidden="true">
            <g stroke="currentColor" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M27 42c0-7 5-12 12-12 4 0 7 2 9 5 2-3 5-5 9-5 4 0 7 2 9 5 2-3 5-5 9-5 4 0 7 2 9 5 2-3 5-5 9-5 7 0 12 5 12 12v26c0 9-7 16-16 16H43c-9 0-16-7-16-16V42Z" />
                <path d="M45 47v23c0 7 5 12 12 12" />
                <path d="M64 47v23c0 7 5 12 12 12" />
                <path d="M83 47v23c0 7 5 12 12 12" />
                <path d="M40 84h24c6 0 11 5 11 11v2c0 4-3 7-7 7H52c-7 0-12-5-12-12V84Z" />
            </g>
        </svg>
    );
}

function WindIcon() {
    return (
        <svg viewBox="0 0 128 128" className="h-16 w-16" fill="none" aria-hidden="true">
            <g stroke="currentColor" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 46h54c10 0 17-6 17-14 0-7-5-12-12-12-6 0-11 4-12 10" />
                <path d="M18 66h72c10 0 18 6 18 15 0 8-6 14-14 14-7 0-12-4-13-10" />
                <path d="M30 86h34c8 0 14 4 14 10 0 5-4 8-9 8-4 0-7-2-8-6" />
            </g>
        </svg>
    );
}

function BallIcon() {
    return (
        <svg viewBox="0 0 128 128" className="h-24 w-24" fill="none" aria-hidden="true">
            <defs>
                <radialGradient id="ball-fill" cx="35%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                    <stop offset="26%" stopColor="rgba(255,255,255,0.45)" />
                    <stop offset="62%" stopColor="rgba(255,255,255,0.12)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0.04)" />
                </radialGradient>
            </defs>
            <circle cx="64" cy="64" r="45" fill="url(#ball-fill)" stroke="currentColor" strokeWidth="6.5" />
            <ellipse cx="48" cy="46" rx="14" ry="9" fill="rgba(255,255,255,0.32)" />
            <path d="M90 90c-6 5-15 9-25 9" stroke="rgba(255,255,255,0.34)" strokeWidth="5" strokeLinecap="round" />
        </svg>
    );
}

function EyeIcon() {
    return (
        <svg viewBox="0 0 128 128" className="h-20 w-20" fill="none" aria-hidden="true">
            <g stroke="currentColor" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M42 36l-5-8" />
                <path d="M58 31l-2-9" />
                <path d="M76 31l2-9" />
                <path d="M91 36l5-8" />
                <path d="M18 64c10-16 27-26 46-26s36 10 46 26c-10 16-27 26-46 26S28 80 18 64Z" />
                <circle cx="64" cy="64" r="14" />
                <path d="M42 64c0-12 10-22 22-22" opacity="0.45" />
            </g>
        </svg>
    );
}

function ConceptIcon({ icon }: { icon: MotionConcept["icon"] }) {
    if (icon === "heart") {
        return <Heart className="h-16 w-16" strokeWidth={1.9} />;
    }
    if (icon === "wind") {
        return <WindIcon />;
    }
    if (icon === "check") {
        return <Check className="h-16 w-16" strokeWidth={2} />;
    }
    if (icon === "hand") {
        return <Hand className="h-16 w-16" strokeWidth={1.85} />;
    }
    if (icon === "ball") {
        return <BallIcon />;
    }
    if (icon === "eye") {
        return <EyeIcon />;
    }
    if (icon === "fist") {
        return <FistIcon />;
    }

    return <Hand className="h-16 w-16" strokeWidth={1.85} />;
}

function StateCard({
    concept,
    state,
}: {
    concept: MotionConcept;
    state: typeof states[number];
}) {
    const hapticCopy =
        concept.id === "fist-bump"
            ? state.id === "marco-sent"
                ? "Haptic: one solid impact tap at contact, then two tiny shake ticks that decay immediately."
                : state.id === "marco-received"
                  ? "Haptic: a heartbeat pair first, then a firmer impact tap when the fist meets the glass."
                  : "Haptic: one crisp impact pulse with a short rattled tail, like the screen settling after contact."
            : state.id === "marco-sent"
              ? "Haptic: a single warm medium tap at release, followed by a very light tail tap."
              : state.id === "marco-received"
                ? "Haptic: a two-beat heartbeat pattern, soft then fuller, with a short pause between beats."
                : "Haptic: one crisp confirmation pulse with a gentle exhale fade, not a sharp success click.";

    return (
        <div className="state-shell">
            <div className={`state-card ${concept.id} ${concept.accent} ${state.id}`}>
                <div className="state-card-glow state-card-glow-a" />
                <div className="state-card-glow state-card-glow-b" />
                <div className="state-card-vignette" />
                <div className="state-head">
                    <span>{state.label}</span>
                    <span className="state-tone">{concept.tone}</span>
                </div>
                <div className="state-badge">{state.badge}</div>
                <div className="state-icon-wrap">
                    <div className="state-ring state-ring-one" />
                    <div className="state-ring state-ring-two" />
                    <div className="state-liquid" />
                    <div className="state-sweep" />
                    <div className="state-heartbeat" />
                    <div className="state-core" />
                    <div className="state-icon">
                        <ConceptIcon icon={concept.icon} />
                    </div>
                </div>
            </div>
            <p className="state-haptic">{hapticCopy}</p>
        </div>
    );
}

function MotionConceptCard({ concept }: { concept: MotionConcept }) {
    return (
        <article className="concept-shell">
            <div className="concept-header">
                <div>
                    <p className="concept-kicker">{concept.tone}</p>
                    <h2>{concept.title}</h2>
                </div>
                <p className="concept-note">{concept.note}</p>
            </div>
            <div className="concept-states">
                {states.map((state) => (
                    <StateCard key={state.id} concept={concept} state={state} />
                ))}
            </div>
        </article>
    );
}

export default function MotionPage() {
    return (
        <>
            <main className="min-h-screen overflow-hidden bg-[#0b1220] text-white">
                <section className="relative isolate border-b border-white/8 bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.12),_transparent_28%),radial-gradient(circle_at_80%_20%,_rgba(139,92,246,0.12),_transparent_24%),linear-gradient(180deg,_#0f172a_0%,_#0b1220_100%)] px-6 py-14 sm:px-8 lg:px-12">
                    <div className="pointer-events-none absolute inset-0 opacity-90">
                        <div className="absolute left-[8%] top-[-4rem] h-72 w-72 rounded-full bg-[#fb7185]/10 blur-3xl" />
                        <div className="absolute right-[12%] top-[9rem] h-80 w-80 rounded-full bg-[#38bdf8]/10 blur-3xl" />
                    </div>
                    <div className="relative mx-auto max-w-6xl">
                        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.34em] text-white/45">
                            Motion system preview
                        </p>
                        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-[-0.06em] text-white sm:text-6xl">
                            Each animation concept, shown across all three states.
                        </h1>
                        <p className="mt-5 max-w-3xl text-base leading-7 text-white/60 sm:text-lg">
                            Every concept below loops its own `Marco sent`, `Marco received`, and `Polo sent` state so you can judge the full interaction language before we touch production UI.
                        </p>
                    </div>
                </section>

                <section className="px-6 py-10 sm:px-8 lg:px-12">
                    <div className="mx-auto flex max-w-6xl flex-col gap-8">
                        {concepts.map((concept) => (
                            <MotionConceptCard key={concept.id} concept={concept} />
                        ))}
                    </div>
                </section>
            </main>

            <style jsx global>{`
                .concept-shell {
                    border-radius: 2rem;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    background:
                        linear-gradient(180deg, rgba(15, 23, 42, 0.88), rgba(8, 15, 30, 0.98)),
                        linear-gradient(140deg, rgba(51, 65, 85, 0.32), rgba(15, 23, 42, 0.65));
                    box-shadow:
                        0 24px 64px rgba(2, 6, 23, 0.42),
                        inset 0 1px 0 rgba(255, 255, 255, 0.06);
                    padding: 1.25rem;
                }

                .concept-header {
                    display: flex;
                    flex-direction: column;
                    gap: 0.4rem;
                    margin-bottom: 1rem;
                }

                .concept-kicker {
                    font-size: 0.7rem;
                    font-weight: 700;
                    letter-spacing: 0.22em;
                    text-transform: uppercase;
                    color: rgba(255, 255, 255, 0.45);
                }

                .concept-header h2 {
                    font-size: 1.9rem;
                    font-weight: 600;
                    letter-spacing: -0.05em;
                    color: rgba(255, 255, 255, 0.96);
                }

                .concept-note {
                    max-width: 34rem;
                    color: rgba(226, 232, 240, 0.68);
                    line-height: 1.6;
                }

                .concept-states {
                    display: grid;
                    gap: 1rem;
                    grid-template-columns: repeat(1, minmax(0, 1fr));
                }

                @media (min-width: 860px) {
                    .concept-states {
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                    }
                }

                .state-card {
                    --accent: rgba(251, 113, 133, 0.82);
                    --accent-strong: rgba(244, 114, 182, 0.94);
                    --accent-soft: rgba(251, 191, 36, 0.26);
                    position: relative;
                    min-height: 19rem;
                    overflow: hidden;
                    border-radius: 1.55rem;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    background:
                        radial-gradient(circle at top, rgba(255, 255, 255, 0.04), transparent 35%),
                        linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(8, 15, 30, 0.98));
                    box-shadow:
                        inset 0 1px 0 rgba(255, 255, 255, 0.05),
                        inset 0 -24px 60px rgba(0, 0, 0, 0.22);
                    padding: 1rem;
                }

                .state-shell {
                    display: flex;
                    flex-direction: column;
                    gap: 0.7rem;
                }

                .accent-sunset {
                    --accent: rgba(251, 146, 60, 0.86);
                    --accent-strong: rgba(244, 114, 182, 0.86);
                    --accent-soft: rgba(253, 186, 116, 0.28);
                }

                .accent-ocean {
                    --accent: rgba(45, 212, 191, 0.76);
                    --accent-strong: rgba(96, 165, 250, 0.9);
                    --accent-soft: rgba(56, 189, 248, 0.22);
                }

                .accent-plum {
                    --accent: rgba(168, 85, 247, 0.76);
                    --accent-strong: rgba(244, 114, 182, 0.82);
                    --accent-soft: rgba(196, 181, 253, 0.22);
                }

                .accent-indigo {
                    --accent: rgba(99, 102, 241, 0.82);
                    --accent-strong: rgba(56, 189, 248, 0.86);
                    --accent-soft: rgba(165, 180, 252, 0.24);
                }

                .accent-teal {
                    --accent: rgba(45, 212, 191, 0.8);
                    --accent-strong: rgba(34, 197, 94, 0.82);
                    --accent-soft: rgba(94, 234, 212, 0.22);
                }

                .accent-moon {
                    --accent: rgba(226, 232, 240, 0.74);
                    --accent-strong: rgba(148, 163, 184, 0.84);
                    --accent-soft: rgba(255, 255, 255, 0.16);
                }

                .accent-eye {
                    --accent: rgba(226, 232, 240, 0.86);
                    --accent-strong: rgba(125, 211, 252, 0.72);
                    --accent-soft: rgba(196, 181, 253, 0.18);
                }

                .accent-finger {
                    --accent: rgba(250, 204, 21, 0.8);
                    --accent-strong: rgba(251, 146, 60, 0.82);
                    --accent-soft: rgba(254, 240, 138, 0.18);
                }

                .state-card-glow {
                    position: absolute;
                    border-radius: 999px;
                    filter: blur(36px);
                    opacity: 0.9;
                }

                .state-card-glow-a {
                    left: -18%;
                    top: -10%;
                    width: 10rem;
                    height: 10rem;
                    background: radial-gradient(circle, var(--accent), transparent 72%);
                    animation: ambientDriftA 10s ease-in-out infinite;
                }

                .state-card-glow-b {
                    right: -18%;
                    top: 32%;
                    width: 10rem;
                    height: 10rem;
                    background: radial-gradient(circle, var(--accent-soft), transparent 72%);
                    animation: ambientDriftB 12s ease-in-out infinite;
                }

                .state-card-vignette {
                    position: absolute;
                    inset: 0;
                    background: radial-gradient(circle at center, transparent 28%, rgba(2, 6, 23, 0.2) 70%, rgba(2, 6, 23, 0.42) 100%);
                }

                .state-head {
                    position: relative;
                    z-index: 2;
                    display: flex;
                    justify-content: space-between;
                    gap: 1rem;
                    font-size: 0.72rem;
                    font-weight: 600;
                    letter-spacing: 0.06em;
                    color: rgba(255, 255, 255, 0.74);
                }

                .state-tone {
                    color: rgba(255, 255, 255, 0.38);
                }

                .state-badge {
                    position: relative;
                    z-index: 2;
                    margin-top: 1rem;
                    display: inline-flex;
                    width: fit-content;
                    border-radius: 999px;
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    background: linear-gradient(180deg, rgba(255, 255, 255, 0.12), rgba(148, 163, 184, 0.08));
                    padding: 0.48rem 0.8rem;
                    font-size: 0.74rem;
                    font-weight: 600;
                    color: rgba(248, 250, 252, 0.88);
                    backdrop-filter: blur(16px);
                    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
                }

                .state-icon-wrap {
                    position: relative;
                    z-index: 2;
                    display: grid;
                    place-items: center;
                    height: 12.8rem;
                }

                .state-core,
                .state-liquid,
                .state-ring,
                .state-sweep,
                .state-heartbeat {
                    position: absolute;
                }

                .state-core {
                    width: 8.3rem;
                    height: 8.3rem;
                    border-radius: 999px;
                    background:
                        radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.18), transparent 34%),
                        radial-gradient(circle at center, var(--accent) 0%, rgba(255, 255, 255, 0.06) 52%, transparent 74%);
                    box-shadow:
                        0 0 42px color-mix(in srgb, var(--accent) 52%, transparent),
                        inset 0 0 24px rgba(255, 255, 255, 0.08);
                    opacity: 0.9;
                }

                .state-liquid {
                    width: 9rem;
                    height: 9rem;
                    border-radius: 999px;
                    background:
                        radial-gradient(circle at 50% 74%, var(--accent-strong), transparent 58%),
                        radial-gradient(circle at center, rgba(255, 255, 255, 0.14), transparent 72%);
                    mix-blend-mode: screen;
                    opacity: 0;
                }

                .state-ring {
                    width: 8rem;
                    height: 8rem;
                    border-radius: 999px;
                    border: 1px solid rgba(255, 255, 255, 0.34);
                    opacity: 0;
                }

                .state-sweep {
                    width: 12rem;
                    height: 5rem;
                    border-radius: 999px;
                    background:
                        linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.58), transparent),
                        linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent) 70%, white 20%), transparent);
                    filter: blur(10px);
                    opacity: 0;
                }

                .state-heartbeat {
                    width: 6.4rem;
                    height: 6.4rem;
                    border-radius: 999px;
                    border: 2px solid rgba(255, 255, 255, 0.1);
                    opacity: 0;
                }

                .state-icon {
                    position: relative;
                    z-index: 2;
                    color: rgba(255, 255, 255, 0.97);
                    filter: drop-shadow(0 10px 28px rgba(0, 0, 0, 0.36));
                }

                .state-haptic {
                    padding: 0 0.2rem;
                    font-size: 0.84rem;
                    line-height: 1.6;
                    color: rgba(226, 232, 240, 0.64);
                }

                .marco-sent .state-core {
                    animation: outgoingPulse 3.8s ease-in-out infinite;
                }

                .marco-sent .state-ring-one {
                    animation: outgoingRing 3.8s cubic-bezier(0.22, 1, 0.36, 1) infinite;
                }

                .marco-sent .state-icon {
                    animation: outgoingIcon 3.8s ease-in-out infinite;
                }

                .marco-received .state-core {
                    animation: incomingBloom 4.2s ease-in-out infinite;
                }

                .marco-received .state-ring-one {
                    animation: incomingBloomRing 4.2s ease-out infinite;
                }

                .marco-received .state-heartbeat {
                    animation: incomingHeartbeat 4.2s ease-in-out infinite;
                }

                .marco-received .state-icon {
                    animation: incomingIcon 4.2s ease-in-out infinite;
                }

                .polo-sent .state-core {
                    animation: replyCore 4s ease-in-out infinite;
                }

                .polo-sent .state-ring-one {
                    animation: replyRipple 4s cubic-bezier(0.22, 1, 0.36, 1) infinite;
                }

                .polo-sent .state-ring-two {
                    animation: replyRipple 4s cubic-bezier(0.22, 1, 0.36, 1) infinite 0.18s;
                }

                .polo-sent .state-icon {
                    animation: replyExhale 4s cubic-bezier(0.22, 1, 0.36, 1) infinite;
                }

                .liquid-hold.marco-sent .state-liquid,
                .liquid-hold.marco-received .state-liquid,
                .liquid-hold.polo-sent .state-liquid {
                    animation: liquidFill 4.2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
                }

                .liquid-hold.polo-sent .state-heartbeat {
                    animation: endingHeartbeat 4.2s ease-in-out infinite;
                }

                .glass-ripple.marco-sent .state-sweep,
                .glass-ripple.polo-sent .state-sweep {
                    animation: glassSweep 4s ease-in-out infinite;
                }

                .glass-ripple.marco-sent .state-ring-two,
                .glass-ripple.polo-sent .state-ring-two {
                    animation: gustRing 4s ease-out infinite 0.12s;
                }

                .reply-exhale.polo-sent {
                    animation: cardExhale 4s cubic-bezier(0.22, 1, 0.36, 1) infinite;
                }

                .reply-exhale.marco-received .state-heartbeat {
                    animation: incomingHeartbeat 4.2s ease-in-out infinite;
                }

                .fist-bump .state-core {
                    animation: fistBuildCore 4.2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
                }

                .fist-bump .state-icon {
                    animation: fistBuildImpact 4.2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
                }

                .fist-bump.marco-sent .state-ring-one,
                .fist-bump.polo-sent .state-ring-one {
                    animation: outgoingRing 4.2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
                }

                .fist-bump.marco-sent .state-card-vignette,
                .fist-bump.polo-sent .state-card-vignette {
                    animation: glassShake 4.2s linear infinite;
                }

                .fist-bump.marco-received .state-heartbeat {
                    animation: incomingHeartbeat 4.2s ease-in-out infinite;
                }

                .fist-bump.marco-received {
                    animation: screenBumpCard 4.2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
                }

                .fist-bump.marco-received .state-card-vignette {
                    animation: glassShake 4.2s linear infinite;
                }

                .hand-signal.marco-sent .state-ring-one,
                .hand-signal.polo-sent .state-ring-one {
                    animation: outgoingRing 4.1s cubic-bezier(0.22, 1, 0.36, 1) infinite;
                }

                .hand-signal .state-core {
                    animation: handCore 4.1s ease-in-out infinite;
                }

                .hand-signal .state-icon {
                    animation: handNudge 4.1s cubic-bezier(0.34, 1.56, 0.64, 1) infinite;
                }

                .hand-signal.marco-received .state-heartbeat {
                    animation: incomingHeartbeat 4.1s ease-in-out infinite;
                }

                .ball-signal .state-core {
                    animation: ballFloat 4.2s ease-in-out infinite;
                }

                .ball-signal .state-icon {
                    animation: ballIcon 4.2s ease-in-out infinite;
                }

                .ball-signal.marco-sent .state-ring-one,
                .ball-signal.polo-sent .state-ring-one {
                    animation: outgoingRing 4.2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
                }

                .ball-signal.marco-received .state-heartbeat {
                    animation: incomingHeartbeat 4.2s ease-in-out infinite;
                }

                .eye-signal .state-core {
                    animation: eyeCore 4.2s ease-in-out infinite;
                }

                .eye-signal .state-icon {
                    animation: eyeBlink 4.2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
                    transform-origin: center;
                }

                .eye-signal.marco-sent .state-ring-one,
                .eye-signal.polo-sent .state-ring-one {
                    animation: outgoingRing 4.2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
                }

                .eye-signal.marco-received .state-heartbeat {
                    animation: incomingHeartbeat 4.2s ease-in-out infinite;
                }

                .finger-tap .state-core {
                    animation: fingerCore 4.2s ease-in-out infinite;
                }

                .finger-tap .state-icon {
                    animation: fingerTap 4.2s cubic-bezier(0.22, 1, 0.36, 1) infinite;
                    transform-origin: center;
                }

                .finger-tap .state-card-vignette {
                    animation: fingerGlassShake 4.2s linear infinite;
                }

                .finger-tap.marco-sent .state-ring-one,
                .finger-tap.marco-received .state-ring-one,
                .finger-tap.polo-sent .state-ring-one {
                    animation: fingerKnockRing 4.2s ease-out infinite;
                }

                .finger-tap.marco-sent .state-ring-two,
                .finger-tap.marco-received .state-ring-two,
                .finger-tap.polo-sent .state-ring-two {
                    animation: fingerKnockRing 4.2s ease-out infinite 0.12s;
                }

                @keyframes ambientDriftA {
                    0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
                    50% { transform: translate3d(14px, 16px, 0) scale(1.08); }
                }

                @keyframes ambientDriftB {
                    0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
                    50% { transform: translate3d(-14px, -12px, 0) scale(1.08); }
                }

                @keyframes outgoingPulse {
                    0%, 100% { transform: scale(0.92); opacity: 0.68; }
                    24% { transform: scale(1.08); opacity: 1; }
                    34% { transform: scale(0.96); opacity: 0.84; }
                    46% { transform: scale(1.04); opacity: 0.96; }
                    58% { transform: scale(0.9); opacity: 0.6; }
                }

                @keyframes outgoingRing {
                    0%, 24%, 100% { transform: scale(0.82); opacity: 0; }
                    34% { opacity: 0.54; }
                    68% { transform: scale(1.56); opacity: 0; }
                }

                @keyframes outgoingIcon {
                    0%, 100% { transform: scale(0.96); }
                    30% { transform: scale(1.04); }
                    46% { transform: scale(0.9); }
                }

                @keyframes incomingBloom {
                    0%, 18%, 100% { transform: scale(0.82); opacity: 0.34; filter: blur(5px); }
                    30% { transform: scale(1.12); opacity: 1; filter: blur(0); }
                    40% { transform: scale(0.98); opacity: 0.84; }
                    52% { transform: scale(1.08); opacity: 1; }
                    64% { transform: scale(1); opacity: 0.88; }
                }

                @keyframes incomingBloomRing {
                    0%, 18%, 100% { transform: scale(0.84); opacity: 0; }
                    30% { opacity: 0.42; }
                    60% { transform: scale(1.44); opacity: 0; }
                }

                @keyframes incomingHeartbeat {
                    0%, 18%, 100% { transform: scale(0.82); opacity: 0; }
                    26% { transform: scale(0.94); opacity: 0.18; }
                    34% { transform: scale(1.08); opacity: 0.32; }
                    42% { transform: scale(0.98); opacity: 0.16; }
                    50% { transform: scale(1.1); opacity: 0.28; }
                    60% { transform: scale(1.2); opacity: 0; }
                }

                @keyframes incomingIcon {
                    0%, 18%, 100% { transform: scale(0.92); }
                    34% { transform: scale(1.08); }
                    50% { transform: scale(1); }
                    60% { transform: scale(1.04); }
                }

                @keyframes replyCore {
                    0%, 100% { transform: scale(0.94); opacity: 0.72; }
                    28% { transform: scale(1.02); opacity: 0.92; }
                    44% { transform: scale(0.88); opacity: 0.58; }
                }

                @keyframes replyRipple {
                    0%, 20%, 100% { transform: scale(0.84); opacity: 0; }
                    30% { opacity: 0.52; }
                    62% { transform: scale(1.5); opacity: 0; }
                }

                @keyframes replyExhale {
                    0%, 100% { transform: translateY(0) scale(1); opacity: 0.92; }
                    30% { transform: translateY(-4px) scale(1.04); opacity: 1; }
                    48% { transform: translateY(0) scale(0.94); opacity: 0.82; }
                }

                @keyframes liquidFill {
                    0%, 16%, 100% { opacity: 0; transform: scale(0.76) translateY(24px); clip-path: inset(100% 0 0 0 round 999px); }
                    32% { opacity: 0.54; }
                    62% { opacity: 0.9; transform: scale(1.02) translateY(0); clip-path: inset(22% 0 0 0 round 999px); }
                    78% { opacity: 0.96; transform: scale(1.08) translateY(-2px); clip-path: inset(0 0 0 0 round 999px); }
                }

                @keyframes endingHeartbeat {
                    0%, 58%, 100% { transform: scale(0.84); opacity: 0; }
                    70% { transform: scale(0.96); opacity: 0.16; }
                    80% { transform: scale(1.08); opacity: 0.28; }
                    92% { transform: scale(1.18); opacity: 0; }
                }

                @keyframes glassSweep {
                    0%, 16%, 100% { opacity: 0; transform: translateX(-10rem) rotate(-14deg) scaleX(0.9); }
                    28% { opacity: 0.22; }
                    40% { opacity: 1; transform: translateX(0) rotate(-14deg) scaleX(1.06); }
                    54% { opacity: 0.8; }
                    66% { opacity: 0; transform: translateX(10rem) rotate(-14deg) scaleX(0.94); }
                }

                @keyframes cardExhale {
                    0%, 100% { transform: translateY(0); }
                    30% { transform: translateY(-4px); }
                    48% { transform: translateY(-1px); }
                }

                @keyframes fistBuildCore {
                    0%, 100% { transform: scale(0.72); opacity: 0.22; }
                    24% { transform: scale(0.88); opacity: 0.54; }
                    40% { transform: scale(1.02); opacity: 0.9; }
                    50% { transform: scale(1.18); opacity: 1; }
                    58% { transform: scale(1.02); opacity: 0.92; }
                    66% { transform: scale(0.98); opacity: 0.84; }
                }

                @keyframes fistBuildImpact {
                    0%, 100% { transform: scale(0.72) translate3d(0, 0, 0); opacity: 0.34; }
                    24% { transform: scale(0.9) translate3d(0, 2px, 0); opacity: 0.68; }
                    40% { transform: scale(1.02) translate3d(0, 0, 0); opacity: 1; }
                    50% { transform: scale(1.18) translate3d(0, -2px, 0); opacity: 1; }
                    56% { transform: scale(1.06) translate3d(0, 1px, 0); opacity: 0.96; }
                    62% { transform: scale(0.98) translate3d(0, 0, 0); opacity: 0.9; }
                }

                @keyframes screenBumpCard {
                    0%, 100% { transform: scale(1); }
                    44% { transform: scale(1); }
                    52% { transform: scale(1.025); }
                    60% { transform: scale(1); }
                }

                @keyframes glassShake {
                    0%, 52%, 100% { transform: translate3d(0, 0, 0); }
                    54% { transform: translate3d(-1px, 0, 0); }
                    56% { transform: translate3d(1px, 0, 0); }
                    58% { transform: translate3d(-1px, 0, 0); }
                    60% { transform: translate3d(1px, 0, 0); }
                    62% { transform: translate3d(0, 0, 0); }
                }

                @keyframes handCore {
                    0%, 100% { transform: scale(0.92); opacity: 0.66; }
                    28% { transform: scale(1.04); opacity: 0.96; }
                    40% { transform: scale(0.96); opacity: 0.82; }
                    52% { transform: scale(1.02); opacity: 0.9; }
                    64% { transform: scale(0.92); opacity: 0.66; }
                }

                @keyframes handNudge {
                    0%, 100% { transform: rotate(0deg) scale(0.94) translateY(0); }
                    16% { transform: rotate(-2deg) scale(0.98) translateY(-1px); }
                    26% { transform: rotate(2deg) scale(1.03) translateY(-2px); }
                    34% { transform: rotate(-8deg) scale(1.09) translateY(-4px); }
                    36% { transform: rotate(8deg) scale(1.1) translateY(-4px); }
                    38% { transform: rotate(-6deg) scale(1.09) translateY(-3px); }
                    40% { transform: rotate(6deg) scale(1.08) translateY(-3px); }
                    42% { transform: rotate(-4deg) scale(1.07) translateY(-2px); }
                    44% { transform: rotate(4deg) scale(1.06) translateY(-2px); }
                    50% { transform: rotate(1deg) scale(1.04) translateY(-2px); }
                    60% { transform: rotate(0deg) scale(1.01) translateY(-1px); }
                    74% { transform: rotate(0deg) scale(0.98) translateY(0); }
                    86% { transform: rotate(0deg) scale(0.95) translateY(0); }
                }

                @keyframes gustRing {
                    0%, 24%, 100% { transform: scale(0.88); opacity: 0; }
                    36% { opacity: 0.42; }
                    72% { transform: scale(1.72); opacity: 0; }
                }

                @keyframes ballFloat {
                    0%, 100% { transform: translateY(0) scale(0.95); opacity: 0.76; }
                    28% { transform: translateY(-5px) scale(1.04); opacity: 1; }
                    48% { transform: translateY(0) scale(0.92); opacity: 0.72; }
                }

                @keyframes ballIcon {
                    0%, 100% { transform: scale(0.94); }
                    28% { transform: scale(1.03); }
                    48% { transform: scale(0.9); }
                }

                @keyframes eyeCore {
                    0%, 100% { transform: scale(0.94); opacity: 0.72; }
                    28% { transform: scale(1.04); opacity: 0.94; }
                    44% { transform: scale(0.98); opacity: 0.82; }
                    58% { transform: scale(1.02); opacity: 0.9; }
                }

                @keyframes eyeBlink {
                    0%, 100% { transform: scaleY(1) scaleX(1); }
                    28% { transform: scaleY(1) scaleX(1.02); }
                    36% { transform: scaleY(0.14) scaleX(1.04); }
                    44% { transform: scaleY(1) scaleX(1); }
                }

                @keyframes fingerCore {
                    0%, 100% { transform: scale(0.92); opacity: 0.66; }
                    22% { transform: scale(1); opacity: 0.84; }
                    34% { transform: scale(1.04); opacity: 0.94; }
                    46% { transform: scale(1.06); opacity: 1; }
                    62% { transform: scale(0.98); opacity: 0.76; }
                }

                @keyframes fingerTap {
                    0%, 100% { transform: scale(0.9) translateY(6px); }
                    22% { transform: scale(1) translateY(0); }
                    30% { transform: scale(1.03) translateY(-2px); }
                    34% { transform: scale(1.08) translateY(-8px); }
                    38% { transform: scale(1.02) translateY(-1px); }
                    42% { transform: scale(1.08) translateY(-8px); }
                    46% { transform: scale(1.02) translateY(-1px); }
                    50% { transform: scale(1.08) translateY(-8px); }
                    58% { transform: scale(1) translateY(0); }
                    72% { transform: scale(0.96) translateY(3px); }
                }

                @keyframes fingerKnockRing {
                    0%, 30%, 100% { transform: scale(0.86); opacity: 0; }
                    34% { opacity: 0.42; }
                    44% { transform: scale(1.18); opacity: 0; }
                    46% { opacity: 0.36; }
                    56% { transform: scale(1.3); opacity: 0; }
                    58% { opacity: 0.28; }
                    68% { transform: scale(1.42); opacity: 0; }
                }

                @keyframes fingerGlassShake {
                    0%, 33%, 100% { transform: translate3d(0, 0, 0); }
                    35% { transform: translate3d(-1px, 0, 0); }
                    37% { transform: translate3d(1px, 0, 0); }
                    43% { transform: translate3d(-1px, 0, 0); }
                    45% { transform: translate3d(1px, 0, 0); }
                    51% { transform: translate3d(-1px, 0, 0); }
                    53% { transform: translate3d(1px, 0, 0); }
                    57% { transform: translate3d(0, 0, 0); }
                }
            `}</style>
        </>
    );
}
