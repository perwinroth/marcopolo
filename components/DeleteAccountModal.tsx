"use client";

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";

interface DeleteAccountModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}

export default function DeleteAccountModal({ isOpen, onClose, onConfirm }: DeleteAccountModalProps) {
    const [confirmText, setConfirmText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState("");

    if (!isOpen) return null;

    const handleDelete = async () => {
        if (confirmText !== "DELETE") {
            setError("Please type DELETE to confirm");
            return;
        }

        setIsDeleting(true);
        setError("");

        try {
            await onConfirm();
            // Account deleted, user will be logged out automatically
        } catch (err: any) {
            setError(err.message || "Failed to delete account");
            setIsDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-card border border-destructive/50 rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-destructive" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-destructive">Delete Account</h2>
                            <p className="text-sm text-muted-foreground">This action cannot be undone</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                        disabled={isDeleting}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Warning */}
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 mb-6">
                    <p className="text-sm text-destructive font-medium mb-2">⚠️ Warning</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        Deleting your account will permanently remove:
                    </p>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                        <li>Your profile and custom messages</li>
                        <li>All connections and friend requests</li>
                        <li>Sent invitations</li>
                        <li>Your authentication credentials</li>
                    </ul>
                </div>

                {/* Confirmation Input */}
                <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">
                        Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm
                    </label>
                    <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => {
                            setConfirmText(e.target.value);
                            setError("");
                        }}
                        placeholder="DELETE"
                        className="w-full bg-secondary border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-destructive transition-all"
                        disabled={isDeleting}
                        autoFocus
                    />
                    {error && <p className="text-destructive text-sm mt-2">{error}</p>}
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-secondary hover:bg-secondary/80 text-foreground font-medium py-3 rounded-xl transition-all"
                        disabled={isDeleting}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={confirmText !== "DELETE" || isDeleting}
                        className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isDeleting ? "Deleting..." : "Delete Account"}
                    </button>
                </div>
            </div>
        </div>
    );
}
