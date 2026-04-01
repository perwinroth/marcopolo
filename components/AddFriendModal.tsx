"use client";

import { useState } from "react";
import { UserPlus, X, Loader2, AlertCircle, MessageSquare, Contact } from "lucide-react";
import { pickContact, isContactPickerAvailable } from "@/lib/contactPicker";
import { sendFriendRequest } from "@/lib/firebase/database";
import { createInvitation } from "@/lib/firebase/invitations";
import PhoneInput, { parsePhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import "@/app/phone-input.css";

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
  userUid: string;
  userPhone: string;
}

export default function AddFriendModal({ isOpen, onClose, userUid, userPhone }: AddFriendModalProps) {
  const [phoneNumber, setPhoneNumber] = useState<string | undefined>("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error" | "invite_needed" | "pending_reminder">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  const fallbackCountry = (() => {
    try {
      return parsePhoneNumber(userPhone)?.country;
    } catch {
      return undefined;
    }
  })();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMessage("");
    
    // Safety check just in case
    const phoneToSend = phoneNumber || "";

    try {
      const result = await sendFriendRequest(userUid, userPhone, phoneToSend);
      
      if (result.success) {
        setStatus("success");
        setTimeout(() => {
          onClose();
          setPhoneNumber("");
          setStatus("idle");
        }, 2000);
      } else {
        // Check for user not found OR pending request to offer invitation/reminder
        if (result.error === "User not found" || result.error?.includes("not found")) {
            setStatus("invite_needed");
        } else if (result.error === "Request already pending") {
            setStatus("pending_reminder");
        } else {
            setStatus("error");
            setErrorMessage(result.error || "Failed to send request");
        }
      }
    } catch (error) {
      console.error(error);
      setStatus("error");
      setErrorMessage("An unexpected error occurred");
    }
  };

  const handleInviteViaSMS = async () => {
    setInviteLoading(true);
    const phoneToSend = phoneNumber || "";

    try {
        const result = await createInvitation(phoneToSend);
        if (result.success && result.token) {
            const inviteLink = `https://www.polomar.co/invite?token=${result.token}`;
            // Different messages based on context
            const isReminder = status === "pending_reminder";
            const message = isReminder 
                ? `Hey, I sent you a friend request on Marco Polo! Accept it here: ${inviteLink}`
                : `Join me on Marco Polo! Here is a secure link to connect: ${inviteLink}`;
            
            // Open native SMS app
            const ua = navigator.userAgent.toLowerCase();
            const isIOS = ua.indexOf("iphone") > -1 || ua.indexOf("ipad") > -1;
            const separator = isIOS ? "&" : "?";
            
            window.location.href = `sms:${phoneToSend}${separator}body=${encodeURIComponent(message)}`;

            onClose();
            setPhoneNumber("");
            setStatus("idle");
        } else {
            setErrorMessage(result.error || "Failed to create invitation");
            setStatus("error");
        }
    } catch (err) {
        console.error(err);
        setErrorMessage("Failed to create invitation");
        setStatus("error");
    } finally {
        setInviteLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6 shadow-2xl mx-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            Add Connection
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {status === "success" ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-in zoom-in duration-300">
               <UserPlus className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold mb-2">Request Sent!</h3>
            <p className="text-muted-foreground">Waiting for them to accept...</p>
          </div>
        ) : (status === "invite_needed" || status === "pending_reminder") ? (
             <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-center">
                    <p className="font-semibold text-blue-400 mb-1">
                        {status === "invite_needed" ? "User not found" : "Request Pending"}
                    </p>
                    <p className="text-sm text-blue-300/80">
                        {status === "invite_needed" 
                            ? `${phoneNumber} is not on Marco Polo yet.`
                            : `You already sent a request to ${phoneNumber}.`
                        }
                    </p>
                </div>
                
                <button
                    onClick={handleInviteViaSMS}
                    disabled={inviteLoading}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 rounded-xl font-bold tracking-wide transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg"
                >
                    {inviteLoading ? <Loader2 className="animate-spin" /> : <MessageSquare className="w-5 h-5" />}
                    {status === "invite_needed" ? "Invite via SMS" : "Remind via SMS"}
                </button>
                
                <button 
                    onClick={() => setStatus("idle")}
                    className="w-full text-sm text-muted-foreground hover:text-white py-2"
                >
                    Go Back
                </button>
            </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Pick from Contacts — native only */}
            {isContactPickerAvailable() && (
              <button
                type="button"
                onClick={async () => {
                  const contact = await pickContact(fallbackCountry);
                  if (contact) {
                    setPhoneNumber(contact.phone);
                  }
                }}
                className="w-full flex items-center justify-center gap-2 py-3 bg-secondary hover:bg-secondary/80 text-foreground rounded-xl font-medium transition-all active:scale-95"
              >
                <Contact className="w-5 h-5" />
                Pick from Contacts
              </button>
            )}

            <div className="dark-phone-input">
              <label className="block text-sm font-medium mb-2 text-muted-foreground">
                {isContactPickerAvailable() ? "Or enter phone number" : "Phone Number"}
              </label>
              <PhoneInput
                  placeholder="Enter phone number"
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  defaultCountry={fallbackCountry}
                  international
                  countryCallingCodeEditable={false}
                  className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Turn on your incognito window and try adding a number you know is registered.
              </p>
            </div>

            {status === "error" && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-sm font-semibold text-destructive">Could not add user</p>
                    <p className="text-xs text-destructive/80 leading-relaxed">
                        {errorMessage === "User not found" 
                            ? "No account found with this phone number. Make sure they have registered." 
                            : errorMessage}
                    </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={status === "loading" || !phoneNumber}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-4 rounded-xl font-bold tracking-wide transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg hover:shadow-primary/20"
            >
              {status === "loading" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Request"
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
