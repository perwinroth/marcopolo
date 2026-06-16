"use client";

/**
 * Full-bleed screenshot route for App Store captures.
 * Renders ONE screen edge-to-edge at the exact device viewport — no device
 * frames, no labels, no padding. Pick the screen with ?screen=<name>.
 * Used by scripts/capture-clean.js.
 */
import { useEffect, useState } from "react";
import { Bell, Check, Circle, Hand, HandHelping, Heart, Palette, Phone, Plus, Settings, UserPlus } from "lucide-react";

function FriendCardPreview({
    name, status, icon = "heart", color = "#e11d48",
}: {
    name: string;
    status: "idle" | "marco" | "polo" | "help";
    icon?: "heart" | "circle" | "hand";
    color?: string;
}) {
    const ShapeIcon = icon === "circle" ? Circle : icon === "hand" ? Hand : Heart;
    const iconColor = status === "help" ? "#ef4444" : color;
    const bgClass =
        status === "marco" ? "bg-primary shadow-primary/20"
            : status === "help" ? "bg-destructive shadow-destructive/20"
                : "bg-secondary";
    return (
        <div className={`relative min-h-[220px] rounded-[28px] ${bgClass} p-6 text-center shadow-xl`}>
            <button className="absolute right-4 top-4 rounded-full bg-black/20 p-3 text-white/70">
                <Palette className="h-4 w-4" />
            </button>
            <div className="flex h-full flex-col items-center justify-center gap-4">
                {status === "polo" ? (
                    <Check className="h-24 w-24" style={{ color: iconColor }} />
                ) : (
                    <ShapeIcon
                        className={`h-24 w-24 ${status === "marco" || status === "help" ? "fill-current" : ""}`}
                        style={{ color: iconColor, opacity: status === "idle" ? 0.7 : 1 }}
                    />
                )}
                <div className="space-y-1">
                    <h3 className="text-2xl font-semibold tracking-tight text-white">{name}</h3>
                    <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/80">
                        {status === "idle" && "Hold: Marco?"}
                        {status === "marco" && "Hold: Polo!"}
                        {status === "polo" && "Connected"}
                        {status === "help" && "Needs Help"}
                    </p>
                </div>
            </div>
        </div>
    );
}

function Login() {
    return (
        <div className="relative flex min-h-screen flex-col overflow-hidden px-6 py-20">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(45,212,191,0.18),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(13,148,136,0.22),_transparent_42%)]" />
            <div className="relative z-10 flex flex-1 flex-col items-center justify-center">
                <div className="mb-12 text-center">
                    <h1 className="bg-gradient-to-br from-white to-white/60 bg-clip-text text-7xl font-black tracking-[-0.08em] text-transparent">
                        MARCO<br />POLO
                    </h1>
                    <div className="mx-auto mt-4 h-1 w-24 rounded-full bg-primary" />
                </div>
                <div className="w-full max-w-sm space-y-4">
                    <div className="space-y-1 text-left">
                        <h2 className="text-xl font-bold text-white">Welcome</h2>
                        <p className="text-sm text-muted-foreground">Enter your mobile number to continue.</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-white shadow-lg">
                        <div className="flex items-center gap-3">
                            <Phone className="h-5 w-5 text-primary" />
                            <span className="tracking-wide">+46 70 123 45 67</span>
                        </div>
                    </div>
                    <button className="w-full rounded-2xl bg-primary py-4 text-lg font-bold text-white shadow-lg shadow-primary/20">
                        Send Code
                    </button>
                    <p className="pt-4 text-center text-sm text-primary">Lost your phone? Recover account</p>
                </div>
            </div>
        </div>
    );
}

function Dashboard() {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <header className="border-b border-border bg-background/90 px-4 pb-3 pt-14 backdrop-blur-md">
                <div className="mx-auto flex max-w-md items-center justify-between">
                    <h1 className="bg-gradient-to-r from-primary to-cyan-300 bg-clip-text text-xl font-bold text-transparent">
                        Marco Polo
                    </h1>
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <button className="rounded-full p-2"><UserPlus className="h-5 w-5" /></button>
                        <button className="rounded-full p-2"><Settings className="h-5 w-5" /></button>
                    </div>
                </div>
            </header>
            <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 py-4 pb-28">
                <div className="rounded-2xl border border-primary/20 bg-card p-4 shadow-lg">
                    <div className="flex items-start gap-3">
                        <div className="rounded-full bg-primary/20 p-2 text-primary"><Bell className="h-4 w-4" /></div>
                        <div>
                            <h3 className="font-semibold text-white">Enable Notifications</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Get instant alerts when someone sends you a Marco or a help request.
                            </p>
                        </div>
                    </div>
                </div>
                <FriendCardPreview name="Anna" status="idle" icon="heart" color="#ec4899" />
                <FriendCardPreview name="Elias" status="marco" icon="circle" color="#2dd4bf" />
                <FriendCardPreview name="Maja" status="polo" icon="hand" color="#f97316" />
            </main>
            <div className="fixed inset-x-0 bottom-0 mx-auto max-w-md px-4 pb-8">
                <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-destructive py-4 font-bold uppercase tracking-[0.2em] text-white shadow-lg shadow-destructive/30">
                    <HandHelping className="h-5 w-5" />
                    Need Help
                </button>
            </div>
        </div>
    );
}

function Help() {
    return (
        <div className="flex min-h-screen flex-col justify-center bg-background px-4">
            <div className="mx-auto w-full max-w-md space-y-5">
                <FriendCardPreview name="Anna" status="help" icon="hand" />
                <div className="rounded-2xl border border-destructive/30 bg-card p-5 text-center shadow-xl">
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-destructive">Send a help request?</p>
                    <p className="mb-5 text-sm text-muted-foreground">
                        Your trusted circle will get a high-priority notification that you need help right now.
                    </p>
                    <div className="flex gap-2">
                        <button className="flex-1 rounded-xl bg-secondary py-4 font-bold text-white">Cancel</button>
                        <button className="flex-[2] rounded-xl bg-destructive py-4 font-bold uppercase tracking-[0.2em] text-white">
                            Confirm Help
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AddConnection() {
    return (
        <div className="flex min-h-screen flex-col justify-center bg-black/90 px-4">
            <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
                        <UserPlus className="h-5 w-5 text-primary" />
                        Add Connection
                    </h2>
                    <span className="text-muted-foreground">✕</span>
                </div>
                <div className="space-y-4">
                    <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-secondary py-3 font-medium text-white">
                        <Plus className="h-5 w-5" />
                        Pick from Contacts
                    </button>
                    <div>
                        <label className="mb-2 block text-sm font-medium text-muted-foreground">Or enter phone number</label>
                        <div className="rounded-xl border border-border bg-secondary px-4 py-4 text-white">+46 70 999 88 77</div>
                    </div>
                    <button className="w-full rounded-xl bg-primary py-4 font-bold text-white shadow-lg shadow-primary/20">
                        Send Request
                    </button>
                </div>
            </div>
        </div>
    );
}

function SettingsScreen() {
    return (
        <div className="flex min-h-screen flex-col justify-center bg-black/90 px-4">
            <div className="mx-auto w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="flex items-center gap-2 text-xl font-medium text-white">
                        <Settings className="h-5 w-5 text-primary" />
                        Settings
                    </h2>
                    <span className="text-muted-foreground">✕</span>
                </div>
                <div className="space-y-6">
                    <div>
                        <label className="mb-2 block text-sm font-medium text-muted-foreground">Your Name</label>
                        <div className="rounded-lg border border-border bg-secondary px-4 py-3 text-white">Alex</div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="mb-2 block text-xs text-muted-foreground">Your Signal</label>
                            <div className="rounded-lg border border-border bg-secondary px-3 py-3 text-white">Marco?</div>
                        </div>
                        <div>
                            <label className="mb-2 block text-xs text-muted-foreground">Your Response</label>
                            <div className="rounded-lg border border-border bg-secondary px-3 py-3 text-white">Polo!</div>
                        </div>
                    </div>
                    <div>
                        <label className="mb-3 block text-sm font-medium text-muted-foreground">Manage Connections (3)</label>
                        <div className="overflow-hidden rounded-xl border border-border/50 bg-secondary/30">
                            {["Anna", "Elias", "Maja"].map((name) => (
                                <div key={name} className="flex items-center justify-between border-b border-border/50 px-4 py-3 last:border-b-0">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-xs font-bold text-white">{name[0]}</div>
                                        <span className="text-sm font-medium text-white">{name}</span>
                                    </div>
                                    <span className="text-destructive">🗑</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <button className="w-full rounded-xl bg-primary py-3 font-medium text-white shadow-lg shadow-primary/20">
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
}

function NotificationCard({ title, body }: { title: string; body: string }) {
    return (
        <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-white/90 p-4 text-left shadow-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Marco Polo</p>
            <h3 className="mt-2 text-lg font-semibold text-slate-900">{title}</h3>
            <p className="mt-1 text-sm text-slate-600">{body}</p>
        </div>
    );
}

function Notifications() {
    return (
        <div className="flex min-h-screen flex-col justify-center bg-[linear-gradient(180deg,#0f172a_0%,#1e293b_100%)] px-4">
            <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5">
                <NotificationCard title="Marco?" body="Anna is checking in on you" />
                <NotificationCard title="Polo!" body="Elias responded. They’re okay." />
                <NotificationCard title="Help Needed" body="Maja is asking for help right now." />
            </div>
        </div>
    );
}

function WatchScreen({
    icon, title, subtitle, danger = false,
}: {
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    danger?: boolean;
}) {
    return (
        <div className="flex min-h-screen w-screen flex-col items-center justify-center gap-4 bg-black px-5 text-center">
            <div className={danger ? "text-red-500" : "text-primary"}>{icon}</div>
            <div className="space-y-1.5">
                <h3 className="text-2xl font-semibold text-white">{title}</h3>
                <p className={`text-[0.7rem] font-bold uppercase tracking-[0.2em] ${danger ? "text-red-400" : "text-white/70"}`}>
                    {subtitle}
                </p>
            </div>
        </div>
    );
}

function WatchCheckIn() {
    return <WatchScreen icon={<Heart className="h-20 w-20" />} title="Anna" subtitle="Tap: Marco?" />;
}

function WatchHelp() {
    return <WatchScreen icon={<HandHelping className="h-20 w-20" />} title="Need Help" subtitle="Send to circle" danger />;
}

const SCREENS: Record<string, () => React.JSX.Element> = {
    login: Login,
    dashboard: Dashboard,
    help: Help,
    "add-connection": AddConnection,
    settings: SettingsScreen,
    notifications: Notifications,
    "watch-check-in": WatchCheckIn,
    "watch-help": WatchHelp,
};

export default function ShotPage() {
    const [screen, setScreen] = useState<string>("dashboard");
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const s = params.get("screen");
        if (s && SCREENS[s]) setScreen(s);
    }, []);
    const Screen = SCREENS[screen] ?? Dashboard;
    return (
        <main className="w-screen overflow-hidden bg-background">
            <Screen />
        </main>
    );
}
