"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { Aperture, Palette, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "anomaly" | "void";
type MorphTheme = Theme | null;

const themes: Record<
  Theme,
  {
    label: string;
    next: string;
    Icon: typeof Sparkles;
  }
> = {
  anomaly: {
    label: "Precision",
    next: "Void",
    Icon: Sparkles,
  },
  void: {
    label: "Void",
    next: "Precision",
    Icon: Aperture,
  },
};

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = "dark";
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "anomaly";
  return window.localStorage.getItem("lu-theme") === "void" ? "void" : "anomaly";
}

function getServerTheme(): Theme {
  return "anomaly";
}

function subscribeToThemeChanges(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("lu:theme-change", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("lu:theme-change", onStoreChange);
  };
}

export function ThemeSwitcher() {
  const [morphTheme, setMorphTheme] = useState<MorphTheme>(null);
  const morphTimeoutRef = useRef<number | null>(null);
  const themeSwapTimeoutRef = useRef<number | null>(null);
  const theme = useSyncExternalStore(
    subscribeToThemeChanges,
    getStoredTheme,
    getServerTheme
  );
  const activeTheme = themes[theme];
  const ActiveIcon = activeTheme.Icon;

  const finishMorph = () => {
    morphTimeoutRef.current = null;
    themeSwapTimeoutRef.current = null;
    document.documentElement.classList.remove(
      "theme-morphing",
      "theme-morph-to-anomaly",
      "theme-morph-to-void"
    );
    setMorphTheme(null);
  };

  const toggleTheme = () => {
    if (morphTheme) return;

    const nextTheme = theme === "anomaly" ? "void" : "anomaly";
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (morphTimeoutRef.current) {
      window.clearTimeout(morphTimeoutRef.current);
      morphTimeoutRef.current = null;
    }

    if (themeSwapTimeoutRef.current) {
      window.clearTimeout(themeSwapTimeoutRef.current);
      themeSwapTimeoutRef.current = null;
    }

    const completeThemeChange = () => {
      themeSwapTimeoutRef.current = null;
      applyTheme(nextTheme);
      window.localStorage.setItem("lu-theme", nextTheme);
      window.dispatchEvent(new Event("lu:theme-change"));
    };

    if (prefersReducedMotion) {
      completeThemeChange();
      return;
    }

    setMorphTheme(nextTheme);
    document.documentElement.classList.add(
      "theme-morphing",
      `theme-morph-to-${nextTheme}`
    );

    themeSwapTimeoutRef.current = window.setTimeout(completeThemeChange, 170);
    morphTimeoutRef.current = window.setTimeout(finishMorph, 720);
  };

  return (
    <div className="fixed bottom-5 right-5 z-[90] isolate sm:bottom-6 sm:right-6">
      {morphTheme && (
        <span
          aria-hidden="true"
          className={cn(
            "theme-morph-ripple",
            morphTheme === "void"
              ? "theme-morph-ripple-void"
              : "theme-morph-ripple-anomaly"
          )}
        />
      )}
      <button
        type="button"
        onClick={toggleTheme}
        disabled={morphTheme !== null}
        aria-label={`Switch to ${activeTheme.next} theme`}
        title={`Switch to ${activeTheme.next}`}
        className={cn(
          "theme-switcher-button group flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 border-nd-border-visible bg-nd-surface/92 text-nd-text-display shadow-[5px_5px_0_rgba(20,16,10,0.14)] backdrop-blur nd-focus nd-transition",
          "hover:w-[12rem] hover:-translate-y-1 hover:border-nd-accent hover:bg-nd-text-display hover:text-nd-black",
          "focus-visible:w-[12rem] focus-visible:-translate-y-1 focus-visible:border-nd-accent focus-visible:bg-nd-text-display focus-visible:text-nd-black"
        )}
      >
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,var(--color-nd-accent-subtle),transparent_58%)] opacity-90" />
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-current/35 bg-nd-black/70 text-nd-accent nd-transition group-hover:rotate-12 group-hover:bg-nd-black group-focus-visible:rotate-12 group-focus-visible:bg-nd-black">
          <ActiveIcon className="absolute h-4 w-4 nd-transition group-hover:scale-0 group-focus-visible:scale-0" />
          <Palette className="h-4 w-4 scale-0 nd-transition group-hover:scale-100 group-focus-visible:scale-100" />
        </span>
        <span className="relative ml-0 grid w-0 overflow-hidden text-left opacity-0 nd-transition group-hover:ml-3 group-hover:w-36 group-hover:opacity-100 group-focus-visible:ml-3 group-focus-visible:w-36 group-focus-visible:opacity-100">
          <span className="font-mono text-[10px] font-bold uppercase tracking-label-tight text-current">
            {activeTheme.label}
          </span>
          <span className="mt-0.5 font-mono text-[9px] uppercase tracking-label-tight text-current/70">
            Click for {activeTheme.next}
          </span>
        </span>
      </button>
    </div>
  );
}
