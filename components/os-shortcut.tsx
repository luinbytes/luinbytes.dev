"use client";

import { useSyncExternalStore } from "react";

function getCommandShortcut() {
  if (typeof window === "undefined") {
    return "Ctrl K";
  }

  const isCoarsePointer =
    window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const isTouchFirst = isCoarsePointer && navigator.maxTouchPoints > 0;

  if (isTouchFirst) {
    return "Tap";
  }

  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string };
  };
  const platform = nav.userAgentData?.platform ?? navigator.platform ?? "";
  const isMac = /mac|iphone|ipad|ipod/i.test(platform);
  return isMac ? "⌘ K" : "Ctrl K";
}

function subscribe() {
  return () => {};
}

export function useCommandShortcut() {
  return useSyncExternalStore(subscribe, getCommandShortcut, () => "Ctrl K");
}

export function CommandShortcut() {
  return <>{useCommandShortcut()}</>;
}
