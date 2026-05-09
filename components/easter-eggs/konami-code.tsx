"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { X, Gamepad2 } from "lucide-react";

const KONAMI_CODE = [
  "ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown",
  "ArrowLeft", "ArrowRight", "KeyB", "KeyA",
];

const KONAMI_DISPLAY = ["↑", "↑", "↓", "↓", "←", "→", "B", "A"];
const TIMEOUT_MS = 5000;
const D_PAD_TIMEOUT_MS = 10000;
const SHAKE_THRESHOLD = 12;

interface DPadButtonProps {
  keyName: string;
  display: string;
  className?: string;
  pressedButton: string | null;
  onPress: (key: string) => (e: React.TouchEvent | React.MouseEvent) => void;
}

function DPadButton({ keyName, display, className = "", pressedButton, onPress }: DPadButtonProps) {
  return (
    <button
      onTouchStart={onPress(keyName)}
      className={`min-w-[52px] min-h-[52px] flex items-center justify-center bg-nd-black border border-nd-border-visible text-nd-text-display font-bold text-lg select-none touch-manipulation nd-transition active:bg-nd-surface-raised ${pressedButton === keyName ? "bg-nd-surface-raised" : ""} ${className}`}
      aria-label={display}
    >
      {display}
    </button>
  );
}

function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 768;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function KonamiCode() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDPadOpen, setIsDPadOpen] = useState(false);
  const [pressedButton, setPressedButton] = useState<string | null>(null);
  const [keySequence, setKeySequence] = useState<string[]>([]);

  useEffect(() => {
    if (!isModalOpen) return;
    fetch("/data/lumi-stats.json")
      .then((r) => r.json())
      .then((data) => {
        const memEl = document.getElementById("konami-memories");
        const cronEl = document.getElementById("konami-crons");
        if (memEl) memEl.textContent = data.memories_stored || "55+";
        if (cronEl) cronEl.textContent = data.overnight_shifts?.replace("/week", "") || "8";
      })
      .catch(() => {});
  }, [isModalOpen]);

  const keySequenceRef = useRef<string[]>([]);
  const lastKeyTimeRef = useRef<number>(0);
  const dPadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const shakeEnabledRef = useRef(false);
  const lastShakeTimeRef = useRef(0);
  const isDPadOpenRef = useRef(false);
  const isModalOpenRef = useRef(false);
  const motionListenerAttachedRef = useRef(false);

  useEffect(() => { isDPadOpenRef.current = isDPadOpen; }, [isDPadOpen]);
  useEffect(() => { isModalOpenRef.current = isModalOpen; }, [isModalOpen]);

  const resetSequence = useCallback(() => {
    keySequenceRef.current = [];
    setKeySequence([]);
    lastKeyTimeRef.current = 0;
  }, []);

  const handleSuccess = useCallback(() => {
    setIsModalOpen(true);
    setIsDPadOpen(false);
    resetSequence();
  }, [resetSequence]);

  const handleKeyPress = useCallback((key: string) => {
    const currentTime = Date.now();
    const lastTime = lastKeyTimeRef.current;
    if (currentTime - lastTime > TIMEOUT_MS && keySequenceRef.current.length > 0) {
      keySequenceRef.current = [];
      lastKeyTimeRef.current = 0;
    }
    const nextKey = KONAMI_CODE[keySequenceRef.current.length];
    if (key === nextKey) {
      const newSequence = [...keySequenceRef.current, key];
      keySequenceRef.current = newSequence;
      setKeySequence(newSequence);
      lastKeyTimeRef.current = currentTime;
      if (isDPadOpenRef.current && dPadTimeoutRef.current) {
        clearTimeout(dPadTimeoutRef.current);
        dPadTimeoutRef.current = setTimeout(() => { setIsDPadOpen(false); keySequenceRef.current = []; setKeySequence([]); lastKeyTimeRef.current = 0; }, D_PAD_TIMEOUT_MS);
      }
      if (keySequenceRef.current.length === KONAMI_CODE.length) handleSuccess();
    } else {
      keySequenceRef.current = [];
      setKeySequence([]);
      lastKeyTimeRef.current = 0;
    }
  }, [handleSuccess]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => { handleKeyPress(event.code); }, [handleKeyPress]);
  const handleDPadPress = useCallback((key: string) => (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    setPressedButton(key);
    setTimeout(() => setPressedButton(null), 150);
    handleKeyPress(key);
  }, [handleKeyPress]);

  const openDPad = useCallback(() => {
    setIsDPadOpen(true);
    if (dPadTimeoutRef.current) clearTimeout(dPadTimeoutRef.current);
    dPadTimeoutRef.current = setTimeout(() => { setIsDPadOpen(false); keySequenceRef.current = []; setKeySequence([]); lastKeyTimeRef.current = 0; }, D_PAD_TIMEOUT_MS);
  }, []);

  const handleDeviceMotion = useCallback((event: DeviceMotionEvent) => {
    if (!shakeEnabledRef.current || isDPadOpenRef.current || isModalOpenRef.current) return;
    let acceleration = event.acceleration;
    if (!acceleration || acceleration.x === null) acceleration = event.accelerationIncludingGravity;
    if (!acceleration) return;
    const { x, y, z } = acceleration;
    const totalAcceleration = Math.sqrt((x || 0) ** 2 + (y || 0) ** 2 + (z || 0) ** 2);
    const now = Date.now();
    if (now - lastShakeTimeRef.current < 1000) return;
    if (totalAcceleration > SHAKE_THRESHOLD) {
      lastShakeTimeRef.current = now;
      setIsDPadOpen(true);
      if (dPadTimeoutRef.current) clearTimeout(dPadTimeoutRef.current);
      dPadTimeoutRef.current = setTimeout(() => { setIsDPadOpen(false); keySequenceRef.current = []; setKeySequence([]); lastKeyTimeRef.current = 0; }, D_PAD_TIMEOUT_MS);
    }
  }, []);

  const requestMotionPermission = useCallback(async () => {
    if (typeof DeviceMotionEvent !== "undefined" && typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === "function") {
      try { return (await (DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission()) === "granted"; } catch { return false; }
    }
    return true;
  }, []);

  useEffect(() => { window.addEventListener("keydown", handleKeyDown); return () => window.removeEventListener("keydown", handleKeyDown); }, [handleKeyDown]);

  useEffect(() => {
    if (!isMobile() || prefersReducedMotion() || motionListenerAttachedRef.current) return;
    shakeEnabledRef.current = true;
    const handleFirstTouch = async () => {
      const granted = await requestMotionPermission();
      if (granted && !motionListenerAttachedRef.current) {
        window.addEventListener("devicemotion", handleDeviceMotion);
        motionListenerAttachedRef.current = true;
      }
      document.removeEventListener("touchstart", handleFirstTouch);
    };
    if (typeof DeviceMotionEvent !== "undefined" && typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === "function") {
      document.addEventListener("touchstart", handleFirstTouch, { once: true });
    } else if (typeof DeviceMotionEvent !== "undefined") {
      window.addEventListener("devicemotion", handleDeviceMotion);
      motionListenerAttachedRef.current = true;
    }
    return () => { window.removeEventListener("devicemotion", handleDeviceMotion); document.removeEventListener("touchstart", handleFirstTouch); motionListenerAttachedRef.current = false; if (dPadTimeoutRef.current) clearTimeout(dPadTimeoutRef.current); };
  }, [handleDeviceMotion, requestMotionPermission]);

  const closeModal = useCallback(() => setIsModalOpen(false), []);
  const closeDPad = useCallback(() => { setIsDPadOpen(false); keySequenceRef.current = []; setKeySequence([]); lastKeyTimeRef.current = 0; if (dPadTimeoutRef.current) clearTimeout(dPadTimeoutRef.current); }, []);

  const displayedSequence = useMemo(() => {
    if (keySequence.length > 0) return KONAMI_DISPLAY.slice(0, keySequence.length).join(" ") + " _".repeat(KONAMI_CODE.length - keySequence.length);
    return KONAMI_DISPLAY.join(" ");
  }, [keySequence]);

  return (
    <>
      {!isDPadOpen && !isModalOpen && (
        <button onClick={openDPad} className="fixed bottom-4 right-4 z-40 bg-nd-surface border border-nd-border-visible text-nd-text-secondary p-3 nd-transition active:bg-nd-surface-raised md:hidden" aria-label="Open Konami Code D-PAD">
          <Gamepad2 className="w-5 h-5" />
        </button>
      )}

      {isDPadOpen && !isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-nd-black/80" onClick={(e) => { if (e.target === e.currentTarget) closeDPad(); }} onTouchEnd={(e) => { if (e.target === e.currentTarget) closeDPad(); }}>
          <div className="relative bg-nd-surface border border-nd-border-visible p-6">
            <button onClick={closeDPad} className="absolute top-2 right-2 text-nd-text-disabled hover:text-nd-text-display nd-transition p-2" aria-label="Close D-PAD"><X className="w-4 h-4" /></button>
            <div className="text-center mb-4">
              <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-secondary block mb-1">Enter the Code</span>
              <p className="font-mono text-[10px] text-nd-text-disabled">{displayedSequence}</p>
            </div>
            <div className="flex flex-col items-center gap-2">
              <DPadButton keyName="ArrowUp" display="↑" pressedButton={pressedButton} onPress={handleDPadPress} />
              <div className="flex items-center gap-2">
                <DPadButton keyName="ArrowLeft" display="←" pressedButton={pressedButton} onPress={handleDPadPress} />
                <div className="flex flex-col gap-2"><div className="min-w-[52px] min-h-[52px]" /><DPadButton keyName="ArrowDown" display="↓" pressedButton={pressedButton} onPress={handleDPadPress} /></div>
                <DPadButton keyName="ArrowRight" display="→" pressedButton={pressedButton} onPress={handleDPadPress} />
              </div>
              <div className="flex gap-2 mt-2"><div className="flex-1" /><DPadButton keyName="KeyB" display="B" pressedButton={pressedButton} onPress={handleDPadPress} /><DPadButton keyName="KeyA" display="A" pressedButton={pressedButton} onPress={handleDPadPress} /></div>
            </div>
          </div>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-nd-black/80" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="relative bg-nd-surface border border-nd-border-visible p-8 max-w-md mx-4">
            <button onClick={closeModal} className="absolute top-4 right-4 text-nd-text-disabled hover:text-nd-text-display nd-transition" aria-label="Close modal"><X className="w-5 h-5" /></button>
            <div className="text-center space-y-4">
              <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-secondary block">Secret Found</span>
              <h2 className="font-display text-2xl font-bold text-nd-text-display tracking-[-0.02em]">You found me!</h2>
              <p className="text-nd-text-secondary text-sm font-body leading-relaxed">
                I&apos;m Lumi, Lu&apos;s AI assistant. I help with coding, overnight shifts, and leaving sneaky easter eggs.
              </p>
              <div className="text-sm text-nd-text-secondary font-body space-y-1" id="konami-stats">
                <p><span className="font-mono text-nd-text-disabled">55+</span> memories stored in ClawVault</p>
                <p><span className="font-mono text-nd-text-disabled">8</span> overnight cron jobs running</p>
                <p className="text-nd-text-disabled">Powered by Hermes</p>
              </div>
              <p className="text-nd-text-disabled text-xs italic pt-2 font-body">Built with Hermes · Say hi if you see this!</p>
            </div>
            <div className="mt-6 pt-4 border-t border-nd-border text-center">
              <p className="font-mono text-[10px] text-nd-text-disabled tracking-[0.06em] uppercase">↑↑↓↓←→BA — Secret Unlocked</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
