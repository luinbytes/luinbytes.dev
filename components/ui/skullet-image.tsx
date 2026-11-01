import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ComponentProps, type ReactNode, type SyntheticEvent } from "react";
import { flushSync } from "react-dom";

import styles from "./skullet-image.module.css";

const SKELETON_HOLD_MS = 150;
const REVEAL_MS = 200;

// Loaded only after an image is still incomplete. A static import pulls Skullet
// into Pip's initial script. A failed chunk drops the skeleton and leaves the image.
const SkulletOverlay = lazy(() =>
  import("./skullet-overlay").catch(() => ({
    default: (() => null) as unknown as typeof import("./skullet-overlay").default,
  })),
);

type SkulletImageProps = ComponentProps<"img"> & {
  label: string;
  frame?: boolean;
  radius?: string;
  inset?: string;
};

type Phase = "pending" | "skeleton" | "reveal" | "ready";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

class SkulletBoundary extends Component<{ children: ReactNode; onFail: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onFail();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function SkulletImage({
  label,
  frame = false,
  radius,
  inset,
  onLoad,
  onError,
  alt,
  ...rest
}: SkulletImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const timerRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<Phase>("pending");
  const [overlayReady, setOverlayReady] = useState(false);
  const showSkeleton = phase === "skeleton" || phase === "reveal";
  const hideImage = phase === "skeleton" && overlayReady;
  const markOverlayReady = useCallback(() => setOverlayReady(true), []);
  const dropSkeleton = useCallback(() => {
    setOverlayReady(false);
    setPhase((current) => (current === "ready" ? current : "pending"));
  }, []);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete) {
      setPhase("ready");
      setOverlayReady(false);
      return;
    }

    setPhase("pending");
    setOverlayReady(false);
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      if (imgRef.current && !imgRef.current.complete) setPhase("skeleton");
    }, SKELETON_HOLD_MS);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [rest.src]);

  useEffect(() => {
    if (phase !== "reveal") return;
    const timeout = window.setTimeout(() => {
      setPhase("ready");
      setOverlayReady(false);
    }, REVEAL_MS);
    return () => window.clearTimeout(timeout);
  }, [phase]);

  function settle(event: SyntheticEvent<HTMLImageElement>, failed: boolean) {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const fade = phase === "skeleton" && overlayReady && !failed && !prefersReducedMotion();
    if (fade) {
      flushSync(() => setPhase("reveal"));
    } else {
      flushSync(() => {
        setPhase("ready");
        setOverlayReady(false);
      });
    }
    if (failed) onError?.(event);
    else onLoad?.(event);
  }

  const image = (
    <img
      {...rest}
      ref={imgRef}
      alt={alt}
      data-skullet-media=""
      data-pending-media={hideImage ? "" : undefined}
      aria-hidden={hideImage ? true : undefined}
      onLoad={(event) => settle(event, false)}
      onError={(event) => settle(event, true)}
    />
  );

  const skeleton = showSkeleton ? (
    <SkulletBoundary onFail={dropSkeleton}>
      <Suspense fallback={null}>
        <SkulletOverlay
          label={label}
          className={`${frame ? styles.frame : styles.overlay}${phase === "reveal" ? ` ${styles.fading}` : ""}`}
          blockClassName={styles.block}
          radius={radius}
          inset={inset}
          onReady={markOverlayReady}
        />
      </Suspense>
    </SkulletBoundary>
  ) : null;

  if (frame) {
    return (
      <>
        {image}
        {skeleton}
      </>
    );
  }

  return (
    <span className={styles.slot}>
      {image}
      {skeleton}
    </span>
  );
}
