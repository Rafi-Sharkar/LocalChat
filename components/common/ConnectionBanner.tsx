"use client";

import React from "react";
import { WifiOff, RefreshCw, AlertCircle } from "lucide-react";

interface ConnectionBannerProps {
  status: "connected" | "connecting" | "reconnecting" | "disconnected";
  errorMessage?: string | null;
  onRetry?: () => void;
}

export const ConnectionBanner: React.FC<ConnectionBannerProps> = ({
  status,
  errorMessage,
  onRetry,
}) => {
  if (status === "connected" && !errorMessage) return null;

  if (errorMessage) {
    return (
      <div className="w-full bg-red-950/80 border-b border-red-800/60 px-4 py-2 text-xs text-red-200 flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-2.5 py-1 bg-red-800 hover:bg-red-700 text-white rounded-lg text-[11px] font-medium transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  if (status === "reconnecting" || status === "connecting") {
    return (
      <div className="w-full bg-amber-950/80 border-b border-amber-800/60 px-4 py-2 text-xs text-amber-200 flex items-center justify-center gap-2 animate-fade-in">
        <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
        <span>Reconnecting to LAN chat service...</span>
      </div>
    );
  }

  if (status === "disconnected") {
    return (
      <div className="w-full bg-slate-900 border-b border-slate-800 px-4 py-2 text-xs text-slate-300 flex items-center justify-between animate-fade-in">
        <div className="flex items-center gap-2">
          <WifiOff className="w-4 h-4 text-rose-400" />
          <span>Disconnected from network.</span>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-medium transition-colors"
          >
            Reconnect
          </button>
        )}
      </div>
    );
  }

  return null;
};
