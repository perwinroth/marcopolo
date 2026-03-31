"use client";

import { Friend, sendMarco, sendPolo, updateFriendTheme } from "@/lib/firebase/database";
import { Check, Heart, Circle, Hand, Palette } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";
import { cn } from "@/lib/utils";

interface FriendCardProps {
    friend: Friend;
    onUpdate: () => void;
    userUid: string;
    customMarco?: string;
    customPolo?: string;
}

export default function FriendCard({ friend, onUpdate, userUid, customMarco = "Marco?", customPolo = "Polo!" }: FriendCardProps) {
    const [isHolding, setIsHolding] = useState(false);
    const [holdProgress, setHoldProgress] = useState(0);
    const [isSending, setIsSending] = useState(false);
    const [removedMsg, setRemovedMsg] = useState("");
    const [showPalette, setShowPalette] = useState(false);
    // Individual optimistic overrides — won't get wiped by existing friend.theme
    const [localHeartColor, setLocalHeartColor] = useState<string | null>(null);
    const [localIconShape, setLocalIconShape] = useState<string | null>(null);

    const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
    const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Status mapping to UI
    const isIdle = friend.status === "IDLE";
    const sentMarco = friend.status === "MARCO_SENT";
    const receivedMarco = friend.status === "MARCO_RECEIVED";
    const receivedPolo = friend.status === "POLO_RECEIVED";
    const sosSent = friend.status === "SOS_SENT";
    const sosReceived = friend.status === "SOS_RECEIVED";

    const HOLD_DURATION = 2000; // 2 seconds to hold

    const startHolding = (e: React.MouseEvent | React.TouchEvent) => {
        // Prevent if clicking specific controls (palette button, color swatches, etc.)
        const target = e.target as HTMLElement;
        if (target.closest('.no-hold-trigger')) {
            // Don't interfere with palette interactions at all
            return;
        }
        // Prevent iOS scroll/gesture from interrupting the hold
        e.preventDefault();
        e.stopPropagation();

        if (sentMarco || receivedPolo || isSending || sosSent || sosReceived) return;

        setShowPalette(false); // Close palette when starting hold
        setIsHolding(true);
        setHoldProgress(0);

        // Progress animation
        const startTime = Date.now();
        progressIntervalRef.current = setInterval(() => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min((elapsed / HOLD_DURATION) * 100, 100);
            setHoldProgress(progress);
        }, 16); // ~60fps

        // Complete action after hold duration
        holdTimerRef.current = setTimeout(async () => {
            // Haptic Feedback (Native)
            if (Capacitor.isNativePlatform()) {
                await Haptics.impact({ style: ImpactStyle.Heavy });
            } else if (navigator.vibrate) {
                // Fallback for Web
                navigator.vibrate(200);
            }

            setIsSending(true);
            setIsHolding(false);

            // Use friend.id if available, otherwise we might fail if structure is old
            const friendUid = friend.id || friend.phone;

            if (isIdle) {
                // Send Marco
                if (friend.phone) {
                    const res = await sendMarco(userUid, friendUid, friend.phone);
                    if (!res.success && res.error === "removed") {
                        setRemovedMsg("Removed you");
                        setTimeout(() => setRemovedMsg(""), 3000);
                        setIsSending(false);
                        setHoldProgress(0);
                        return;
                    }
                } else {
                    console.error("Cannot send Marco: Missing friend phone/ID");
                    setIsSending(false);
                }
            } else if (receivedMarco) {
                // Send Polo
                const res = await sendPolo(userUid, friendUid);
                if (!res.success && res.error === "removed") {
                    setRemovedMsg("Removed you");
                    setTimeout(() => setRemovedMsg(""), 3000);
                    setIsSending(false);
                    setHoldProgress(0);
                    return;
                }
            }

            // Float away animation
            setTimeout(() => {
                setIsSending(false);
                setHoldProgress(0);
                onUpdate();
            }, 800);
        }, HOLD_DURATION);
    };

    const stopHolding = () => {
        if (holdTimerRef.current) {
            clearTimeout(holdTimerRef.current);
        }
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
        }
        setIsHolding(false);
        setHoldProgress(0);
    };

    // Name Display Logic
    // If displayName exists, use it. Otherwise formatted phone, or fallback.
    const displayName = friend.displayName || friend.phone || "Unknown";

    // Theme logic — local overrides take priority for instant feedback
    const heartColor = localHeartColor || friend.theme?.heartColor || "#e11d48";
    const iconShape = localIconShape || friend.theme?.iconShape || "hand";
    const ShapeIcon = iconShape === "circle" ? Circle : iconShape === "hand" ? Hand : Heart;
    const nameColor = localHeartColor || friend.theme?.nameColor; // Color updates both

    return (
        <div className="flex flex-col h-full">
            <div
                className={cn(
                    "relative w-full flex-1 min-h-[180px] rounded-2xl p-6 transition-all duration-500 flex flex-col items-center justify-center text-center overflow-hidden shadow-lg ring-1 ring-white/5 select-none",
                    isIdle && "bg-secondary", // Removed hover effect to reduce flicker
                    receivedMarco && "bg-primary animate-breathe shadow-primary/20",
                    sentMarco && "bg-muted/30 opacity-80",
                    receivedPolo && "bg-primary/20 ring-primary/50",
                    sosSent && "bg-destructive/30 opacity-80",
                    sosReceived && "bg-destructive animate-breathe shadow-destructive/20"
                )}
                style={receivedMarco && friend.theme ? {
                    backgroundColor: friend.theme.heartColor,
                    boxShadow: `0 0 20px ${friend.theme.heartColor}50`
                } : {}}

                // Attach interactions to the container DIV instead of a button
                onMouseDown={startHolding}
                onMouseUp={stopHolding}
                onMouseLeave={stopHolding}
                onTouchStart={startHolding}
                onTouchEnd={stopHolding}
            >
                {/* Background Ambience */}
                {receivedMarco && (
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent opacity-50 pointer-events-none" />
                )}

                {/* Shape Animation Overlay */}
                {(isHolding || isSending) && (
                    <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                        {/* Outline shape (always visible when holding) */}
                        <ShapeIcon
                            className={cn(
                                "w-32 h-32 stroke-[2]",
                                "transition-all duration-300",
                                isHolding && (iconShape === "hand" ? "animate-nudge-wiggle" : "animate-heart-outline-pulse"),
                                isSending && "animate-heart-float-away"
                            )}
                            style={{ color: heartColor, fill: isSending ? heartColor : "none" }}
                        />

                        {/* Filled shape (fills as you hold) */}
                        {isHolding && (
                            <ShapeIcon
                                className="w-32 h-32 absolute transition-all duration-75"
                                style={{
                                    color: heartColor,
                                    fill: heartColor,
                                    clipPath: `inset(${100 - holdProgress}% 0 0 0)`
                                }}
                            />
                        )}
                    </div>
                )}

                {/* Bloom-In Animation (Receiving Polo) */}
                {receivedPolo && !isHolding && !isSending && (
                    <div className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none">
                        <ShapeIcon
                            className="w-32 h-32 animate-bloom-in"
                            style={{ color: heartColor, fill: heartColor }}
                        />
                    </div>
                )}

                {/* Content Layer */}
                <div className={cn(
                    "relative z-10 space-y-4 transition-opacity duration-300 pointer-events-none",
                    (isHolding || isSending || receivedPolo) ? "opacity-20" : "opacity-100"
                )}>
                    {/* Visual Icon Area */}
                    <div className={cn(
                        "w-36 h-36 flex items-center justify-center mx-auto transition-all duration-500 transform",
                        receivedMarco && "scale-110",
                    )}>
                        {receivedPolo ? (
                            <Check className="w-28 h-28" style={{ color: heartColor }} />
                        ) : sosReceived ? (
                            <Hand className="w-32 h-32 text-red-500 animate-pulse" />
                        ) : sosSent ? (
                            <Hand className="w-28 h-28 text-red-400" />
                        ) : receivedMarco ? (
                            <ShapeIcon className="w-32 h-32 fill-white text-white animate-pulse" />
                        ) : (
                            // IDLE STATE: Show Empty Shape with custom color
                            <ShapeIcon className="w-28 h-28 transition-colors" style={{ color: isIdle ? `${heartColor}80` : heartColor }} />
                        )}
                    </div>

                    <div>
                        <h3
                            className={cn("font-semibold text-2xl tracking-tight mb-1")}
                            style={{ color: nameColor }}
                        >
                            {displayName}
                        </h3>

                        <p className={cn(
                            "text-sm font-bold uppercase tracking-[0.2em]",
                            isIdle && "text-muted-foreground",
                            receivedMarco && "text-white/90 animate-pulse",
                            sentMarco && "text-muted-foreground/70",
                            receivedPolo && "text-primary"
                        )}>
                            {removedMsg && <span className="text-red-400">{removedMsg}</span>}
                            {!removedMsg && isIdle && `Hold: ${customMarco || "Marco?"}`}
                            {!removedMsg && sentMarco && "Marco Sent ✓"}
                            {receivedMarco && `Hold: ${customPolo || "Polo!"}`}
                            {receivedPolo && "Connected 💙"}
                            {sosSent && "Help Request Sent"}
                            {sosReceived && "Needs Help"}
                        </p>
                    </div>
                </div>

                {/* Customization Button (Always visible now) */}
                {/* Palette Button */}
                <button
                    onClick={(e) => { e.stopPropagation(); setShowPalette(!showPalette); }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    className="no-hold-trigger absolute top-4 right-4 p-3 rounded-full bg-black/20 hover:bg-black/40 text-muted-foreground hover:text-white transition-all z-20 cursor-pointer"
                    style={{ touchAction: "auto" }}
                >
                    <Palette className="w-4 h-4 pointer-events-none" />
                </button>

                {/* Hold Progress Indicator (subtle ring) */}
                {isHolding && (
                    <div
                        className="absolute inset-0 rounded-2xl border-4 transition-all pointer-events-none"
                        style={{
                            borderColor: heartColor,
                            opacity: holdProgress / 100,
                            boxShadow: `0 0 ${holdProgress / 2}px ${heartColor}40`
                        }}
                    />
                )}
            </div>

            {/* Palette Fold-Down — sits below the card in normal flow */}
            {showPalette && (
                <div
                    className="no-hold-trigger bg-card/95 backdrop-blur-lg rounded-b-2xl -mt-2 pt-4 pb-3 px-4 border border-t-0 border-border/30 shadow-lg animate-in slide-in-from-top-2 fade-in duration-200"
                    style={{ touchAction: "auto" }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                >
                    {/* Color swatches */}
                    <div className="flex justify-center gap-2.5 mb-3">
                        {["#e11d48", "#ec4899", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#8b5cf6", "#ffffff"].map((color) => (
                            <button
                                key={color}
                                onClick={async () => {
                                    setLocalHeartColor(color);
                                    await updateFriendTheme(userUid, friend.id || friend.phone, { heartColor: color, nameColor: color, iconShape });
                                }}
                                className={`w-9 h-9 rounded-full border-2 transition-transform hover:scale-110 ${
                                    heartColor === color ? "border-white scale-110" : "border-transparent"
                                }`}
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                    {/* Shape toggle */}
                    <div className="flex gap-2">
                        <button
                            onClick={async () => {
                                setLocalIconShape("heart");
                                await updateFriendTheme(userUid, friend.id || friend.phone, { heartColor, nameColor: heartColor, iconShape: "heart" });
                            }}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                iconShape === "heart" ? "bg-white/15 text-white" : "text-muted-foreground hover:text-white"
                            }`}
                        >
                            <Heart className="w-3.5 h-3.5" /> Heart
                        </button>
                        <button
                            onClick={async () => {
                                setLocalIconShape("circle");
                                await updateFriendTheme(userUid, friend.id || friend.phone, { heartColor, nameColor: heartColor, iconShape: "circle" });
                            }}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                iconShape === "circle" ? "bg-white/15 text-white" : "text-muted-foreground hover:text-white"
                            }`}
                        >
                            <Circle className="w-3.5 h-3.5" /> Circle
                        </button>
                        <button
                            onClick={async () => {
                                setLocalIconShape("hand");
                                await updateFriendTheme(userUid, friend.id || friend.phone, { heartColor, nameColor: heartColor, iconShape: "hand" });
                            }}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                                iconShape === "hand" ? "bg-white/15 text-white" : "text-muted-foreground hover:text-white"
                            }`}
                        >
                            <Hand className="w-3.5 h-3.5" /> Nudge
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
