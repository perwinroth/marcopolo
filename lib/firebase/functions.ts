"use client";

import { auth } from "./config";
import { getNativeAuthToken } from "./auth";

const region = "europe-west1";

function getProjectId(): string {
    return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";
}

export function getFunctionUrl(name: string): string {
    return `https://${region}-${getProjectId()}.cloudfunctions.net/${name}`;
}

export async function getAuthBearerToken(): Promise<string> {
    const nativeToken = getNativeAuthToken();
    if (nativeToken) return nativeToken;

    const currentUser = auth.currentUser;
    if (!currentUser) {
        throw new Error("Not authenticated");
    }

    return currentUser.getIdToken();
}

export async function callFunction<TResponse>(
    name: string,
    init: {
        body?: unknown;
        headers?: Record<string, string>;
        method?: "POST";
        withAuth?: boolean;
    } = {}
): Promise<TResponse> {
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...init.headers,
    };

    if (init.withAuth !== false) {
        headers.Authorization = `Bearer ${await getAuthBearerToken()}`;
    }

    const response = await fetch(getFunctionUrl(name), {
        method: init.method || "POST",
        headers,
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });

    const payload = (await response.json().catch(() => ({}))) as TResponse & { error?: string };
    if (!response.ok) {
        throw new Error(payload.error || `Function ${name} failed with ${response.status}`);
    }

    return payload;
}
