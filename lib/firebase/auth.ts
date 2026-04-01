import {
    signInWithCustomToken,
    User as FirebaseUser,
    signOut as firebaseSignOut,
    setPersistence,
    browserLocalPersistence,
    signInWithCredential,
    PhoneAuthProvider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    RecaptchaVerifier,
    signInWithPhoneNumber,
    ConfirmationResult,
} from "firebase/auth";
import { ref, set, get } from "firebase/database";
import { auth, database } from "./config";
import { decryptCustomMessage } from "../crypto/encryption";
import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

export interface User {
    uid: string;
    phone: string;
    email?: string;
    displayName?: string;
    createdAt: number;
    customMarco: string;
    customPolo: string;
    fcmToken?: string;
}

export function normalizePhoneNumber(phone: string): string {
    return phone.replace(/\D/g, "");
}

// ===== DEBUG LOG =====
function debugLog(msg: string) {
    console.log(msg);
    if (typeof window !== "undefined") {
        if (!(window as any).__debugLog) (window as any).__debugLog = [];
        (window as any).__debugLog.push(`[${new Date().toLocaleTimeString()}] ${msg}`);
        if ((window as any).__debugLog.length > 20)
            (window as any).__debugLog = (window as any).__debugLog.slice(-20);
        window.dispatchEvent(new CustomEvent("debuglog"));
    }
}

// ===== STATE =====
let verificationId: string | null = null;
let confirmationResult: ConfirmationResult | null = null;
let recaptchaVerifier: RecaptchaVerifier | null = null;

// Native auth state (REST API tokens)
let nativeIdToken: string | null = null;
let nativeRefreshToken: string | null = null;
let nativeUid: string | null = null;
let tokenRefreshTimer: ReturnType<typeof setInterval> | null = null;
let nativeSessionRestorePromise: Promise<boolean> | null = null;
let nativeTokenRefreshPromise: Promise<RefreshResult> | null = null;

const TOKEN_REFRESH_INTERVAL = 45 * 60 * 1000; // 45 minutes (tokens expire at 60min)
const SESSION_STALE_AFTER_MS = 24 * 60 * 60 * 1000;

type RefreshResult = {
    ok: boolean;
    terminal: boolean;
};

// Export native tokens for Capacitor WatchPlugin Bridge
export function getNativeTokens() {
    return {
        uid: nativeUid,
        idToken: nativeIdToken,
        refreshToken: nativeRefreshToken,
        apiKey: getApiKey(),
    };
}

// ===== NATIVE TOKEN PERSISTENCE =====
// Persists tokens securely via Capacitor Preferences so users stay logged in across app restarts

async function saveNativeTokens() {
    if (typeof window === "undefined") return;
    try {
        if (nativeIdToken && nativeRefreshToken && nativeUid) {
            await Preferences.set({ key: "mp_native_idToken", value: nativeIdToken });
            await Preferences.set({ key: "mp_native_refreshToken", value: nativeRefreshToken });
            await Preferences.set({ key: "mp_native_uid", value: nativeUid });
            await Preferences.set({ key: "mp_native_savedAt", value: Date.now().toString() });
            debugLog("PERSIST: tokens saved securely");
        }
    } catch (e) { debugLog("PERSIST: save failed: " + e); }
}

async function loadNativeTokens(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    try {
        const idTokenRes = await Preferences.get({ key: "mp_native_idToken" });
        const refreshTokenRes = await Preferences.get({ key: "mp_native_refreshToken" });
        const uidRes = await Preferences.get({ key: "mp_native_uid" });
        
        if (idTokenRes.value && refreshTokenRes.value && uidRes.value) {
            nativeIdToken = idTokenRes.value;
            nativeRefreshToken = refreshTokenRes.value;
            nativeUid = uidRes.value;
            debugLog("PERSIST: tokens restored securely");
            return true;
        }
    } catch (e) { debugLog("PERSIST: load failed: " + e); }
    return false;
}

export async function hasStoredNativeSession(): Promise<boolean> {
    if (!isNative() || typeof window === "undefined") return false;
    if (nativeUid && nativeIdToken && nativeRefreshToken) return true;

    if (nativeSessionRestorePromise) {
        return nativeSessionRestorePromise;
    }

    nativeSessionRestorePromise = loadNativeTokens().finally(() => {
        nativeSessionRestorePromise = null;
    });

    try {
        return await nativeSessionRestorePromise;
    } catch (e) {
        debugLog("PERSIST: session check failed: " + e);
        return false;
    }
}

async function clearNativeTokens() {
    if (typeof window === "undefined") return;
    try {
        await Preferences.remove({ key: "mp_native_idToken" });
        await Preferences.remove({ key: "mp_native_refreshToken" });
        await Preferences.remove({ key: "mp_native_uid" });
        await Preferences.remove({ key: "mp_native_savedAt" });
        debugLog("PERSIST: tokens cleared securely");
    } catch (e) { /* ignore */ }
}

function clearNativeSessionMemory() {
    nativeIdToken = null;
    nativeRefreshToken = null;
    nativeUid = null;
    stopProactiveTokenRefresh();
}

async function clearNativeSession() {
    clearNativeSessionMemory();
    await clearNativeTokens();
}

async function refreshNativeIdToken(): Promise<RefreshResult> {
    if (!nativeRefreshToken) return { ok: false, terminal: true };

    if (nativeTokenRefreshPromise) {
        return nativeTokenRefreshPromise;
    }

    nativeTokenRefreshPromise = (async (): Promise<RefreshResult> => {
        try {
            const apiKey = getApiKey();
            if (!apiKey) {
                debugLog("REFRESH: missing API key");
                return { ok: false, terminal: true };
            }

            debugLog("REFRESH: refreshing ID token...");
            const resp = await fetch(
                `https://securetoken.googleapis.com/v1/token?key=${apiKey}`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: `grant_type=refresh_token&refresh_token=${encodeURIComponent(nativeRefreshToken)}`,
                }
            );

            if (!resp.ok) {
                const errData = await resp.json().catch(() => null);
                const errorCode = errData?.error?.message ?? errData?.error?.errors?.[0]?.message ?? "";
                const terminal = errorCode === "INVALID_REFRESH_TOKEN" || errorCode === "TOKEN_EXPIRED" || errorCode === "USER_DISABLED";
                debugLog(`REFRESH: failed ${resp.status}${errorCode ? ` ${errorCode}` : ""}`);
                if (terminal) {
                    await clearNativeSession();
                }
                return { ok: false, terminal };
            }

            const data = await resp.json();
            nativeIdToken = data.id_token;
            nativeRefreshToken = data.refresh_token;
            nativeUid = data.user_id;
            await saveNativeTokens();
            debugLog("REFRESH: token refreshed OK ✓");
            return { ok: true, terminal: false };
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            debugLog("REFRESH: error: " + message);
            return { ok: false, terminal: false };
        } finally {
            nativeTokenRefreshPromise = null;
        }
    })();

    return nativeTokenRefreshPromise;
}

// Proactive refresh — call this after login and session restore
function startProactiveTokenRefresh() {
    if (tokenRefreshTimer) clearInterval(tokenRefreshTimer);
    tokenRefreshTimer = setInterval(async () => {
        if (nativeRefreshToken) {
            debugLog("PROACTIVE: refreshing token before expiry...");
            await refreshNativeIdToken();
        }
    }, TOKEN_REFRESH_INTERVAL);
    debugLog("PROACTIVE: token refresh timer started (every 45min)");
}

function stopProactiveTokenRefresh() {
    if (tokenRefreshTimer) {
        clearInterval(tokenRefreshTimer);
        tokenRefreshTimer = null;
    }
}

function isNative(): boolean {
    return Capacitor.isNativePlatform();
}

function getApiKey(): string {
    return (auth.app.options as any).apiKey || "";
}

function getDatabaseUrl(): string {
    return (auth.app.options as any).databaseURL || "";
}

async function fetchWithNativeAuthRetry(url: string, init?: RequestInit): Promise<Response> {
    let resp = await fetch(url, init);

    if ((resp.status === 401 || resp.status === 403) && nativeRefreshToken) {
        debugLog("DB-REST: auth failed, refreshing token and retrying...");
        const refreshResult = await refreshNativeIdToken();
        if (refreshResult.ok) {
            const retryUrl = url.replace(/([?&])auth=[^&]*/g, `$1auth=${nativeIdToken || ""}`);
            resp = await fetch(retryUrl, init);
        }
    }

    return resp;
}

async function restDbQueryByChild(path: string, child: string, value: string): Promise<Record<string, unknown> | null> {
    const dbUrl = getDatabaseUrl();
    const query = new URLSearchParams({
        auth: nativeIdToken || "",
        orderBy: JSON.stringify(child),
        equalTo: JSON.stringify(value),
    });
    const resp = await fetchWithNativeAuthRetry(`${dbUrl}/${path}.json?${query.toString()}`);
    if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`DB QUERY failed: ${resp.status} ${err}`);
    }
    return resp.json();
}

// ===== FIREBASE REST API HELPERS =====
// Bypasses JS SDK entirely — works in WKWebView

async function restDbGet(path: string): Promise<any> {
    const dbUrl = getDatabaseUrl();
    const resp = await fetchWithNativeAuthRetry(`${dbUrl}/${path}.json?auth=${nativeIdToken || ""}`);
    if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`DB GET failed: ${resp.status} ${err}`);
    }
    return resp.json();
}

async function restDbSet(path: string, data: any): Promise<void> {
    const dbUrl = getDatabaseUrl();
    const resp = await fetchWithNativeAuthRetry(`${dbUrl}/${path}.json?auth=${nativeIdToken || ""}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`DB SET failed: ${resp.status} ${err}`);
    }
}

async function restDbUpdate(path: string, data: any): Promise<void> {
    const dbUrl = getDatabaseUrl();
    const resp = await fetchWithNativeAuthRetry(`${dbUrl}/${path}.json?auth=${nativeIdToken || ""}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`DB UPDATE failed: ${resp.status} ${err}`);
    }
}

async function restDbPush(path: string, data: any): Promise<string> {
    const dbUrl = getDatabaseUrl();
    const resp = await fetchWithNativeAuthRetry(`${dbUrl}/${path}.json?auth=${nativeIdToken || ""}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`DB PUSH failed: ${resp.status} ${err}`);
    }
    return (await resp.json()).name;
}

// ===== USER HELPERS =====

async function getOrCreateUserNative(uid: string, phone: string): Promise<User> {
    debugLog("DB-REST: reading user/" + uid);
    const data = await restDbGet(`users/${uid}`);

    if (!data) {
        debugLog("DB-REST: creating new user");
        const normalizedPhone = normalizePhoneNumber(phone);
        const user: User = {
            uid,
            phone,
            createdAt: Date.now(),
            customMarco: "Marco?",
            customPolo: "Polo!",
        };
        await restDbSet(`users/${uid}`, {
            ...user,
            phoneNormalized: normalizedPhone,
        });
        return user;
    }

    debugLog("DB-REST: found existing user");
    const normalizedPhone = normalizePhoneNumber(data.phone || phone || "");
    if (normalizedPhone && data.phoneNormalized !== normalizedPhone) {
        await restDbUpdate(`users/${uid}`, { phoneNormalized: normalizedPhone });
    }
    // Decrypt custom messages (they're stored encrypted in the database)
    const { decryptCustomMessage } = await import("../crypto/encryption");
    const decryptedMarco = await decryptCustomMessage(data.customMarco || data.customMarko);
    const decryptedPolo = await decryptCustomMessage(data.customPolo);
    return {
        ...data,
        uid,
        customMarco: decryptedMarco || "Marco?",
        customPolo: decryptedPolo || "Polo!",
    };
}

async function getOrCreateUserWeb(firebaseUser: FirebaseUser): Promise<User> {
    const userRef = ref(database, `users/${firebaseUser.uid}`);
    const snapshot = await get(userRef);

    if (!snapshot.exists()) {
        const normalizedPhone = normalizePhoneNumber(firebaseUser.phoneNumber || "");
        const user: User = {
            uid: firebaseUser.uid,
            phone: firebaseUser.phoneNumber || "",
            createdAt: Date.now(),
            customMarco: "Marco?",
            customPolo: "Polo!",
        };
        await set(userRef, {
            ...user,
            phoneNormalized: normalizedPhone,
        });
        return user;
    }

    const val = snapshot.val();
    const normalizedPhone = normalizePhoneNumber(val.phone || firebaseUser.phoneNumber || "");
    if (normalizedPhone && val.phoneNormalized !== normalizedPhone) {
        await set(userRef, {
            ...val,
            phoneNormalized: normalizedPhone,
        });
    }
    const decryptedMarco = await decryptCustomMessage(val.customMarco || val.customMarko);
    const decryptedPolo = await decryptCustomMessage(val.customPolo);
    return {
        ...val,
        customMarco: decryptedMarco || "Marco?",
        customPolo: decryptedPolo || "Polo!",
    };
}

// ===== NATIVE PHONE AUTH =====

async function sendVerificationCodeNative(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
    try {
        debugLog("NATIVE: loading plugin...");
        const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
        await FirebaseAuthentication.removeAllListeners();

        const verificationPromise = new Promise<string>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("SMS timeout 60s")), 60000);

            FirebaseAuthentication.addListener("phoneCodeSent", (event) => {
                clearTimeout(timeout);
                debugLog("EVENT: phoneCodeSent ✓");
                resolve(event.verificationId);
            });

            FirebaseAuthentication.addListener("phoneVerificationCompleted" as any, (event: any) => {
                clearTimeout(timeout);
                debugLog("EVENT: autoVerified ✓");
                resolve(event?.verificationId || "__AUTO__");
            });

            FirebaseAuthentication.addListener("phoneVerificationFailed" as any, (event: any) => {
                clearTimeout(timeout);
                debugLog("EVENT: verifyFailed ✗");
                reject(new Error(event?.message || "Verification failed"));
            });
        });

        debugLog("NATIVE: signInWithPhoneNumber...");
        await FirebaseAuthentication.signInWithPhoneNumber({ phoneNumber });
        debugLog("NATIVE: waiting for event...");

        verificationId = await verificationPromise;
        debugLog("NATIVE: got verId ✓");

        await FirebaseAuthentication.removeAllListeners();
        return { success: true };
    } catch (error: any) {
        debugLog("NATIVE ERR: " + error.message);
        return { success: false, error: error.message };
    }
}

async function verifyCodeNative(code: string): Promise<{ success: boolean; user?: User; error?: string }> {
    try {
        debugLog("VERIFY: code=" + code);

        if (!verificationId) {
            return { success: false, error: "No verification in progress." };
        }

        // Step 1: Verify via REST API (always works)
        const apiKey = getApiKey();
        debugLog("REST: verifying...");

        const response = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sessionInfo: verificationId, code }),
            }
        );

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            const errMsg = errData?.error?.message || `HTTP ${response.status}`;
            debugLog("REST ERR: " + errMsg);
            return { success: false, error: errMsg };
        }

        const data = await response.json();
        debugLog("REST: auth OK! uid=" + data.localId);

        // Store tokens for database access
        nativeIdToken = data.idToken;
        nativeRefreshToken = data.refreshToken;
        nativeUid = data.localId;
        await saveNativeTokens(); // Persist for next app launch

        // Step 2: Get/create user via REST database API (bypasses JS SDK)
        debugLog("DB-REST: loading user...");
        const user = await getOrCreateUserNative(data.localId, data.phoneNumber || "");
        debugLog("DONE: login complete! ✓✓✓");

        verificationId = null;
        startProactiveTokenRefresh();
        return { success: true, user };
    } catch (error: any) {
        debugLog("VERIFY ERR: " + error.message);
        return { success: false, error: error.message };
    }
}

// ===== WEB PHONE AUTH =====

async function sendVerificationCodeWeb(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
    if (!recaptchaVerifier) {
        return { success: false, error: "reCAPTCHA not initialized. Reload page." };
    }
    try {
        await setPersistence(auth, browserLocalPersistence);
        confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
        return { success: true };
    } catch (error: any) {
        debugLog("WEB ERR: " + error.message);
        clearRecaptcha();
        return { success: false, error: error.message };
    }
}

async function verifyCodeWeb(code: string): Promise<{ success: boolean; user?: User; error?: string }> {
    if (!confirmationResult) {
        return { success: false, error: "No verification in progress" };
    }
    try {
        const result = await confirmationResult.confirm(code);
        const user = await getOrCreateUserWeb(result.user);
        return { success: true, user };
    } catch (error: any) {
        debugLog("WEB ERR: " + error.message);
        return { success: false, error: error.message };
    }
}

// ===== PUBLIC API =====

export function initializeRecaptcha(elementId: string) {
    if (isNative()) return null;
    if (!recaptchaVerifier && typeof window !== "undefined") {
        auth.useDeviceLanguage();
        recaptchaVerifier = new RecaptchaVerifier(auth, elementId, {
            size: "invisible",
            callback: () => debugLog("reCAPTCHA solved"),
            "expired-callback": () => { clearRecaptcha(); },
        });
    }
    return recaptchaVerifier;
}

export const setupRecaptcha = initializeRecaptcha;

export async function sendVerificationCode(phoneNumber: string) {
    debugLog("sendCode native=" + isNative());
    return isNative() ? sendVerificationCodeNative(phoneNumber) : sendVerificationCodeWeb(phoneNumber);
}

export async function verifyCode(code: string) {
    debugLog("verifyCode native=" + isNative());
    return isNative() ? verifyCodeNative(code) : verifyCodeWeb(code);
}

export async function signUpWithEmail(email: string, password: string, phone: string) {
    try {
        await setPersistence(auth, browserLocalPersistence);
        const result = await createUserWithEmailAndPassword(auth, email, password);
        const user = await getOrCreateUserWeb(result.user);
        const userRef = ref(database, `users/${result.user.uid}`);
        await set(userRef, {
            ...user,
            phone,
            email,
            phoneNormalized: normalizePhoneNumber(phone),
        });
        return { success: true, user: { ...user, phone, email } };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function loginWithEmail(email: string, password: string) {
    try {
        await setPersistence(auth, browserLocalPersistence);
        const result = await signInWithEmailAndPassword(auth, email, password);
        const user = await getOrCreateUserWeb(result.user);
        return { success: true, user };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getCurrentUser(): Promise<User | null> {
    // On native, check if we have REST tokens (in memory or Preferences)
    if (isNative()) {
        // Try to restore from Preferences if not in memory
        if (!nativeUid || !nativeIdToken) {
            const restored = await hasStoredNativeSession();
            if (restored) {
                debugLog("GET_USER: tokens restored from Preferences");
            }
        }
        if (nativeUid && nativeIdToken) {
            // Proactively refresh if token is likely stale (> 45 min old)
            const savedAtRes = await Preferences.get({ key: "mp_native_savedAt" }).catch(() => ({ value: null }));
            const savedAt = savedAtRes.value ? parseInt(savedAtRes.value) : 0;
            const tokenAge = Date.now() - savedAt;
            if (savedAt > 0 && tokenAge > TOKEN_REFRESH_INTERVAL) {
                debugLog("GET_USER: token is " + Math.round(tokenAge / 60000) + "min old, refreshing first...");
                const refreshResult = await refreshNativeIdToken();
                if (!refreshResult.ok && refreshResult.terminal) {
                    return null;
                }
            }

            try {
                const user = await getOrCreateUserNative(nativeUid, "");
                startProactiveTokenRefresh();
                return user;
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : "";
                const isAuthError = msg.includes("401") || msg.includes("403") || msg.includes("Permission");
                
                if (isAuthError) {
                    debugLog("GET_USER: auth error, attempting refresh...");
                    const refreshResult = await refreshNativeIdToken();
                    if (refreshResult.ok) {
                        try {
                            const user = await getOrCreateUserNative(nativeUid!, "");
                            startProactiveTokenRefresh();
                            return user;
                        } catch {
                            debugLog("GET_USER: still failing after refresh, returning stub");
                        }
                    }

                    if (refreshResult.terminal || !nativeRefreshToken || !nativeUid) {
                        debugLog("GET_USER: refresh token invalid, clearing session");
                        return null;
                    }

                    debugLog("GET_USER: preserving session despite auth error (has refresh token)");
                    return { uid: nativeUid, phone: "", customMarco: "Marco?", customPolo: "Polo!", createdAt: 0 };
                } else {
                    const hasRecentSession = savedAt > 0 && tokenAge < SESSION_STALE_AFTER_MS;
                    if (!hasRecentSession || !nativeUid) {
                        debugLog("GET_USER: non-auth error with stale session, returning null");
                        return null;
                    }
                    debugLog("GET_USER: network error, preserving session");
                    return { uid: nativeUid, phone: "", customMarco: "Marco?", customPolo: "Polo!", createdAt: 0 };
                }
            }
        }
    }
    // On web, use JS SDK
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;
    try { return await getOrCreateUserWeb(firebaseUser); } catch { return null; }
}

export async function signOut() {
    // Clear native tokens (memory + storage)
    await clearNativeSession();

    if (isNative()) {
        try {
            const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
            await Promise.race([
                FirebaseAuthentication.signOut(),
                new Promise((resolve) => setTimeout(resolve, 1500)),
            ]);
        } catch (e) { /* ignore */ }
    }
    try {
        await Promise.race([
            firebaseSignOut(auth),
            new Promise((resolve) => setTimeout(resolve, 1500)),
        ]);
    } catch (e) { /* ignore */ }
}

export function onAuthStateChanged(callback: (user: FirebaseUser | null) => void) {
    return auth.onAuthStateChanged(callback);
}

export function clearRecaptcha() {
    if (recaptchaVerifier) {
        try { recaptchaVerifier.clear(); } catch (e) { /* ignore */ }
        recaptchaVerifier = null;
    }
    confirmationResult = null;
    verificationId = null;
}

// Export REST helpers for other parts of the app that need database access on native
export function getNativeAuthToken(): string | null {
    return nativeIdToken;
}

export function getNativeUid(): string | null {
    return nativeUid;
}

export { restDbGet, restDbSet, restDbUpdate, restDbPush };
export { restDbQueryByChild };
export const __test__ = {
    setNativeSession(tokens: { idToken: string | null; refreshToken: string | null; uid: string | null }) {
        nativeIdToken = tokens.idToken;
        nativeRefreshToken = tokens.refreshToken;
        nativeUid = tokens.uid;
    },
    async refreshNativeIdToken() {
        return refreshNativeIdToken();
    },
};


export async function recoverAccountWithToken(token: string) {
    try {
        await setPersistence(auth, browserLocalPersistence);
        const result = await signInWithCustomToken(auth, token);
        
        // When using a custom token on native, we also need to trick our custom persistence
        if (isNative()) {
            // Standard JS SDK token works but our REST fetch might fail if it relies on nativeIdToken from REST
            // Actually, we can just extract the token from the user object if possible,
            // or just rely on the JS SDK for custom tokens. 
            // The REST Firebase Auth will need the STS token.
            const idToken = await result.user.getIdToken();
            const refreshToken = result.user.refreshToken;
            nativeIdToken = idToken;
            nativeRefreshToken = refreshToken;
            nativeUid = result.user.uid;
            try { await saveNativeTokens(); } catch(e) {}
        }
        
        const user = await getOrCreateUserWeb(result.user);
        return { success: true, user };
    } catch (error: any) {
        debugLog("RECOVERY LOGIN ERR: " + error.message);
        return { success: false, error: error.message };
    }
}
