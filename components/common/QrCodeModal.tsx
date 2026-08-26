"use client";

import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Copy, Check, Wifi, Smartphone, ShieldCheck, Edit3 } from "lucide-react";

interface QrCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  lanUrl: string;
}

export const QrCodeModal: React.FC<QrCodeModalProps> = ({ isOpen, onClose, lanUrl: initialLanUrl }) => {
  const [activeUrl, setActiveUrl] = useState(initialLanUrl);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // If incoming initialLanUrl contains localhost/127.0.0.1/172., default to 10.10.24.90
    if (
      !initialLanUrl ||
      initialLanUrl.includes("localhost") ||
      initialLanUrl.includes("127.0.0.1") ||
      initialLanUrl.includes("172.")
    ) {
      setActiveUrl("http://10.10.24.90:3000");
    } else {
      setActiveUrl(initialLanUrl);
    }
  }, [initialLanUrl]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-md p-6 bg-slate-900 border border-slate-700/60 rounded-3xl shadow-2xl overflow-hidden glass-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow backdrop */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Join LAN Chat</h3>
              <p className="text-xs text-slate-400">Scan from any device on this Wi-Fi</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center justify-center my-5">
          <div className="p-4 bg-white rounded-2xl shadow-xl border-4 border-slate-800 flex items-center justify-center">
            <QRCodeSVG
              value={activeUrl || "http://10.10.24.90:3000"}
              size={190}
              level="M"
              includeMargin={false}
            />
          </div>

          <div className="mt-3 flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Ready for Wi-Fi Devices
          </div>
        </div>

        {/* Network URL Address */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">
              Wi-Fi Direct Address
            </label>
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300"
            >
              <Edit3 className="w-3 h-3" />
              <span>{isEditing ? "Done" : "Change IP"}</span>
            </button>
          </div>

          {isEditing ? (
            <input
              type="text"
              value={activeUrl}
              onChange={(e) => setActiveUrl(e.target.value)}
              placeholder="e.g. http://10.10.24.90:3000"
              className="w-full px-3 py-2 bg-slate-950 border border-blue-500 rounded-xl text-xs font-mono text-white outline-none"
            />
          ) : (
            <div className="flex items-center gap-2 p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl">
              <code className="flex-1 text-xs font-mono text-blue-300 truncate select-all">
                {activeUrl}
              </code>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-all shadow-sm active:scale-95 shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-white" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Instructions & Help */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2 p-2 bg-slate-800/40 rounded-xl border border-slate-800">
            <Smartphone className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Open phone camera</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-slate-800/40 rounded-xl border border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>No account needed</span>
          </div>
        </div>

        <div className="mt-3 text-center">
          <p className="text-[11px] text-slate-500">
            Ensure your phone is connected to the same Wi-Fi network.
          </p>
        </div>
      </div>
    </div>
  );
};
