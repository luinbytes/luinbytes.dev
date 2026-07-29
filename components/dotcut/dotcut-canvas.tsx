"use client";

import { useEffect, useRef } from "react";
import { DotCut } from "./engine";

export function DotCutCanvas() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const font = getComputedStyle(host).fontFamily;
    const engine = new DotCut(host, font);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;

    const sync = () => {
      if (reduced.matches) engine.renderStill();
      else if (visible && !document.hidden) engine.start();
      else engine.stop();
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        sync();
      },
      { threshold: 0.01 },
    );
    const pointer = (event: PointerEvent) => {
      const rect = host.getBoundingClientRect();
      engine.setPointer(event.clientX - rect.left, event.clientY - rect.top);
    };
    const clear = () => engine.clearPointer();

    observer.observe(host);
    host.addEventListener("pointermove", pointer);
    host.addEventListener("pointerleave", clear);
    document.addEventListener("visibilitychange", sync);
    reduced.addEventListener("change", sync);
    sync();
    return () => {
      observer.disconnect();
      host.removeEventListener("pointermove", pointer);
      host.removeEventListener("pointerleave", clear);
      document.removeEventListener("visibilitychange", sync);
      reduced.removeEventListener("change", sync);
      engine.destroy();
    };
  }, []);

  return <div ref={hostRef} className="dotcut-canvas" />;
}
