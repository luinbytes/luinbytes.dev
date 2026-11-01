import { Component, lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState, type ComponentProps, type ReactNode, type SyntheticEvent } from "react";
import { flushSync } from "react-dom";

import styles from "./skullet-image.module.css";

const SKELETON_HOLD_MS = 150;
const REVEAL_MS = 200;

type OverlayComponent = typeof import("./skullet-overlay").default;

let readyOverlay: OverlayComponent | null = null;

function rememberOverlay(component: OverlayComponent) {
  readyOverlay = component;
  return component;
}

export function loadSkulletOverlay() {
  if (readyOverlay) return Promise.resolve(true);
  return import("./skullet-overlay")
    .then((mod) => {
      rememberOverlay(mod.default);
      return true;
    })
    .catch(() => false);
}

// Loaded only after an image is still incomplete. A static import pulls Skullet
// into Pip's initial script. A failed chunk drops the skeleton and leaves the image.
const SkulletOverlay = lazy(() =>
  import("./skullet-overlay")
    .then((mod) => ({ default: rememberOverlay(mod.default) }))
    .catch(() => ({
      default: (() => null) as unknown as OverlayComponent,
    })),
);

type SkulletImageProps = ComponentProps<"img"> & {
  label: string;
  frame?: boolean;
  radius?: string;
  inset?: string;
  immediate?: boolean;
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
  immediate = false,
  onLoad,
  onError,
  alt,
  ...rest
}: SkulletImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const timerRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<Phase>(immediate ? "skeleton" : "pending");
  const [overlayReady, setOverlayReady] = useState(false);
  const [chunkFailed, setChunkFailed] = useState(false);
  // The cached module and the lazy tree are different parents. Choosing again
  // after onReady would remount the bone on the same render that hides the image.
  const [cachedOnFirstPaint, setCachedOnFirstPaint] = useState<boolean | null>(null);
  const showSkeleton = !chunkFailed && (phase === "skeleton" || phase === "reveal");
  const hideImage = phase === "skeleton" && (immediate || overlayReady);
  if (showSkeleton && cachedOnFirstPaint === null) {
    setCachedOnFirstPaint(readyOverlay !== null);
  }
  const markOverlayReady = useCallback(() => setOverlayReady(true), []);
  const dropSkeleton = useCallback(() => {
    setChunkFailed(true);
    setOverlayReady(false);
    setPhase((current) => (current === "ready" ? current : "pending"));
  }, []);

  useLayoutEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete && img.naturalWidth > 0) {
      setPhase("ready");
      setOverlayReady(false);
      return;
    }

    if (immediate) {
      setPhase("skeleton");
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
  }, [rest.src, immediate]);

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
    const fade = phase === "skeleton" && (overlayReady || immediate) && !failed && !chunkFailed && !prefersReducedMotion();
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

  const CachedOverlay = readyOverlay;
  const overlayClassName = `${frame ? styles.frame : styles.overlay}${phase === "reveal" ? ` ${styles.fading}` : ""}`;
  const skeleton = showSkeleton ? (
    <SkulletBoundary onFail={dropSkeleton}>
      {cachedOnFirstPaint && CachedOverlay ? (
        <CachedOverlay
          label={label}
          className={overlayClassName}
          blockClassName={styles.block}
          radius={radius}
          inset={inset}
          onReady={markOverlayReady}
        />
      ) : (
        <Suspense fallback={null}>
          <SkulletOverlay
            label={label}
            className={overlayClassName}
            blockClassName={styles.block}
            radius={radius}
            inset={inset}
            onReady={markOverlayReady}
          />
        </Suspense>
      )}
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
