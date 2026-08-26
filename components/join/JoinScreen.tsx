"use client";

import React, { useState } from "react";
import { MessageSquare, Wifi, Shield, Zap, QrCode, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { QrCodeModal } from "../common/QrCodeModal";

interface JoinScreenProps {
  onJoin: (nickname: string) => Promise<{ success: boolean; error?: string }>;
  isConnecting: boolean;
  lanUrl: string;
}

export const JoinScreen: React.FC<JoinScreenProps> = ({ onJoin, isConnecting, lanUrl }) => {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) {
      setError("Please enter a nickname.");
      return;
    }
    if (trimmed.length < 2 || trimmed.length > 30) {
      setError("Nickname must be 2–30 characters.");
      return;
    }

    setError(null);
    const res = await onJoin(trimmed);
    if (!res.success) {
      setError(res.error || "Failed to join chat.");
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-[#070b14] overflow-hidden">
      {/* Background dynamic ambient glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Top right LAN Share Button */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <button
          onClick={() => setShowQrModal(true)}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 rounded-xl text-xs font-medium text-slate-200 hover:text-white transition-all shadow-lg backdrop-blur-md"
        >
          <QrCode className="w-4 h-4 text-blue-400" />
          <span className="hidden sm:inline">Share on Wi-Fi</span>
        </button>
      </div>

      <div className="w-full max-w-md animate-slide-up">
        {/* Main Card */}
        <div className="relative p-7 sm:p-8 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl glass-panel">
          {/* Header */}
          <div className="flex flex-col items-center text-center">
            <div className="relative p-3.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl shadow-blue-500/20 text-white mb-4">
              <MessageSquare className="w-8 h-8" />
              <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-slate-900"></span>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              LAN CHAT
            </h1>
            <p className="mt-1.5 text-sm text-slate-400 max-w-xs">
              Chat in real time with anyone connected to this local Wi-Fi.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-7 space-y-4">
            <div>
              <label htmlFor="nickname" className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Choose a temporary nickname
              </label>
              <div className="relative">
                <input
                  id="nickname"
                  type="text"
                  value={nickname}
                  onChange={(e) => {
                    setNickname(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="e.g. Rafi, John, Alex"
                  maxLength={30}
                  autoComplete="off"
                  autoFocus
                  disabled={isConnecting}
                  className="w-full px-4 py-3.5 bg-slate-950/80 border border-slate-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-2xl text-sm font-medium text-white placeholder-slate-500 outline-none transition-all"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500">
                  {nickname.length}/30
                </span>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-400 text-xs animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isConnecting || !nickname.trim()}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-2xl transition-all shadow-lg shadow-blue-600/20 active:scale-[0.98]"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting to LAN...</span>
                </>
              ) : (
                <>
                  <span>Join Chat</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Feature Highlights */}
          <div className="mt-7 pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center">
            <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-slate-950/40 border border-slate-800/40">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px] font-medium text-slate-300">No Account</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-slate-950/40 border border-slate-800/40">
              <Wifi className="w-4 h-4 text-blue-400" />
              <span className="text-[11px] font-medium text-slate-300">Local Only</span>
            </div>
            <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-slate-950/40 border border-slate-800/40">
              <Zap className="w-4 h-4 text-amber-400" />
              <span className="text-[11px] font-medium text-slate-300">Auto Cleanup</span>
            </div>
          </div>

          <div className="mt-4 text-center">
            <p className="text-[11px] text-slate-500">
              Temporary sessions • Auto-deletes after inactivity
            </p>
          </div>
        </div>
      </div>

      <QrCodeModal
        isOpen={showQrModal}
        onClose={() => setShowQrModal(false)}
        lanUrl={lanUrl}
      />
    </div>
  );
};
