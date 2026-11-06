import { useEffect, useRef, useSyncExternalStore } from "react";
import { Skeleton } from "skullet/react";
import "skullet/styles.css";

import styles from "./pond-environment.module.css";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function PondEnvironment({ reduced, mode = "ascii" }: { reduced: boolean; mode?: "ascii" | "pixel" }) {
  const hydrated = useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
  const pondRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const interactionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    const pond = pondRef.current;
    if (!host || !pond) return;
    pond.dataset.view = mode;
    host.dispatchEvent(new Event("pond-view-change"));
  }, [mode]);

  useEffect(() => {
    const pond = pondRef.current;
    const host = hostRef.current;
    const interaction = interactionRef.current;
    if (!pond || !host || !interaction) return;

    pond.dataset.renderer = "loading";
    delete document.documentElement.dataset.pondBoot;
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
      <noscript><style>{`.${styles.pondImage} { visibility: visible !important; } .${styles.pondSkeleton} { display: none !important; }`}</style></noscript>
      <div ref={pondRef} className={styles.pond} data-renderer="fallback" aria-hidden="true">
        <div className={styles.pondImage} />
        <div ref={hostRef} className={styles.pondHost} data-pond-state="idle" />
        {hydrated && <Skeleton key={reduced ? "reduced" : "full"} loading label="Loading pond" className={styles.pondSkeleton}>
          <span {...{ "skullet-block": "" }} className={styles.pondSkeletonBlock} />
        </Skeleton>}
        <div className={styles.pondGrade} />
        <div className={styles.surfaceLight} />
      </div>
      <div ref={interactionRef} className={styles.pondInput} aria-hidden="true" />
    </>
  );
}
