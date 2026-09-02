"use client";

import { useEffect, useRef } from "react";

import styles from "./pond-environment.module.css";

const DEBUG_ATTRIBUTES = process.env.NODE_ENV === "production" ? {} : {
  "data-pixi-state": "idle",
  "data-ripple-count": "0",
  "data-ring-count": "0",
  "data-wake-count": "0",
  "data-fish-count": "0",
  "data-food-count": "0",
  "data-food-dropped-count": "0",
  "data-food-expired-count": "0",
  "data-fish-fed-count": "0",
  "data-primary-impact-count": "0",
  "data-food-affordance": "false",
  "data-pond-element-count": "0",
  "data-insect-count": "0",
  "data-cat-count": "0",
  "data-cat-state": "idle",
  "data-cat-pounce-count": "0",
  "data-cat-bap-count": "0",
  "data-cat-empty-bap-count": "0",
  "data-cat-water-violation": "false",
  "data-cat-rotation": "0.000",
  "data-fish-reacting": "false",
  "data-fish-water-violation": "false",
} as const;

export function PondEnvironment({ reduced }: { reduced: boolean }) {
  const pondRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pond = pondRef.current;
    const host = hostRef.current;
    const interaction = interactionRef.current;
    if (!pond || !host || !interaction) return;

    pond.dataset.renderer = "fallback";
    const controller = new AbortController();
    let disposed = false;
    let cleanup = () => {};
    void import("./pond-renderer")
      .then(({ startPondRenderer }) => startPondRenderer({
        pond,
        host,
        interaction,
        reduced,
        canvasClassName: styles.pixiCanvas,
        signal: controller.signal,
      }))
      .then((stop) => {
        if (disposed) stop();
        else cleanup = stop;
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        host.replaceChildren();
        pond.dataset.renderer = "fallback";
        if (process.env.NODE_ENV !== "production") {
          host.dataset.pixiState = "fallback";
          host.dataset.fallbackReason = error instanceof Error ? error.message : "renderer-init-failed";
        }
      });

    return () => {
      disposed = true;
      controller.abort();
      cleanup();
    };
  }, [reduced]);

  return (
    <>
      <div ref={pondRef} className={styles.pond} data-renderer="fallback" aria-hidden="true">
        <div className={styles.pondImage} />
        <div ref={hostRef} className={styles.pixiHost} {...DEBUG_ATTRIBUTES} />
        <div className={styles.pondGrade} />
        <div className={styles.surfaceLight} />
      </div>
      <div ref={interactionRef} className={styles.pondInput} aria-hidden="true" />
    </>
  );
}
