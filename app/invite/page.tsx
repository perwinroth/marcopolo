"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Hand, Loader2, LogOut, CheckCircle2, XCircle } from "lucide-react";
import { ref, set } from "firebase/database";
import { database, auth } from "@/lib/firebase/config";
import { getInvitationByToken, acceptInvitation, type Invitation } from "@/lib/firebase/invitations";
import { getCurrentUser, signOut, User } from "@/lib/firebase/auth";
import LoginScreen from "@/components/LoginScreen";

function InviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [step, setStep] = useState<"loading" | "login" | "accept" | "success" | "error">("loading");
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Get token from URL path is tricky in client component if using App Router dynamic route [token]
  // But here we are likely in app/invite/page.tsx dealing with query param or we need to parse path.
  // Actually, the file path is app/invite/page.tsx. 
  // If the user visits /invite?token=XYZ, searchParams.get('token') works.
  // If the user visits /invite/XYZ, that is handled by app/invite/[token]/page.tsx.
  // The User's file structure showed app/invite/page.tsx exists.

  // Let's assume we look for ?token=XYZ first.
  const token = searchParams.get("token");

  // Load invitation & check auth status
  useEffect(() => {
    async function init() {
      if (!token) {
        setLoading(false);
        return;
      }

      // 0. Try Deep Link (Mobile Only)
      // This attempts to open the app if installed using the custom scheme
      if (typeof window !== 'undefined') {
        const userAgent = navigator.userAgent || navigator.vendor;
        // FIX: Cast window to any to avoid MSStream TS error
        if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
          // const deepLink = `polomar://invite/${token}`;
          console.log("Checking deep link capabilities...");
          // window.location.href = deepLink; // Commented out to prevent loops for now

          // Fallback to web after a delay is tricky, usually managed by a separate script
        }
      }

      try {
        // 1. Load Invitation
        const inv = await getInvitationByToken(token);
        if (!inv) {
          setError("Invitation not found or expired.");
          setStep("error");
          setLoading(false);
          return;
        }
        setInvitation(inv);

        // 2. Check Auth
        const user = await getCurrentUser();
        setCurrentUser(user);

        if (user) {
          // If logged in, go to accept screen
          setStep("accept");
        } else {
          // If not logged in, go to login
          setStep("login");
        }

      } catch (err: any) {
        console.error("Invite Error:", err);
        setError(err.message || "Failed to load invitation.");
        setStep("error");
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [token]);

  const handleLoginSuccess = async () => {
    // Refresh user state
    const user = await getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setStep("accept");
    }
  };

  const handleAccept = async () => {
    if (!invitation || !currentUser) return;
    setLoading(true);
    try {
      // Verify phone numbers match if required (security)
      // For now, we allow any logged in user to accept? 
      // Ideally, we should warn if currentUser.phone !== invitation.inviteePhone

      await acceptInvitation(token!, currentUser.uid);
      setStep("success");

      // Redirect to dashboard after 2s
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err: any) {
      setError(err.message);
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading invitation...</p>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold mb-2">Invalid Link</h1>
          <p className="text-muted-foreground">This invitation link is missing a token.</p>
          <button onClick={() => router.push("/")} className="mt-4 text-primary hover:underline">Go Home</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-xl relative overflow-hidden">

        {/* Background blobs */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -z-10" />

        {step === "error" && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-destructive mb-2">Oops!</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <button
              onClick={() => router.push("/")}
              className="w-full py-3 bg-secondary hover:bg-secondary/80 rounded-xl font-bold transition-colors"
            >
              Back to Home
            </button>
          </div>
        )}

        {step === "login" && invitation && (
          <div>
            <div className="text-center mb-6">
              <Hand className="w-12 h-12 text-primary mx-auto mb-4 fill-primary/20" />
              <h1 className="text-2xl font-bold mb-1">You're Invited!</h1>
              <p className="text-muted-foreground">
                <span className="font-semibold text-foreground">{invitation.inviterName}</span> wants to connect on Marco Polo.
              </p>
            </div>

            <div className="bg-secondary/30 rounded-xl p-4 mb-6">
              <LoginScreen onLogin={handleLoginSuccess} />
            </div>
          </div>
        )}

        {step === "accept" && invitation && currentUser && (
          <div className="text-center py-4">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Hand className="w-10 h-10 text-primary fill-primary" />
            </div>

            <h2 className="text-2xl font-bold mb-2">Accept Invitation?</h2>
            <p className="text-muted-foreground mb-8">
              Connect with <span className="font-semibold text-foreground">{invitation.inviterName}</span> to share your status.
            </p>

            <div className="space-y-3">
              <button
                onClick={handleAccept}
                disabled={loading}
                className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-bold text-lg hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 active:scale-95 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                Accept & Connect
              </button>

              <button
                onClick={() => router.push("/")}
                className="w-full py-3 text-muted-foreground hover:text-foreground font-medium"
              >
                Cancel
              </button>
            </div>

            <p className="text-xs text-muted-foreground mt-6">
              Logged in as {currentUser.phone}
            </p>
          </div>
        )}

        {step === "success" && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-12 h-12 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-green-500 mb-2">Connected!</h2>
            <p className="text-muted-foreground">Redirecting you to the dashboard...</p>
          </div>
        )}

      </div>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InviteContent />
    </Suspense>
  )
}
