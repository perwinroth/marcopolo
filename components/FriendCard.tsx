"use client";

import { Friend, sendMarco, sendPolo, updateFriendCardSettings } from "@/lib/firebase/database";
import { Palette } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
    DEFAULT_SIGNAL_COLOR,
    SIGNAL_COLORS,
    SIGNAL_OPTIONS,
    SignalIcon,
    type SignalType,
    normalizeSignalTheme,
} from "@/lib/signals";
import {
    endSignalHoldHaptics,
    playSignalHaptics,
    playSignalSound,
    primeSignalAudio,
    startSignalHoldHaptics,
    tickSignalHoldHaptics,
    type SignalPlaybackState,
} from "@/lib/signalAudio";
import { getFriendCardVisualState } from "@/lib/friendCardVisualState";

interface FriendCardProps {
    friend: Friend;
    onUpdate: () => void;
    userUid: string;
    customMarco?: string;
    customPolo?: string;
}

function stateLabel({
    isIdle,
    sentMarco,
    receivedMarco,
    receivedPolo,
    sosSent,
    sosReceived,
    removedMsg,
    marcoText,
    poloText,
}: {
    isIdle: boolean;
    sentMarco: boolean;
    receivedMarco: boolean;
    receivedPolo: boolean;
    sosSent: boolean;
    sosReceived: boolean;
    removedMsg: string;
    marcoText: string;
    poloText: string;
}) {
    if (removedMsg) return removedMsg;
    if (isIdle) return `Hold: ${marcoText}`;
    if (sentMarco) return "Marco Sent";
    if (receivedMarco) return `Hold: ${poloText}`;
    if (receivedPolo) return "Connected";
    if (sosSent) return "Help Request Sent";
    if (sosReceived) return "Needs Help";
    return "Ready";
}

export default function FriendCard({ friend, onUpdate, userUid, customMarco = "Marco?", customPolo = "Polo!" }: FriendCardProps) {
    const [isHolding, setIsHolding] = useState(false);
    const [holdProgress, setHoldProgress] = useState(0);
    const [isSending, setIsSending] = useState(false);
    const [removedMsg, setRemovedMsg] = useState("");
    const [showPalette, setShowPalette] = useState(false);
    const [localSignalColor, setLocalSignalColor] = useState<string | null>(null);
    const [localSignalType, setLocalSignalType] = useState<SignalType | null>(null);
    const [localMarcoText, setLocalMarcoText] = useState(friend.customMarco || customMarco);
    const [localPoloText, setLocalPoloText] = useState(friend.customPolo || customPolo);

    const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const prevStatusRef = useRef(friend.status);

    useEffect(() => {
        setLocalMarcoText(friend.customMarco || customMarco);
    }, [friend.customMarco, customMarco]);

    useEffect(() => {
        setLocalPoloText(friend.customPolo || customPolo);
    }, [friend.customPolo, customPolo]);

    const isIdle = friend.status === "IDLE";
    const sentMarco = friend.status === "MARCO_SENT";
    const receivedMarco = friend.status === "MARCO_RECEIVED";
    const receivedPolo = friend.status === "POLO_RECEIVED";
    const sosSent = friend.status === "SOS_SENT";
    const sosReceived = friend.status === "SOS_RECEIVED";

    const HOLD_DURATION = 2000;
    const displayName = friend.displayName || friend.phone || "Unknown";
    const signalTheme = normalizeSignalTheme({
        ...friend.theme,
        signalType: localSignalType || friend.theme?.signalType,
        signalColor: localSignalColor || friend.theme?.signalColor || friend.theme?.heartColor,
    });
    const signalColor = signalTheme.signalColor || DEFAULT_SIGNAL_COLOR;
    const signalType = signalTheme.signalType;
    const friendUid = friend.id || friend.phone;
    const friendMarco = friend.customMarco || localMarcoText || customMarco || "Marco?";
    const friendPolo = friend.customPolo || localPoloText || customPolo || "Polo!";
    const signalState: SignalPlaybackState | "idle" | "sos" =
        sosSent || sosReceived ? "sos" : receivedMarco ? "marco-received" : receivedPolo ? "polo-sent" : sentMarco ? "marco-sent" : "idle";
    const visualState = getFriendCardVisualState({
        signalType,
        holdProgress,
        isHolding,
        isSending,
        signalState,
        signalColor,
    });
    const iconAnimationClass = cn(
        signalType === "sphere" ? "w-32 h-32" : "w-28 h-28",
        receivedMarco && visualState.iconStateClass,
        sentMarco && visualState.marcoSentClass,
        isIdle && !isHolding && !isSending && signalType === "hand" && "animate-signal-hand-idle",
        isSending && visualState.iconStateClass
    );

    useEffect(() => {
        const previous = prevStatusRef.current;
        if (friend.status !== previous) {
            if (friend.status === "MARCO_RECEIVED") {
                void playSignalSound(signalType, "marco-received");
                void playSignalHaptics(signalType, "marco-received");
            }
            if (friend.status === "POLO_RECEIVED") {
                void playSignalSound(signalType, "polo-sent");
                void playSignalHaptics(signalType, "polo-sent");
            }
            prevStatusRef.current = friend.status;
        }
    }, [friend.status, signalType]);

    const stopHolding = () => {
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        void endSignalHoldHaptics();
        setIsHolding(false);
        setHoldProgress(0);
    };

    const saveFriendCardSettings = async (overrides?: {
        signalColor?: string;
        signalType?: SignalType;
        customMarco?: string;
        customPolo?: string;
    }) => {
        const nextSignalColor = overrides?.signalColor ?? signalColor;
        const nextSignalType = overrides?.signalType ?? signalType;
        const nextMarco = (overrides?.customMarco ?? localMarcoText).trim() || "Marco?";
        const nextPolo = (overrides?.customPolo ?? localPoloText).trim() || "Polo!";

        await updateFriendCardSettings(userUid, friendUid, {
            theme: {
                heartColor: nextSignalColor,
                nameColor: nextSignalColor,
                signalColor: nextSignalColor,
                signalType: nextSignalType,
            },
            customMarco: nextMarco,
            customPolo: nextPolo,
        });
    };

    const startHolding = (e: React.MouseEvent | React.TouchEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest(".no-hold-trigger")) return;
        e.preventDefault();
        e.stopPropagation();
        if (sentMarco || receivedPolo || isSending || sosSent || sosReceived) return;

        // Clear any in-flight hold first — iOS synthesizes a mouse event after a
        // touch, which would otherwise start a second timer and orphan the first.
        if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

        void primeSignalAudio();
        void startSignalHoldHaptics();

        setShowPalette(false);
        setIsHolding(true);
        setHoldProgress(0);

        const startTime = Date.now();
        progressIntervalRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            setHoldProgress(Math.min((elapsed / HOLD_DURATION) * 100, 100));
            void tickSignalHoldHaptics();
        }, 16);

        holdTimerRef.current = setTimeout(async () => {
            void endSignalHoldHaptics();
            const playbackState: SignalPlaybackState = isIdle ? "marco-sent" : "polo-sent";
            void playSignalSound(signalType, playbackState);
            void playSignalHaptics(signalType, playbackState);

            setIsSending(true);
            setIsHolding(false);

            if (isIdle) {
                const res = await sendMarco(userUid, friendUid, friend.phone);
                if (!res.success && res.error === "removed") {
                    setRemovedMsg("Removed you");
                    setTimeout(() => setRemovedMsg(""), 3000);
                    setIsSending(false);
                    setHoldProgress(0);
                    return;
                }
            } else if (receivedMarco) {
                const res = await sendPolo(userUid, friendUid);
                if (!res.success && res.error === "removed") {
                    setRemovedMsg("Removed you");
                    setTimeout(() => setRemovedMsg(""), 3000);
                    setIsSending(false);
                    setHoldProgress(0);
                    return;
                }
            }

            setTimeout(() => {
                setIsSending(false);
                setHoldProgress(0);
                onUpdate();
            }, 900);
        }, HOLD_DURATION);
    };

    return (
        <div className="flex flex-col h-full">
            <div
                className={cn(
                    "relative w-full flex-1 min-h-[180px] rounded-2xl p-6 transition-[box-shadow,background-color,transform] duration-200 flex flex-col items-center justify-center text-center overflow-hidden shadow-lg ring-1 ring-white/5 select-none bg-secondary",
                    receivedMarco && "ring-2 ring-white/10",
                    receivedPolo && "bg-primary/10",
                    sosSent && "bg-destructive/20 opacity-80",
                    sosReceived && "bg-destructive/80"
                )}
                style={{
                    boxShadow: receivedMarco || isHolding || isSending
                        ? `0 0 28px ${signalColor}50, inset 0 1px 0 rgba(255,255,255,0.06)`
                        : undefined,
                    borderColor: `${signalColor}30`,
                }}
                onMouseDown={startHolding}
                onMouseUp={stopHolding}
                onMouseLeave={stopHolding}
                onTouchStart={startHolding}
                onTouchEnd={stopHolding}
                onTouchCancel={stopHolding}
            >
                <div
                    className="absolute inset-0 opacity-70 pointer-events-none"
                    style={{
                        background: `radial-gradient(circle at top, ${signalColor}22, transparent 40%), radial-gradient(circle at bottom, ${signalColor}12, transparent 44%)`,
                    }}
                />

                {visualState.showBackgroundGlow && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div
                            className={cn(
                                "absolute h-24 w-24 rounded-full blur-2xl opacity-45",
                                visualState.backgroundGlowClass
                            )}
                            style={{ background: visualState.backgroundGlowColor }}
                        />
                    </div>
                )}

                <div className={cn(
                    "relative z-10 space-y-4 transition-opacity duration-300 pointer-events-none",
                    isHolding || isSending ? "opacity-100" : "opacity-100"
                )}>
                    <div className="relative w-36 h-36 flex items-center justify-center mx-auto">
                        {receivedPolo ? (
                            <div style={{ color: signalColor }}>
                                <SignalIcon signal="check" className={cn("w-28 h-28", visualState.iconStateClass)} />
                            </div>
                        ) : (
                            <div className="relative z-10">
                                {/* Base icon — dimmed while holding so the fill below reads clearly */}
                                <SignalIcon
                                    signal={signalType}
                                    className={iconAnimationClass}
                                    style={{
                                        color: signalColor,
                                        opacity: isHolding ? 0.28 : 1,
                                        filter: isHolding || isSending ? `drop-shadow(0 0 8px ${signalColor}38)` : undefined,
                                        transform: `translateZ(0) scale(${visualState.holdScale})`,
                                        transformOrigin: "center center",
                                        backfaceVisibility: "hidden",
                                        WebkitFontSmoothing: "antialiased",
                                        willChange: "transform, filter",
                                    }}
                                />
                                {/* Hold-to-send fill: reveals the bright icon bottom-to-top as you hold */}
                                {isHolding && (
                                    <div
                                        className="absolute inset-0"
                                        aria-hidden="true"
                                        style={{
                                            clipPath: `inset(${100 - holdProgress}% 0 0 0)`,
                                            transition: "clip-path 40ms linear",
                                        }}
                                    >
                                        <SignalIcon
                                            signal={signalType}
                                            className={iconAnimationClass}
                                            style={{
                                                color: signalColor,
                                                opacity: 1,
                                                filter: `drop-shadow(0 0 10px ${signalColor})`,
                                                transform: `translateZ(0) scale(${visualState.holdScale})`,
                                                transformOrigin: "center center",
                                                backfaceVisibility: "hidden",
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                        {isHolding && (
                            <>
                            <div
                                className="absolute rounded-full transition-[width,height,opacity] duration-75 blur-xl"
                                style={{
                                    width: visualState.holdAuraSize,
                                    height: visualState.holdAuraSize,
                                    background: `radial-gradient(circle, ${signalColor}22 0%, ${signalColor}10 50%, transparent 72%)`,
                                    opacity: 0.42,
                                }}
                            />
                            <div
                                className="absolute rounded-full border transition-[width,height,opacity] duration-75"
                                style={{
                                    width: visualState.holdRingSize,
                                    height: visualState.holdRingSize,
                                    borderColor: `${signalColor}40`,
                                    opacity: 0.38,
                                }}
                            />
                            </>
                        )}
                    </div>

                    <div className={cn("transition-opacity duration-200", isHolding ? "opacity-75" : "opacity-100")}>
                        <h3 className="font-semibold text-2xl tracking-tight mb-1" style={{ color: signalColor }}>
                            {displayName}
                        </h3>
                        <p className={cn(
                            "text-sm font-bold uppercase tracking-[0.2em]",
                            isIdle && "text-muted-foreground",
                            (receivedMarco || receivedPolo) && "text-white/90",
                            removedMsg && "text-red-400"
                        )}>
                            {stateLabel({
                                isIdle,
                                sentMarco,
                                receivedMarco,
                                receivedPolo,
                                sosSent,
                                sosReceived,
                                removedMsg,
                                marcoText: friendMarco,
                                poloText: friendPolo,
                            })}
                        </p>
                    </div>
                </div>

                <button
                    onClick={(e) => { e.stopPropagation(); setShowPalette(!showPalette); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className="no-hold-trigger absolute top-4 right-4 p-3 rounded-full bg-black/20 hover:bg-black/40 text-muted-foreground hover:text-white transition-all z-20 cursor-pointer"
                    style={{ touchAction: "auto" }}
                    aria-label="Edit signal"
                >
                    <Palette className="w-4 h-4 pointer-events-none" />
                </button>
            </div>

            {showPalette && (
                <div
                    className="no-hold-trigger bg-card/95 backdrop-blur-lg rounded-b-2xl -mt-2 pt-4 pb-3 px-4 border border-t-0 border-border/30 shadow-lg animate-in slide-in-from-top-2 fade-in duration-200"
                    style={{ touchAction: "auto" }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                >
                    <div className="mb-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Signal</p>
                        <div className="grid grid-cols-2 gap-2">
                            {SIGNAL_OPTIONS.map((option) => (
                                <button
                                    key={option.id}
                                    onClick={async () => {
                                        setLocalSignalType(option.id);
                                        await saveFriendCardSettings({ signalType: option.id });
                                    }}
                                    className={cn(
                                        "flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-all",
                                        signalType === option.id
                                            ? "border-white/30 bg-white/12 text-white"
                                            : "border-white/8 bg-black/10 text-muted-foreground hover:text-white"
                                    )}
                                >
                                    <SignalIcon signal={option.id} className="h-5 w-5" />
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mb-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Color</p>
                        <div className="flex flex-wrap justify-center gap-2.5">
                            {SIGNAL_COLORS.map((color) => (
                                <button
                                    key={color}
                                    onClick={async () => {
                                        setLocalSignalColor(color);
                                        await saveFriendCardSettings({ signalColor: color });
                                    }}
                                    className={cn(
                                        "w-9 h-9 rounded-full border-2 transition-transform hover:scale-110",
                                        signalColor === color ? "border-white scale-110" : "border-transparent"
                                    )}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                        <input
                            value={localMarcoText}
                            onChange={(e) => setLocalMarcoText(e.target.value)}
                            onBlur={() => void saveFriendCardSettings({ customMarco: localMarcoText })}
                            placeholder="Marco?"
                            maxLength={25}
                            className="w-full rounded-lg border border-border/50 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-muted-foreground"
                        />
                        <input
                            value={localPoloText}
                            onChange={(e) => setLocalPoloText(e.target.value)}
                            onBlur={() => void saveFriendCardSettings({ customPolo: localPoloText })}
                            placeholder="Polo!"
                            maxLength={25}
                            className="w-full rounded-lg border border-border/50 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-muted-foreground"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
