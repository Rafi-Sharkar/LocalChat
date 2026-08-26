"use client";

import React, { useState } from "react";
import { X, UserCheck, AlertCircle, Loader2 } from "lucide-react";

interface NicknameModalProps {
  isOpen: boolean;
  currentNickname: string;
  onClose: () => void;
  onUpdateNickname: (newNickname: string) => Promise<{ success: boolean; error?: string }>;
}

export const NicknameModal: React.FC<NicknameModalProps> = ({
  isOpen,
  currentNickname,
  onClose,
  onUpdateNickname,
}) => {
  const [nickname, setNickname] = useState(currentNickname);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = nickname.trim();
    if (!trimmed) {
      setError("Nickname cannot be empty.");
      return;
    }
    if (trimmed.length < 2 || trimmed.length > 30) {
      setError("Nickname must be between 2 and 30 characters.");
      return;
    }
    if (trimmed.toLowerCase() === currentNickname.toLowerCase()) {
      onClose();
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await onUpdateNickname(trimmed);
      if (res.success) {
        onClose();
      } else {
        setError(res.error || "Failed to update nickname.");
      }
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-sm p-6 bg-slate-900 border border-slate-700/60 rounded-2xl shadow-2xl overflow-hidden glass-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Change Nickname</h3>
              <p className="text-xs text-slate-400">Update your temporary identity</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              New Nickname
            </label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Alex, Rafi, Jordan"
              maxLength={30}
              autoFocus
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all"
            />
            <div className="flex justify-between mt-1 text-[11px] text-slate-500">
              <span>2–30 characters</span>
              <span>{nickname.length}/30</span>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !nickname.trim()}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl transition-all shadow-md active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Nickname"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
