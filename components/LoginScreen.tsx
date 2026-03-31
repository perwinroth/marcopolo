"use client";

import { useState, useEffect, useRef } from "react";
import { setupRecaptcha, sendVerificationCode, verifyCode, clearRecaptcha, recoverAccountWithToken } from "@/lib/firebase/auth";
import { updateUserName } from "@/lib/firebase/database";
import { callFunction } from "@/lib/firebase/functions";
import { Phone, ArrowRight, Lock, Loader2, ShieldCheck, RefreshCw, User } from "lucide-react";
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import "@/app/phone-input.css";
import { Capacitor } from "@capacitor/core";

interface LoginScreenProps {
    onLogin: () => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
    const [step, setStep] = useState<"PHONE" | "OTP" | "NAME" | "RECOVERY_EMAIL" | "RECOVERY_OTP">("PHONE");
    const [phoneNumber, setPhoneNumber] = useState<string | undefined>("");
    const [recoveryEmail, setRecoveryEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [name, setName] = useState("");
    const [userId, setUserId] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [isNativePlatform, setIsNativePlatform] = useState(false);

    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        const native = Capacitor.isNativePlatform();
        setIsNativePlatform(native);

        // Platform init complete

        if (!native) {
            const initRecaptcha = async () => {
                await new Promise(resolve => setTimeout(resolve, 500));
                if (!isMounted.current) return;
                const container = document.getElementById("recaptcha-container");
                if (container) {
                    try {
                        clearRecaptcha();
                        setupRecaptcha("recaptcha-container");
                    } catch (err) {
                        console.error("Recaptcha init error:", err);
                    }
                }
            };
            initRecaptcha();
        }

        return () => {
            isMounted.current = false;
            if (!native) clearRecaptcha();
        };
    }, []);

    const handleSendCode = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setError("");

        if (!phoneNumber || phoneNumber.length < 5) {
            setError("Please enter a valid mobile number.");
            return;
        }

        setIsLoading(true);
        try {
            if (!isNativePlatform) {
                setupRecaptcha("recaptcha-container");
            }

            const result = await sendVerificationCode(phoneNumber);
            if (result.success) {
                setStep("OTP");
            } else {
                setError(result.error || "Failed to send code. Try again.");
                if (!isNativePlatform) {
                    setTimeout(() => {
                        clearRecaptcha();
                        setupRecaptcha("recaptcha-container");
                    }, 1000);
                }
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "An error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSendRecoveryEmail = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setError("");
        if (!recoveryEmail || !recoveryEmail.includes("@")) {
            setError("Please enter a valid email address");
            return;
        }
        setIsLoading(true);
        try {
            const data = await callFunction<{ success: boolean; error?: string }>("sendRecoveryCode", {
                withAuth: false,
                body: { email: recoveryEmail.trim() },
            });
            if (data.success) {
                setStep("RECOVERY_OTP");
            } else {
                setError(data.error || "Failed to send recovery code");
            }
        } catch (err) {
            setError("Failed to reach server");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyRecoveryCode = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setError("");
        if (otp.length < 6) return;
        setIsLoading(true);
        try {
            const data = await callFunction<{ success: boolean; token?: string; error?: string }>("verifyRecoveryCode", {
                withAuth: false,
                body: { email: recoveryEmail.trim(), code: otp },
            });
            if (data.success && data.token) {
                const loginRes = await recoverAccountWithToken(data.token);
                if (loginRes.success && loginRes.user) {
                    if (loginRes.user.displayName) {
                        onLogin();
                    } else {
                        setUserId(loginRes.user.uid);
                        setStep("NAME");
                    }
                } else {
                    setError(loginRes.error || "Failed to log in with recovery token");
                }
            } else {
                setError(data.error || "Invalid or expired recovery code");
            }
        } catch (err) {
            setError("Failed to verify recovery code");
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyCode = async (e?: React.FormEvent) => {
        e?.preventDefault();
        setError("");
        setIsLoading(true);

        try {
            const result = await verifyCode(otp);
            if (result.success && result.user) {
                if (result.user.displayName) {
                    onLogin();
                } else {
                    setUserId(result.user.uid);
                    setStep("NAME");
                }
            } else {
                setError(result.error || "Invalid code.");
            }
        } catch (err: any) {
            setError(err.message || "Verification failed.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveName = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!name.trim()) return;

        setIsLoading(true);
        try {
            await updateUserName(userId, name.trim());
            onLogin();
        } catch (err) {
            console.error(err);
            setError("Failed to save name.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center animate-in fade-in zoom-in duration-500 relative overflow-hidden">

            {/* Background Ambience */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/20 blur-[100px] rounded-full -z-10" />

            <div className="mb-12 relative z-10">
                <h1 className="relative text-7xl font-black tracking-tighter bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent drop-shadow-sm">
                    MARCO
                    <br />
                    POLO
                </h1>
                <div className="h-1 w-24 bg-primary mx-auto mt-4 rounded-full" />
            </div>

            <div className="w-full max-w-sm space-y-6 relative z-10">

                {/* Step 1: Phone Number */}
                {step === "PHONE" && (
                    <form onSubmit={handleSendCode} className="space-y-4 animate-in slide-in-from-right duration-300">
                        <div className="text-left mb-6">
                            <h2 className="text-xl font-bold mb-1">Welcome</h2>
                            <p className="text-muted-foreground text-sm">Enter your mobile number to continue.</p>
                        </div>

                        <div className="relative group dark-phone-input">
                            <PhoneInput
                                placeholder="Enter phone number"
                                value={phoneNumber}
                                onChange={setPhoneNumber}
                                defaultCountry="SE"
                                international
                                countryCallingCodeEditable={false}
                                className="w-full"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !phoneNumber || phoneNumber.length < 5}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-primary/20"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : "Send Code"}
                            {!isLoading && <ArrowRight className="w-5 h-5" />}
                        </button>

                        <p className="text-xs text-muted-foreground/60 mt-4">
                            Standard message and data rates may apply.
                        </p>

                        <button type="button" onClick={() => { setStep("RECOVERY_EMAIL"); setError(""); setOtp(""); }} className="text-sm text-primary hover:underline block mx-auto mt-6">
                            Lost your phone? Recover account
                        </button>
                    </form>
                )}

                {/* Step 2: OTP */}
                {step === "OTP" && (
                    <form onSubmit={handleVerifyCode} className="space-y-4 animate-in slide-in-from-right duration-300">
                        <div className="text-left mb-6">
                            <h2 className="text-xl font-bold mb-1">Verify Number</h2>
                            <p className="text-muted-foreground text-sm">
                                Enter the 6-digit code sent to <br />
                                <span className="text-foreground font-mono font-bold">{phoneNumber}</span>
                            </p>
                        </div>

                        <div className="relative group">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="123456"
                                maxLength={6}
                                className="w-full bg-secondary/50 border border-border/50 rounded-2xl px-12 py-4 text-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/30 font-mono tracking-[0.5em] text-center"
                                value={otp}
                                onChange={(e) => {
                                    setOtp(e.target.value.replace(/\D/g, ''));
                                    setError("");
                                }}
                                autoFocus
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || otp.length < 6}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-primary/20"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : "Verify & Login"}
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                setStep("PHONE");
                                setOtp("");
                                setError("");
                            }}
                            className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 mx-auto mt-4"
                        >
                            <RefreshCw className="w-3 h-3" /> Change Number
                        </button>
                    </form>
                )}

                {/* Step: Recovery Email */}
                {step === "RECOVERY_EMAIL" && (
                    <form onSubmit={handleSendRecoveryEmail} className="space-y-4 animate-in slide-in-from-right duration-300">
                        <div className="text-left mb-6">
                            <h2 className="text-xl font-bold mb-1">Recover Account</h2>
                            <p className="text-muted-foreground text-sm">Enter your recovery email.</p>
                        </div>
                        <div className="relative group">
                            <input
                                type="email"
                                placeholder="name@example.com"
                                className="w-full bg-secondary/50 border border-border/50 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/30"
                                value={recoveryEmail}
                                onChange={(e) => { setRecoveryEmail(e.target.value); setError(""); }}
                                autoFocus
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading || !recoveryEmail.includes("@")}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-primary/20"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : "Send Code"}
                            {!isLoading && <ArrowRight className="w-5 h-5" />}
                        </button>
                        <button type="button" onClick={() => { setStep("PHONE"); setError(""); }} className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 mx-auto mt-4">
                            <RefreshCw className="w-3 h-3" /> Back to Login
                        </button>
                    </form>
                )}

                {/* Step: Recovery OTP */}
                {step === "RECOVERY_OTP" && (
                    <form onSubmit={handleVerifyRecoveryCode} className="space-y-4 animate-in slide-in-from-right duration-300">
                        <div className="text-left mb-6">
                            <h2 className="text-xl font-bold mb-1">Verify Email</h2>
                            <p className="text-muted-foreground text-sm">
                                Enter the 6-digit code sent to <br />
                                <span className="text-foreground font-mono font-bold">{recoveryEmail}</span>
                            </p>
                        </div>
                        <div className="relative group">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="123456"
                                maxLength={6}
                                className="w-full bg-secondary/50 border border-border/50 rounded-2xl px-12 py-4 text-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/30 font-mono tracking-[0.5em] text-center"
                                value={otp}
                                onChange={(e) => { setOtp(e.target.value.replace(/\D/g, '')); setError(""); }}
                                autoFocus
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isLoading || otp.length < 6}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-primary/20"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : "Verify & Login"}
                        </button>
                        <button type="button" onClick={() => { setStep("RECOVERY_EMAIL"); setOtp(""); setError(""); }} className="text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-2 mx-auto mt-4">
                            <RefreshCw className="w-3 h-3" /> Change Email
                        </button>
                    </form>
                )}

                {/* Step 3: Name */}
                {step === "NAME" && (
                    <form onSubmit={handleSaveName} className="space-y-4 animate-in slide-in-from-right duration-300">
                        <div className="text-left mb-6">
                            <h2 className="text-xl font-bold mb-1">One last thing</h2>
                            <p className="text-muted-foreground text-sm">What should your friends call you?</p>
                        </div>

                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <input
                                type="text"
                                placeholder="Your Name"
                                className="w-full bg-secondary/50 border border-border/50 rounded-2xl px-12 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all placeholder:text-muted-foreground/30"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoFocus
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading || !name.trim()}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg py-4 rounded-2xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-primary/20"
                        >
                            {isLoading ? <Loader2 className="animate-spin" /> : "Get Started"}
                            {!isLoading && <ArrowRight className="w-5 h-5" />}
                        </button>
                    </form>
                )}

                {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm font-medium animate-in slide-in-from-bottom-2">
                        {error}
                    </div>
                )}
            </div>

            {/* Invisible reCAPTCHA container - web only */}
            {!isNativePlatform && <div id="recaptcha-container"></div>}
        </div>
    );
}
