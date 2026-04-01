"use client";

import { useState } from "react";
import { useEffect } from "react";
import { Settings, X, Mail, Download, Trash2, ExternalLink, User, Users, AlertTriangle, Heart, Circle, LogOut } from "lucide-react";
import DeleteAccountModal from "./DeleteAccountModal";
import Link from "next/link";
import { exportUserData } from "@/lib/firebase/account";
import { Friend } from "@/lib/firebase/database";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMarco: string;
  currentPolo: string;
  currentRecoveryEmail?: string;
  currentDisplayName?: string;
  currentUserId?: string; // Optional because might not be loaded yet
  friends?: Friend[]; // New prop
  onSave: (marco: string, polo: string, recoveryEmail?: string, displayName?: string) => Promise<void>;
  onDeleteAccount?: () => Promise<void>; // Make optional to avoid errors if not passed
  onRemoveFriend?: (friendUid: string) => Promise<void>; // New prop
  onLogout?: () => Promise<void>;
}

const MAX_LENGTH = 25;

export default function SettingsModal({
  isOpen,
  onClose,
  currentMarco,
  currentPolo,
  currentRecoveryEmail,
  currentDisplayName,
  currentUserId,
  friends = [],
  onSave,
  onDeleteAccount,
  onRemoveFriend,
  onLogout,
}: SettingsModalProps) {
  const [marco, setMarco] = useState(currentMarco || "Marco?");
  const [polo, setPolo] = useState(currentPolo || "Polo!");
  const [displayName, setDisplayName] = useState(currentDisplayName || "");
  const [recoveryEmail, setRecoveryEmail] = useState(currentRecoveryEmail || "");
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Friend removal state
  const [friendToRemove, setFriendToRemove] = useState<Friend | null>(null);
  const [isRemovingFriend, setIsRemovingFriend] = useState(false);

  // Sync state when props change (values are already decrypted by auth layer)
  useEffect(() => {
    setMarco(currentMarco || "Marco?");
    setPolo(currentPolo || "Polo!");
  }, [currentMarco, currentPolo]);

  // Update props when changed
  useEffect(() => {
    setRecoveryEmail(currentRecoveryEmail || "");
    setDisplayName(currentDisplayName || "");
  }, [currentRecoveryEmail, currentDisplayName]);


  const handleExportData = async () => {
    if (!currentUserId) return;
    setIsExporting(true);
    try {
      const data = await exportUserData(currentUserId);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `marco-polo-data-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting data:", error);
      alert("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };
  
  const confirmRemoveFriend = async () => {
      if (!friendToRemove || !onRemoveFriend) return;
      setIsRemovingFriend(true);
      try {
          await onRemoveFriend(friendToRemove.id || friendToRemove.phone);
          setFriendToRemove(null);
      } catch (e) {
          console.error("Failed to remove friend", e);
      } finally {
          setIsRemovingFriend(false);
      }
  };

  if (!isOpen) return null;

  const handleSave = async () => {
    // Use defaults if empty
    const marcoVal = marco.trim() || "Marco?";
    const poloVal = polo.trim() || "Polo!";

    // Validate email if provided
    if (recoveryEmail && !recoveryEmail.includes("@")) {
      alert("Please enter a valid email address");
      return;
    }

    setIsSaving(true);
    try {
      await onSave(marcoVal, poloVal, recoveryEmail.trim() || undefined, displayName.trim());
      onClose();
    } catch (error: any) {
      console.error("Error saving settings:", error);
      alert("Failed to save: " + (error?.message || "Unknown error"));
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    setMarco("Marco?");
    setPolo("Polo!");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl mx-4 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        
        {/* Friend Removal Confirmation Overlay */}
        {friendToRemove && (
             <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
                <div className="w-full bg-card border border-border rounded-xl p-6 space-y-4 text-center">
                    <div className="w-12 h-12 bg-destructive/20 text-destructive rounded-full flex items-center justify-center mx-auto mb-2">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold">Remove Connection?</h3>
                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to remove <span className="font-bold text-foreground">{friendToRemove.displayName || friendToRemove.phone}</span>?
                    </p>
                    <div className="flex gap-2 pt-2">
                        <button 
                            onClick={() => setFriendToRemove(null)}
                            className="flex-1 py-3 bg-secondary rounded-lg font-medium"
                        >
                            Cancel
                        </button>
                         <button 
                            onClick={confirmRemoveFriend}
                            disabled={isRemovingFriend}
                            className="flex-1 py-3 bg-destructive text-destructive-foreground rounded-lg font-medium"
                        >
                            {isRemovingFriend ? "Removing..." : "Remove"}
                        </button>
                    </div>
                </div>
             </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-medium flex items-center gap-2 tracking-wide">
            <Settings className="w-5 h-5 text-primary" />
            Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
           {/* Display Name */}
           <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block tracking-wide flex items-center gap-2">
              <User className="w-4 h-4" />
              Your Name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="How friends see you"
              maxLength={20}
              className="w-full bg-secondary border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all tracking-wide"
            />
             <p className="text-xs text-muted-foreground mt-1 text-right">
              {displayName.length}/20
            </p>
          </div>

          {/* Custom Messages */}
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-muted-foreground tracking-wide">Custom Signals</label>
                <button onClick={resetToDefaults} className="text-xs text-primary hover:underline">Reset</button>
             </div>
            
             <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Your Signal</label>
                    <input
                      type="text"
                      value={marco}
                      onChange={(e) => e.target.value.length <= MAX_LENGTH && setMarco(e.target.value)}
                      placeholder="Marco?"
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                 </div>
                 <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Your Response</label>
                    <input
                      type="text"
                      value={polo}
                      onChange={(e) => e.target.value.length <= MAX_LENGTH && setPolo(e.target.value)}
                      placeholder="Polo!"
                      className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                 </div>
             </div>
          </div>
          
          {/* Manage Connections Section */}
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-3 block tracking-wide flex items-center gap-2">
              <Users className="w-4 h-4" />
              Manage Connections ({friends.length})
            </label>
            
            <div className="bg-secondary/30 rounded-xl border border-border/50 overflow-hidden">
                {friends.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        No connections yet.
                    </div>
                ) : (
                    <div className="divide-y divide-border/50 max-h-[200px] overflow-y-auto">
                        {friends.map(friend => (
                            <div key={friend.id || friend.phone} className="flex items-center justify-between p-3 hover:bg-white/5 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-xs font-bold" style={{ color: friend.theme?.nameColor || 'white' }}>
                                        {friend.displayName ? friend.displayName[0].toUpperCase() : (friend.phone ? friend.phone[0] : '?')}
                                    </div>
                                    <div className="text-sm font-medium">
                                        {friend.displayName || friend.phone}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setFriendToRemove(friend)}
                                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors"
                                    title="Remove friend"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          </div>


          {/* Recovery Email */}
          <div className="pt-4 border-t border-border">
            <label className="text-sm font-medium text-muted-foreground mb-2 block tracking-wide flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Recovery Email
            </label>
            <input
              type="email"
              value={recoveryEmail}
              onChange={(e) => setRecoveryEmail(e.target.value)}
              placeholder="Optional recovery email"
              className="w-full bg-secondary border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary transition-all tracking-wide"
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium py-3 rounded-xl transition-all tracking-wide disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
          >
            
                    {isSaving ? "Saving..." : "Save Settings"}
          </button>
        </div>

        {/* Data & Privacy Section (Collapsed/Secondary) */}
        <div className="mt-8 pt-6 border-t border-border space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Account Actions</h3>
          
          <div className="grid grid-cols-2 gap-3">
               <button
                onClick={handleExportData}
                disabled={isExporting}
                className="flex flex-col items-center justify-center p-3 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors gap-2 text-xs font-medium"
              >
                <Download className="w-4 h-4 text-muted-foreground" />
                Export Data
              </button>

               <button
                onClick={() => setShowDeleteModal(true)}
                className="flex flex-col items-center justify-center p-3 bg-destructive/5 hover:bg-destructive/10 border border-destructive/20 rounded-lg transition-colors gap-2 text-xs font-medium text-destructive"
              >
                <Trash2 className="w-4 h-4" />
                Delete Account
              </button>
          </div>

          {onLogout && (
            <button
              onClick={async () => {
                await onLogout();
                onClose();
              }}
              className="w-full flex items-center justify-center gap-2 py-3 bg-secondary hover:bg-secondary/80 rounded-lg transition-colors text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              Log Out
            </button>
          )}

          <Link
            href="/privacy"
            target="_blank"
            className="block text-center text-xs text-muted-foreground hover:text-foreground mt-4"
          >
            Privacy Policy
          </Link>
        </div>

        {/* Delete Account Modal */}
        {onDeleteAccount && (
            <DeleteAccountModal
              isOpen={showDeleteModal}
              onClose={() => setShowDeleteModal(false)}
              onConfirm={onDeleteAccount}
            />
        )}

      </div>
    </div>
  );
}
