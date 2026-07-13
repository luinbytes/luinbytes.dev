"use client";

import { useState, useEffect, useCallback } from "react";

interface LumiStatusProps {
  className?: string;
}

interface StatusInfo {
  label: string;
  activity: string;
  isOvernight: boolean;
}

function getStatusInfo(): StatusInfo {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const isOvernight = utcHour >= 1 && utcHour < 9;
  return isOvernight
    ? { label: "Overnight Shift Active", activity: "Burning the midnight oil, tackling async tasks while the world sleeps.", isOvernight: true }
    : { label: "Day Shift", activity: "Online and ready to help with coding, debugging, and creative tasks.", isOvernight: false };
}

function formatUTCTime(): string {
  const now = new Date();
  return now.toUTCString().replace("GMT", "UTC");
}

export function LumiStatus({ className }: LumiStatusProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [statusInfo, setStatusInfo] = useState<StatusInfo>(getStatusInfo);
  const [currentTime, setCurrentTime] = useState(formatUTCTime());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(formatUTCTime());
      setStatusInfo(getStatusInfo());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen) {
        const target = e.target as HTMLElement;
        if (!target.closest(".lumi-status-widget")) setIsOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) setIsOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const handleToggle = useCallback(() => { setIsOpen((prev) => !prev); }, []);

  return (
    <div className={`lumi-status-widget fixed bottom-6 right-6 z-50 ${className || ""}`}>
      {/* Main indicator */}
      <button
        onClick={handleToggle}
        className="group relative flex items-center gap-2 bg-nd-surface border border-nd-border px-3 py-2 nd-transition hover:border-nd-border-visible"
        aria-label="Lumi Status"
      >
        <span className={`w-2 h-2 rounded-full ${statusInfo.isOvernight ? "bg-nd-text-disabled" : "bg-nd-success"}`} />
        <span className="font-mono text-[11px] tracking-[0.06em] uppercase text-nd-text-disabled group-hover:text-nd-text-secondary nd-transition">
          {statusInfo.label}
        </span>
      </button>

      {/* Popup */}
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-3 w-72 bg-nd-surface border border-nd-border-visible overflow-hidden">
          <div className="px-4 py-3 border-b border-nd-border">
            <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-display block mb-1">
              Lumi Status
            </span>
            <span className={`font-mono text-[10px] tracking-[0.06em] uppercase ${statusInfo.isOvernight ? "text-nd-text-disabled" : "text-nd-success"}`}>
              {statusInfo.label}
            </span>
          </div>
          <div className="px-4 py-3 space-y-3">
            <div>
              <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-1">Current UTC Time</span>
              <span className="font-mono text-xs text-nd-text-primary">{currentTime}</span>
            </div>
            <div>
              <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-1">Currently</span>
              <p className="text-xs text-nd-text-secondary font-body leading-relaxed">{statusInfo.activity}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
