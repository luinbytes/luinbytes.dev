import { lazy, Suspense, useCallback, useEffect, useRef, useState, type ComponentProps, type SyntheticEvent } from "react";
import { flushSync } from "react-dom";

import styles from "./skullet-image.module.css";

const SKELETON_HOLD_MS = 150;

// Loaded only after an image is still incomplete. A static import pulls Skullet
// into Pip's initial script and breaks the 300KB budget on pages that never wait.
const SkulletOverlay = lazy(() => import("./skullet-overlay"));

type SkulletImageProps = ComponentProps<"img"> & {
  label: string;
  frame?: boolean;
  radius?: string;
};

export function SkulletImage({
  label,
  frame = false,
  radius,
  onLoad,
  onError,
  alt,
  ...rest
}: SkulletImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const timerRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<"pending" | "skeleton" | "ready">("pending");
  const [overlayReady, setOverlayReady] = useState(false);
  const showSkeleton = phase === "skeleton";
  const hideImage = showSkeleton && overlayReady;
  const markOverlayReady = useCallback(() => setOverlayReady(true), []);

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

  function settle(event: SyntheticEvent<HTMLImageElement>, failed: boolean) {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    flushSync(() => {
      setPhase("ready");
      setOverlayReady(false);
    });
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
    <Suspense fallback={null}>
      <SkulletOverlay
        label={label}
        className={frame ? styles.frame : styles.overlay}
        blockClassName={styles.block}
        radius={radius}
        onReady={markOverlayReady}
      />
    </Suspense>
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
