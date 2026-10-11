import { useEffect, useRef, useState } from "react";
import { Check, Pause, Play, Search } from "lucide-react";
import { PipFace } from "./pip-logo";
import type { createDemoRenderer } from "./pip-web-search-renderer";
import styles from "./pip-web-search-demo.module.css";

type Phase = "search" | "product" | "addcart" | "postage" | "review" | "done";
type Step = {
  phase: Phase;
  start: number;
  duration: number;
  label: string;
  speech: string;
};
const timeline: readonly Step[] = [
  {
    phase: "search",
    start: 0,
    duration: 2400,
    label: "Searching the web",
    speech: "I'll find a match.",
  },
  {
    phase: "product",
    start: 2400,
    duration: 2200,
    label: "Opening a result",
    speech: "Found the one.",
  },
  {
    phase: "addcart",
    start: 4600,
    duration: 2000,
    label: "Adding to the basket",
    speech: "Into the basket.",
  },
  {
    phase: "postage",
    start: 6600,
    duration: 2800,
    label: "Filling postage details",
    speech: "Details filled in.",
  },
  {
    phase: "review",
    start: 9400,
    duration: 2400,
    label: "Reviewing checkout",
    speech: "One final check.",
  },
  {
    phase: "done",
    start: 11800,
    duration: 6500,
    label: "All sorted",
    speech: "One less thing.",
  },
];
const completedStep = timeline[timeline.length - 1];
const sequenceDuration = completedStep.start + completedStep.duration;

function sampleFrame(elapsed: number) {
  const time = elapsed % sequenceDuration;
  const step =
    timeline.find(
      (entry) => time >= entry.start && time < entry.start + entry.duration,
    ) ?? completedStep;
  return {
    step,
    portion: (time - step.start) / step.duration,
    drift: Math.sin(time / 1800),
  };
}

function BrowserContent({ phase }: { phase: Phase }) {
  if (phase === "done")
    return (
      <div className={styles.done}>
        <span className={styles.seal}>
          <Check />
        </span>
        <strong>All sorted.</strong>
        <p>One less thing on your list.</p>
        <div className={styles.skeleton} />
        <div className={styles.shortSkeleton} />
      </div>
    );
  if (phase === "postage")
    return (
      <>
        <div className={styles.heading}>
          Postage details <span>1 / 2</span>
        </div>
        <div className={styles.field}>
          Name<span>Alex Example</span>
        </div>
        <div className={styles.field}>
          Address<span data-typed="address">12 Example Lane</span>
        </div>
        <div className={styles.fields}>
          <div className={styles.field}>
            Town<span>Sampleton</span>
          </div>
          <div className={styles.field}>
            Postcode<span>AB1 2CD</span>
          </div>
        </div>
        <div className={styles.bottom}>
          <small>Example details</small>
          <span className={styles.action} data-demo-target>
            Continue
          </span>
        </div>
      </>
    );
  if (phase === "review" || phase === "addcart")
    return (
      <>
        <div className={styles.heading}>
          {phase === "review" ? "Review checkout" : "Your basket"}
          <span>{phase === "review" ? "2 / 2" : "1 item"}</span>
        </div>
        <div className={styles.cart}>
          <div className={styles.smallBook} />
          <div>
            <strong>Everyday notebook</strong>
            <div className={styles.shortSkeleton} />
            <small>£12.00</small>
          </div>
        </div>
        <div className={styles.bottom}>
          <small>
            {phase === "review" ? "Demo total · £15" : "Ready when you are"}
          </small>
          <span className={styles.action} data-demo-target>
            {phase === "review" ? "Confirm order" : "Checkout"}
          </span>
        </div>
      </>
    );
  return (
    <>
      <div className={styles.heading}>
        {phase === "search" ? "Find something useful" : "Everyday notebook"}
        <Search />
      </div>
      {phase === "search" && (
        <div className={styles.search} data-typed="search">
          a notebook for my desk
        </div>
      )}
      <div className={styles.product}>
        <div className={styles.productArt}>
          <div className={styles.book} />
        </div>
        <div>
          <strong>
            {phase === "search"
              ? "A notebook for your desk"
              : "Everyday notebook"}
          </strong>
          <div className={styles.skeleton} />
          <div className={styles.shortSkeleton} />
          <small>£12.00</small>
          <span className={styles.action} data-demo-target>
            {phase === "search" ? "View notebook" : "Add to cart"}
          </span>
        </div>
      </div>
    </>
  );
}

export function PipWebSearchDemo() {
  const stageRef = useRef<HTMLDivElement>(null);
  const companionRef = useRef<HTMLDivElement>(null);
  const playingRef = useRef(true);
  const wakeRef = useRef<() => void>(() => {});
  const [step, setStep] = useState<Step>(completedStep);
  const [rendererKind, setRendererKind] = useState<
    "pending" | "three" | "fallback"
  >("pending");
  const [playing, setPlaying] = useState(true);
  const [requestedPlay, setRequestedPlay] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(false);

  useEffect(() => {
    const stageElement = stageRef.current;
    if (!stageElement) return;
    const stage = stageElement;
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const theme = matchMedia("(prefers-color-scheme: light)");
    let renderer: ReturnType<typeof createDemoRenderer> | undefined;
    let visible = false;
    let disposed = false;
    let failed = false;
    let loading = false;
    let generation = 0;
    let raf = 0;
    let elapsed = 0;
    let previous = 0;
    let current: Phase = "done";
    let cursorX = 0.4;
    let cursorY = 0.3;

    function stop() {
      cancelAnimationFrame(raf);
      raf = 0;
      previous = 0;
    }

    function fail() {
      failed = true;
      stop();
      renderer?.dispose();
      renderer = undefined;
      setRendererKind("fallback");
      setControlsVisible(false);
      setStep(completedStep);
      playingRef.current = false;
      setRequestedPlay(false);
      setPlaying(false);
    }

    function resize() {
      try {
        renderer?.resize(stage.clientWidth, stage.clientHeight, theme.matches);
        if (renderer) draw(elapsed, 0);
      } catch {
        fail();
      }
    }

    function draw(time: number, delta: number) {
      const frame = sampleFrame(time);
      if (current !== frame.step.phase) {
        current = frame.step.phase;
        setStep(frame.step);
      }
      const typed = stage.querySelector<HTMLElement>("[data-typed]");
      if (typed) {
        const text =
          typed.dataset.typed === "search"
            ? "a notebook for my desk"
            : "12 Example Lane";
        typed.textContent = text.slice(
          0,
          Math.floor(Math.min(1, frame.portion * 2.2) * text.length),
        );
      }
      const bounds = stage.getBoundingClientRect();
      const target = stage
        .querySelector<HTMLElement>("[data-demo-target]")
        ?.getBoundingClientRect();
      const targetX = target
        ? (target.left + target.width * 0.65 - bounds.left) / bounds.width
        : 0.82;
      const targetY = target
        ? (target.top + target.height * 0.6 - bounds.top) / bounds.height
        : 0.65;
      const ease = 1 - Math.exp(-delta / 180);
      cursorX += (targetX - cursorX) * ease;
      cursorY += (targetY - cursorY) * ease;
      if (companionRef.current)
        companionRef.current.style.transform = `translateY(${frame.drift * 3}px) rotate(${frame.drift * 1.5}deg)`;
      const ripple =
        frame.portion > 0.72 && frame.portion < 0.96
          ? (frame.portion - 0.72) / 0.24
          : 0;
      renderer?.render({
        cursorX,
        cursorY,
        ripple,
        drift: frame.drift,
        complete: frame.step.phase === "done",
      });
    }

    function tick(now: number) {
      raf = 0;
      if (disposed) return;
      if (motion.matches) {
        motionChanged();
        return;
      }
      if (!visible || document.hidden || !playingRef.current || !renderer)
        return;
      const delta = previous ? Math.min(now - previous, 60) : 0;
      previous = now;
      elapsed += delta;
      try {
        draw(elapsed, delta);
      } catch {
        fail();
        return;
      }
      raf = requestAnimationFrame(tick);
    }

    async function loadRenderer() {
      if (
        renderer ||
        loading ||
        failed ||
        motion.matches ||
        !visible ||
        document.hidden
      )
        return;
      loading = true;
      const requestGeneration = generation;
      try {
        const module = await import("./pip-web-search-renderer");
        if (
          disposed ||
          requestGeneration !== generation ||
          motion.matches ||
          !visible ||
          document.hidden
        )
          return;
        renderer = module.createDemoRenderer(stage, fail);
        resize();
        if (failed) return;
        setRendererKind("three");
        setControlsVisible(true);
        wake();
      } catch {
        if (!disposed && requestGeneration === generation) fail();
      } finally {
        loading = false;
        if (
          !disposed &&
          !renderer &&
          !failed &&
          visible &&
          !motion.matches &&
          !document.hidden
        )
          wake();
      }
    }

    function wake() {
      stop();
      setPlaying(
        playingRef.current &&
          visible &&
          !document.hidden &&
          !motion.matches &&
          !failed,
      );
      if (disposed || motion.matches || failed || !visible || document.hidden)
        return;
      if (!renderer) {
        void loadRenderer();
        return;
      }
      if (playingRef.current) raf = requestAnimationFrame(tick);
    }

    function motionChanged() {
      generation += 1;
      stop();
      if (motion.matches) {
        renderer?.dispose();
        renderer = undefined;
        current = "done";
        elapsed = 0;
        setStep(completedStep);
        setRendererKind("fallback");
        setControlsVisible(false);
        setPlaying(false);
        if (companionRef.current) companionRef.current.style.transform = "";
      } else {
        setPlaying(playingRef.current);
        setRendererKind(failed ? "fallback" : "pending");
        wake();
      }
    }

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      wake();
    });
    const resizeObserver = new ResizeObserver(resize);
    observer.observe(stage);
    resizeObserver.observe(stage);
    document.addEventListener("visibilitychange", wake);
    motion.addEventListener("change", motionChanged);
    theme.addEventListener("change", resize);
    wakeRef.current = wake;
    if (motion.matches) motionChanged();
    return () => {
      disposed = true;
      generation += 1;
      stop();
      observer.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", wake);
      motion.removeEventListener("change", motionChanged);
      theme.removeEventListener("change", resize);
      renderer?.dispose();
      wakeRef.current = () => {};
    };
  }, []);

  function togglePlayback() {
    playingRef.current = !playingRef.current;
    setRequestedPlay(playingRef.current);
    setPlaying(playingRef.current);
    wakeRef.current();
  }

  return (
    <div
      className={styles.demo}
      data-testid="pip-browser-demo"
      data-renderer={rendererKind}
      data-playback={playing ? "playing" : "paused"}
      data-phase={step.phase}
    >
      <div
        className={styles.stage}
        ref={stageRef}
        data-demo-stage
        aria-hidden="true"
      >
        <div
          className={styles.companion}
          ref={companionRef}
          data-demo-companion
        >
          <PipFace />
          <span>{step.speech}</span>
        </div>
        <div className={styles.browser} data-demo-browser>
          <div className={styles.chrome}>
            <i />
            <i />
            <i />
            <span>pip / browsing demo</span>
            <Search />
          </div>
          <div className={styles.content}>
            <BrowserContent phase={step.phase} />
          </div>
        </div>
        <div className={styles.status}>{step.label}</div>
      </div>
      <div className={styles.caption}>
        <span>Illustrative demo</span>
        {controlsVisible && (
          <button
            type="button"
            onClick={togglePlayback}
            aria-label={
              requestedPlay ? "Pause browsing demo" : "Play browsing demo"
            }
          >
            {requestedPlay ? (
              <Pause aria-hidden="true" />
            ) : (
              <Play aria-hidden="true" />
            )}
            <span>{requestedPlay ? "Pause" : "Play"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
