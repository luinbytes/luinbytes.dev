import { useEffect, useRef } from "react";

import styles from "./pond-environment.module.css";

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
        canvasClassName: styles.pondCanvas,
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
        host.dataset.pondState = "fallback";
        host.dataset.fallbackReason = error instanceof Error ? error.message : "renderer-init-failed";
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
        <div ref={hostRef} className={styles.pondHost} data-pond-state="idle" />
        <div className={styles.pondGrade} />
        <div className={styles.surfaceLight} />
      </div>
      <div ref={interactionRef} className={styles.pondInput} aria-hidden="true" />
    </>
  );
}
