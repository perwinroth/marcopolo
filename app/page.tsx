"use client";

import { useEffect, useState } from "react";
import LoginScreen from "@/components/LoginScreen";
import Dashboard from "@/components/Dashboard";
import { getCurrentUser, onAuthStateChanged, User, getNativeTokens } from "@/lib/firebase/auth";
import { Capacitor } from "@capacitor/core";

export default function Home() {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [startupMessage, setStartupMessage] = useState("Opening Marco Polo");

    const syncWatchCredentials = (uid: string, idToken: string, refreshToken?: string | null, apiKey?: string | null) => {
        void import("@/lib/watch/plugin")
            .then(({ default: WatchPlugin }) =>
                WatchPlugin.updateApplicationContext({
                    uid,
                    token: idToken,
                    refreshToken: refreshToken || undefined,
                    apiKey: apiKey || undefined,
                })
            )
            .then(() => console.log("⌚ Watch sync: credentials sent!"))
            .catch((error: unknown) => {
                console.warn("⌚ Watch sync failed:", error);
            });
    };

    useEffect(() => {
        console.log("🔍 Home Effect Started");
        let isMounted = true;

        if (Capacitor.isNativePlatform()) {
            const timeout = setTimeout(() => {
                if (!isMounted) return;
                console.warn("⚠️ Auth Timeout: Forcing stop loading");
                setStartupMessage("Almost there");
                setIsLoading(false);
            }, 4000);

            void (async () => {
                try {
                    setStartupMessage("Restoring your session");
                    const userData = await getCurrentUser();
                    if (!isMounted) return;

                    if (userData) {
                        console.log("✅ Native session restored");
                        const tokens = getNativeTokens();
                        if (tokens.uid && tokens.idToken) {
                            syncWatchCredentials(tokens.uid, tokens.idToken, tokens.refreshToken, tokens.apiKey);
                        }
                        setUser(userData);
                    } else {
                        setStartupMessage("Ready to sign in");
                        setUser(null);
                    }
                } catch (error) {
                    console.log("Native restore failed:", error);
                    if (!isMounted) return;
                    setStartupMessage("Ready to sign in");
                    setUser(null);
                } finally {
                    clearTimeout(timeout);
                    if (isMounted) {
                        setIsLoading(false);
                    }
                }
            })();

            return () => {
                isMounted = false;
                clearTimeout(timeout);
            };
        }

        const unsubscribe = onAuthStateChanged(async (firebaseUser) => {
            console.log("👤 Auth State Changed:", firebaseUser ? "LOGGED IN" : "LOGGED OUT");

            if (firebaseUser) {
                console.log("fetching user data...");
                setStartupMessage("Loading your circle");
                try {
                    const userData = await getCurrentUser();
                    if (!isMounted) return;
                    console.log("User Data result:", userData ? "FOUND" : "NULL");
                    setUser(userData);

                    if (userData) {
                        const tokens = getNativeTokens();
                        if (tokens.uid && tokens.idToken) {
                            syncWatchCredentials(tokens.uid, tokens.idToken, tokens.refreshToken, tokens.apiKey);
                        }
                    }
                } catch (e) {
                    console.error("Error fetching user:", e);
                }
            } else {
                setStartupMessage("Ready to sign in");
                setUser(null);
            }
            setIsLoading(false);
        });

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, []);

    const checkUser = async () => {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        setIsLoading(false);
        
        // Push credentials to Watch immediately upon manual user login
        if (currentUser) {
            const tokens = getNativeTokens();
            if (tokens.uid && tokens.idToken) {
                syncWatchCredentials(tokens.uid, tokens.idToken, tokens.refreshToken, tokens.apiKey);
            }
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center px-6">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.18),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(13,148,136,0.22),_transparent_42%)]" />
                <div className="absolute top-1/2 left-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
                <div className="relative z-10 w-full max-w-sm text-center">
                    <div className="inline-flex items-center justify-center h-20 w-20 rounded-[28px] border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl shadow-primary/10 mb-6">
                        <div className="h-10 w-10 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                    </div>
                    <h1 className="text-4xl font-black tracking-[-0.08em] text-white">
                        MARCO
                        <br />
                        <span className="text-white/70">POLO</span>
                    </h1>
                    <p className="mt-4 text-sm font-medium tracking-[0.2em] uppercase text-primary/90">
                        {startupMessage}
                    </p>
                    <div className="mt-6 h-px w-24 mx-auto bg-gradient-to-r from-transparent via-primary/70 to-transparent" />
                </div>
            </div>
        );
    }

    if (!user) {
        return <LoginScreen onLogin={checkUser} />;
    }

    return <Dashboard user={user} />;
}
