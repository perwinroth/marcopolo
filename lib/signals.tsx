"use client";

import type { CSSProperties, SVGProps } from "react";
import { Check, Hand, Heart } from "lucide-react";

export type SignalType = "heart" | "wind" | "fist" | "hand" | "sphere" | "eye" | "finger";
export type SignalState = "idle" | "hold" | "sent" | "received" | "confirmed" | "sos";

export type FriendSignalTheme = {
    signalType?: SignalType;
    signalColor?: string;
    heartColor?: string;
    nameColor?: string;
    iconShape?: string;
};

export const SIGNAL_OPTIONS: Array<{ id: SignalType; label: string }> = [
    { id: "heart", label: "Heart" },
    { id: "wind", label: "Wind" },
    { id: "fist", label: "Fist" },
    { id: "hand", label: "Hand" },
    { id: "sphere", label: "Sphere" },
    { id: "eye", label: "Eye" },
];

export const SIGNAL_COLORS = [
    "#f43f5e",
    "#fb7185",
    "#f97316",
    "#facc15",
    "#2dd4bf",
    "#38bdf8",
    "#8b5cf6",
    "#e2e8f0",
];

export const DEFAULT_SIGNAL_TYPE: SignalType = "hand";
export const DEFAULT_SIGNAL_COLOR = "#2dd4bf";

export function mapLegacyShapeToSignal(iconShape?: string): SignalType {
    if (iconShape === "circle") return "sphere";
    if (iconShape === "heart") return "heart";
    return "hand";
}

export function normalizeSignalTheme(theme?: FriendSignalTheme): Required<Pick<FriendSignalTheme, "signalType" | "signalColor" | "heartColor" | "nameColor">> {
    const rawSignalType = theme?.signalType || mapLegacyShapeToSignal(theme?.iconShape);
    const signalType = rawSignalType === "finger" ? "hand" : rawSignalType;
    const signalColor = theme?.signalColor || theme?.heartColor || DEFAULT_SIGNAL_COLOR;
    return {
        signalType,
        signalColor,
        heartColor: signalColor,
        nameColor: signalColor,
    };
}

function WindIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 128 128" fill="none" aria-hidden="true" {...props}>
            <g stroke="currentColor" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 46h54c10 0 17-6 17-14 0-7-5-12-12-12-6 0-11 4-12 10" />
                <path d="M18 66h72c10 0 18 6 18 15 0 8-6 14-14 14-7 0-12-4-13-10" />
                <path d="M30 86h34c8 0 14 4 14 10 0 5-4 8-9 8-4 0-7-2-8-6" />
            </g>
        </svg>
    );
}

function FistIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 128 128" fill="none" aria-hidden="true" {...props}>
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

function SphereIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 128 128" fill="none" aria-hidden="true" {...props}>
            <defs>
                <radialGradient id="signal-sphere-fill" cx="35%" cy="30%" r="70%">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.95" />
                    <stop offset="26%" stopColor="currentColor" stopOpacity="0.45" />
                    <stop offset="62%" stopColor="currentColor" stopOpacity="0.16" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
                </radialGradient>
            </defs>
            <circle cx="64" cy="64" r="45" fill="url(#signal-sphere-fill)" stroke="currentColor" strokeWidth="6.5" />
            <ellipse cx="48" cy="46" rx="14" ry="9" fill="rgba(255,255,255,0.32)" />
            <path d="M90 90c-6 5-15 9-25 9" stroke="rgba(255,255,255,0.34)" strokeWidth="5" strokeLinecap="round" />
        </svg>
    );
}

function EyeIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 128 128" fill="none" aria-hidden="true" {...props}>
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

function FingerIcon(props: SVGProps<SVGSVGElement>) {
    return (
        <svg viewBox="0 0 128 128" fill="none" aria-hidden="true" {...props}>
            <g stroke="currentColor" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M61 20c6 0 11 5 11 11v41" />
                <path d="M44 69c0-6 5-11 11-11h16c16 0 29 13 29 29v7c0 8-6 14-14 14H58c-8 0-14-6-14-14V69Z" />
                <path d="M58 58V42c0-6 5-11 11-11" />
                <path d="M72 63V48c0-6 5-11 11-11" />
                <path d="M52 95h31" />
            </g>
        </svg>
    );
}

export function SignalIcon({
    signal,
    className = "h-16 w-16",
    style,
}: {
    signal: SignalType | "check";
    className?: string;
    style?: CSSProperties;
}) {
    if (signal === "heart") return <Heart className={className} strokeWidth={1.9} style={style} />;
    if (signal === "wind") return <WindIcon className={className} style={style} />;
    if (signal === "fist") return <FistIcon className={className} style={style} />;
    if (signal === "hand") return <Hand className={className} strokeWidth={1.85} style={style} />;
    if (signal === "sphere") return <SphereIcon className={className} style={style} />;
    if (signal === "eye") return <EyeIcon className={className} style={style} />;
    if (signal === "finger") return <FingerIcon className={className} style={style} />;
    return <Check className={className} strokeWidth={2} style={style} />;
}
