"use client";

import { useEffect, useState, useRef } from "react";
import { signOut, User } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import { initNativeNotifications } from "@/lib/firebase/nativeNotifications";
import AddFriendModal from "./AddFriendModal";
import FriendCard from "./FriendCard";
import SettingsModal from "./SettingsModal";
import { Friend, getConnections, subscribeToConnections, updateCustomMessages, getPendingRequests, acceptFriendRequest, rejectFriendRequest, FriendRequest, sendEmergencySOS, removeConnection } from "@/lib/firebase/database";
import { Settings, LogOut, Plus, UserPlus, Users, Bell, HandHelping, RefreshCw, Loader2 } from "lucide-react";
import FriendRequestNotification from "./FriendRequestNotification";
import NotificationPermissionBanner from "./NotificationPermissionBanner";
import { deleteAccount } from "@/lib/firebase/account";
import { cn } from "@/lib/utils";

// Helper component to monitor friends and push to queue
function AlertMonitor({ friends, userUid, customPolo }: { friends: Friend[], userUid: string, customPolo?: string }) {
        const prevStatusRef = useRef<Record<string, string>>({});

    useEffect(() => {
        friends.forEach(friend => {
            const fid = friend.id || friend.phone;
            const prevStatus = prevStatusRef.current[fid];
            const currentStatus = friend.status;

            // Detect Incoming MARCO
            // If it WAS NOT marco received, and NOW IS, trigger it.
            if (currentStatus === "MARCO_RECEIVED" && prevStatus !== "MARCO_RECEIVED") {
            }

            // Detect Incoming POLO
            if (currentStatus === "POLO_RECEIVED" && prevStatus !== "POLO_RECEIVED") {
            }

            // Update ref
            prevStatusRef.current[fid] = currentStatus;
        });
    }, [friends]);

    return null;
}

export default function Dashboard({ user }: { user: User }) {
    const [currentUser, setCurrentUser] = useState<User>(user);

    useEffect(() => {
        setCurrentUser(user);
    }, [user]);

    return (
        <DashboardContent user={currentUser} setUser={(nextUser) => {
            if (nextUser) setCurrentUser(nextUser);
        }} />
    );
}

function DashboardContent({ user, setUser }: { user: User, setUser: (u: User | null) => void }) {
    const [friends, setFriends] = useState<Friend[]>([]);
    const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
    const [loadingFriends, setLoadingFriends] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
    const [showHelpConfirm, setShowHelpConfirm] = useState(false);
    const router = useRouter();

    // Load initial data
    useEffect(() => {
        if (!user) return;

        // Initialize native notifications on first load
        initNativeNotifications();

        // Subscribe to real-time connections
        const unsubscribe = subscribeToConnections(user.uid, (updatedFriends) => {
            setFriends(updatedFriends);
            setLoadingFriends(false);

            // (Watch data sync moved to auth layer for standalone Watch app)
        });

        // (Watch actions now handled natively by standalone WatchOS app)
        const watchListener: any = null;

        // Initial fetch of pending requests
        loadPendingRequests();

        return () => {
            unsubscribe();
            if (watchListener) watchListener.remove();
        };
    }, [user]);

    const loadPendingRequests = async () => {
        if (!user) return;
        const requests = await getPendingRequests(user.uid);
        setFriendRequests(requests);
    };

    const handleLogout = async () => {
        await signOut();
        setUser(null);
        router.push("/");
    };

    const handleDeleteAccount = async () => {
        if (!user) return;
        await deleteAccount(user.uid);
        setUser(null);
        router.push("/");
    };

    const handleSaveSettings = async (marco: string, polo: string, recoveryEmail?: string, displayName?: string) => {
        if (!user) return;

        await updateCustomMessages(user.uid, marco, polo, recoveryEmail, displayName);

        // Optimistic update
        const updatedUser = {
            ...user,
            customMarco: marco,
            customPolo: polo,
            displayName: displayName || user.displayName, // Update display name
        };
        setUser(updatedUser);
    };

    const handleRemoveFriend = async (friendUid: string) => {
        if (!user) return;
        await removeConnection(user.uid, friendUid);
    };

    const handleAcceptRequest = async (requestId: string) => {
        await acceptFriendRequest(requestId);
        loadPendingRequests(); // Reload requests
    };

    const handleRejectRequest = async (requestId: string) => {
        await rejectFriendRequest(requestId);
        loadPendingRequests(); // Reload requests
    };

    const handleHelp = async () => {
        if (!user) return;
        await sendEmergencySOS(user.uid);
        setShowHelpConfirm(false);
        alert("Help request sent to all connections.");
    };

    // Responsive height calculation
    // If friends < 4, we try to fill the screen
    const shouldFillScreen = friends.length > 0 && friends.length <= 3;

    return (
        <div className="min-h-[100dvh] bg-background relative flex flex-col">
            <AlertMonitor friends={friends} userUid={user.uid} customPolo={user.customPolo} />

            {/* Header */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border flex-none pt-[env(safe-area-inset-top)]">
                <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* Logo or Title */}
                        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                            Marco Polo
                        </h1>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsAddFriendOpen(true)}
                            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted"
                        >
                            <UserPlus className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="p-2 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted"
                        >
                            <Settings className="w-5 h-5" />
                        </button>
                        <button
                            onClick={handleLogout}
                            className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-full hover:bg-muted"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </header>

            <main className={cn(
                "flex-1 w-full max-w-md mx-auto px-4 py-4 flex flex-col",
                shouldFillScreen ? "overflow-y-auto pb-28" : "overflow-y-auto pb-28"
            )}>
                <NotificationPermissionBanner userId={user.uid} />

                {/* Friend Requests */}
                {friendRequests.length > 0 && (
                    <div className="space-y-2 animate-in slide-in-from-top-4 duration-500 mb-4 flex-none">
                        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <Bell className="w-4 h-4" />
                            Requests
                        </h2>
                        {friendRequests.map(req => (
                            <FriendRequestNotification
                                key={req.id}
                                request={req}
                                onAccept={() => handleAcceptRequest(req.id)}
                                onReject={() => handleRejectRequest(req.id)}
                            />
                        ))}
                    </div>
                )}

                {/* Friends Grid */}
                <div className={cn(
                    "w-full transition-all duration-500",
                    shouldFillScreen ? "flex flex-col h-full gap-4 pb-20" : "grid grid-cols-1 gap-4"
                )}>
                    {loadingFriends ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-12 min-h-[50vh]">
                            <Loader2 className="w-10 h-10 animate-spin text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">Syncing connections...</p>
                        </div>
                    ) : friends.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center py-12 bg-secondary/30 rounded-3xl border-2 border-dashed border-border min-h-[50vh] animate-in fade-in duration-500">
                            <div className="w-20 h-20 bg-background rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
                                <Users className="w-10 h-10 text-muted-foreground" />
                            </div>
                            <h3 className="text-2xl font-semibold mb-2">No connections yet</h3>
                            <p className="text-muted-foreground text-base mb-8 max-w-[250px] mx-auto">
                                Invite friends to start sharing your status instantly.
                            </p>
                            <button
                                onClick={() => setIsAddFriendOpen(true)}
                                className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-primary-foreground rounded-full font-bold text-lg hover:bg-primary/90 transition-all shadow-xl hover:shadow-primary/25 active:scale-95"
                            >
                                <Plus className="w-6 h-6" />
                                Add Friend
                            </button>
                        </div>
                    ) : (
                        friends.map(friend => (
                            <div
                                key={friend.id || friend.phone}
                                className={cn(
                                    "transition-all duration-500",
                                    shouldFillScreen ? "flex-1 min-h-0" : "h-64"
                                )}
                            >
                                <FriendCard
                                    friend={friend}
                                    onUpdate={() => { }} // State updates automatically via subscription
                                    userUid={user.uid}
                                    customMarco={user.customMarco}
                                    customPolo={user.customPolo}
                                />
                            </div>
                        ))
                    )}
                </div>
            </main>

            {/* Help Button (Floating) */}
            <div className="fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] w-full max-w-md left-1/2 -translate-x-1/2 px-4 z-40">
                {!showHelpConfirm ? (
                    <button
                        onClick={() => setShowHelpConfirm(true)}
                        className="w-full bg-destructive text-destructive-foreground font-bold py-4 rounded-xl shadow-lg hover:bg-destructive/90 transition-all active:scale-95 flex items-center justify-center gap-2 tracking-widest uppercase"
                    >
                        <HandHelping className="w-5 h-5" />
                        Need Help
                    </button>
                ) : (
                    <div className="space-y-2 animate-in slide-in-from-bottom-2 fade-in">
                        <p className="text-center text-xs font-bold text-destructive uppercase tracking-widest mb-1">Send a help request?</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowHelpConfirm(false)}
                                className="flex-1 bg-secondary text-foreground font-bold py-4 rounded-xl shadow-sm hover:bg-secondary/80 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleHelp}
                                className="flex-[2] bg-destructive text-destructive-foreground font-bold py-4 rounded-xl shadow-lg hover:bg-destructive/90 transition-all active:scale-95 animate-pulse"
                            >
                                CONFIRM HELP
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <AddFriendModal
                isOpen={isAddFriendOpen}
                onClose={() => setIsAddFriendOpen(false)}
                userUid={user.uid}
                userPhone={user.phone || ""}
            />

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                currentMarco={user.customMarco}
                currentPolo={user.customPolo}
                currentRecoveryEmail={user.email}
                currentDisplayName={user.displayName}
                currentUserId={user.uid}
                friends={friends}
                onSave={handleSaveSettings}
                onDeleteAccount={handleDeleteAccount}
                onRemoveFriend={handleRemoveFriend}
            />
        </div>
    );
}
