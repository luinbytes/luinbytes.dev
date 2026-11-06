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
  const transitionRef = useRef<HTMLImageElement | null>(null);
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  useEffect(() => {
    const pond = pondRef.current;
    const host = hostRef.current;
    const interaction = interactionRef.current;
    if (!pond || !host || !interaction) return;

    pond.querySelectorAll('[data-pond-transition][data-fade]').forEach((image) => image.remove());
    if (reduced) {
      transitionRef.current?.remove();
      transitionRef.current = null;
    }
    pond.dataset.motion = reduced ? "reduced" : "full";
    pond.toggleAttribute("data-switching", Boolean(transitionRef.current));
    pond.dataset.view = mode;
    pond.dataset.renderer = "loading";
    for (const key of Object.keys(host.dataset)) delete host.dataset[key];
    host.dataset.pondState = "loading";
    delete document.documentElement.dataset.pondBoot;
    const controller = new AbortController();
    let disposed = false;
    let cleanup = () => {};
    let capture: (() => string) | undefined;
    const observer = new MutationObserver(() => {
      if (pond.dataset.renderer !== "three" && pond.dataset.renderer !== "fallback") return;
      const image = transitionRef.current;
      if (!image || reduced) {
        image?.remove();
        pond.removeAttribute("data-switching");
      } else {
        image.dataset.fade = "";
        image.addEventListener("animationend", () => {
          if (image.parentElement !== pond) return;
          image.remove();
          if (!pond.querySelector("[data-pond-transition]")) pond.removeAttribute("data-switching");
        }, { once: true });
      }
      transitionRef.current = null;
    });
    observer.observe(pond, { attributes: true, attributeFilter: ["data-renderer"] });
    void (mode === "pixel" ? import("./pond-pixel-renderer") : import("./pond-renderer"))
      .then(({ startPondRenderer }) => disposed ? undefined : startPondRenderer({
        pond,
        host,
        interaction,
        reduced,
        canvasClassName: styles.pondCanvas,
        signal: controller.signal,
        onCaptureReady: (snapshot) => { capture = snapshot; },
      }))
      .then((stop) => {
        if (!stop) return;
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
      observer.disconnect();
      if (!reduced && !reducedRef.current && capture && pond.dataset.renderer === "three") {
        try {
          const image = document.createElement("img");
          image.alt = "";
          image.dataset.pondTransition = "";
          image.src = capture();
          transitionRef.current?.remove();
          transitionRef.current = image;
          pond.append(image);
        } catch {
          transitionRef.current?.remove();
          transitionRef.current = null;
        }
      }
      controller.abort();
      cleanup();
    };
  }, [mode, reduced]);

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
