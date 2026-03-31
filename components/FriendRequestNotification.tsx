"use client";

import { useState } from "react";
import { UserPlus, X, Check } from "lucide-react";
import { FriendRequest } from "@/lib/firebase/database";

interface FriendRequestNotificationProps {
  request: FriendRequest;
  onAccept: () => Promise<void>;
  onReject: () => Promise<void>;
}

export default function FriendRequestNotification({
  request,
  onAccept,
  onReject,
}: FriendRequestNotificationProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      await onAccept();
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    try {
      await onReject();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start gap-3">
        <div className="bg-primary/20 rounded-full p-2 flex-shrink-0">
          <UserPlus className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm mb-1 truncate">Connection Request</p>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{request.fromPhone}</span> wants to connect
          </p>
        </div>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={handleReject}
          disabled={isProcessing}
          className="flex-1 py-2 text-xs font-medium hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
        >
          Decline
        </button>
        <button
          onClick={handleAccept}
          disabled={isProcessing}
          className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium py-2 rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-1"
        >
          <Check className="w-3 h-3" />
          Accept
        </button>
      </div>
    </div>
  );
}
