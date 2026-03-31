"use client";

import { useState, useRef, useEffect } from "react";
import { AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmergencyButtonProps {
  onEmergency: () => Promise<void>;
  disabled?: boolean;
}

export default function EmergencyButton({ onEmergency, disabled }: EmergencyButtonProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const PRESS_DURATION = 2000; // 2 seconds

  const handlePressStart = () => {
    if (disabled || isSending) return;

    setIsPressed(true);
    setProgress(0);

    // Progress animation
    const startTime = Date.now();
    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / PRESS_DURATION) * 100, 100);
      setProgress(newProgress);
    }, 16); // ~60fps

    // Show confirmation after hold duration
    pressTimerRef.current = setTimeout(() => {
      setIsPressed(false);
      setShowConfirm(true);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    }, PRESS_DURATION);
  };

  const handlePressEnd = () => {
    setIsPressed(false);
    setProgress(0);
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
  };

  const handleConfirmHelp = async () => {
    setIsSending(true);
    try {
      await onEmergency();
      setShowConfirm(false);
      // Show success feedback
      setTimeout(() => setIsSending(false), 3000);
    } catch (error) {
      console.error("Error sending help request:", error);
      setIsSending(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  if (isSending) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-destructive/90 backdrop-blur-md text-white px-6 py-4 rounded-full shadow-2xl animate-pulse">
        <p className="font-medium tracking-wide">Help request sent to all connections</p>
      </div>
    );
  }

  return (
    <>
      {/* Emergency Button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <button
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressEnd}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          disabled={disabled || isSending}
          className={cn(
            "relative w-20 h-20 rounded-full bg-destructive hover:bg-destructive/90 shadow-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center group",
            isPressed && "scale-110 shadow-destructive/50"
          )}
        >
          {/* Progress ring */}
          {isPressed && (
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="3"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeDasharray={`${progress * 2.827} 282.7`}
                className="transition-all duration-75"
              />
            </svg>
          )}

          <div className="relative z-10 text-center">
            <AlertCircle className="w-8 h-8 text-white mx-auto mb-0.5" />
            <span className="text-[10px] font-bold text-white uppercase tracking-wider">HELP</span>
          </div>
        </button>

        {!isPressed && !showConfirm && (
          <p className="text-center text-xs text-muted-foreground mt-2 font-medium tracking-wide">
            HOLD FOR 2 SEC
          </p>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-card border border-destructive/50 rounded-2xl p-6 shadow-2xl mx-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3 mb-4">
              <div className="bg-destructive/20 rounded-full p-2">
                <AlertCircle className="w-6 h-6 text-destructive" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold tracking-tight mb-1">Need Help</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This will send an urgent notification to all your connections letting them know you need help right now.
                </p>
              </div>
              <button
                onClick={() => setShowConfirm(false)}
                className="p-1 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 text-sm font-medium hover:bg-muted rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmHelp}
                className="flex-1 bg-destructive hover:bg-destructive/90 text-white text-sm font-bold py-3 rounded-lg transition-all tracking-wide shadow-lg shadow-destructive/25 active:scale-95"
              >
                Send Help Request
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
