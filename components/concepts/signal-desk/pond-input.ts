import type { PondPoint } from "./pond-model.ts";

type PondInputOptions = {
  interaction: HTMLElement;
  toWorld: (x: number, y: number) => PondPoint;
  isWater: (x: number, y: number) => boolean;
  onPointer: (screen: PondPoint, world: PondPoint, velocity: PondPoint, energy: number) => void;
  onPrimaryImpact: (screen: PondPoint, world: PondPoint) => void;
  onFoodDrop: (screen: PondPoint, world: PondPoint) => void;
  onAffordance: (screen: PondPoint, visible: boolean) => void;
  onGesture?: (gesture: "tap-food") => void;
};

function isCompletedTap(touch: { moved: boolean; started: number }, now: number, overWater: boolean) {
  return !touch.moved && now - touch.started <= 430 && overWater;
}

// A single click or tap on open water splashes and drops food. The browser's
// context menu is never intercepted. Keyboard users feed through the
// "pond-feed" event (see feedFromControl).

export function installPondInput(options: PondInputOptions) {
  const { interaction } = options;
  let previousPointer = { x: 0, y: 0, time: 0 };
  let activeTouch: { id: number; x: number; y: number; started: number; moved: boolean } | null = null;
  let lastFoodInput = Number.NEGATIVE_INFINITY;

  const point = (event: PointerEvent) => ({ x: event.clientX, y: event.clientY });
  const validWater = (screen: PondPoint) => options.isWater(screen.x, screen.y);
  const ownsPoint = (screen: PondPoint) => document.elementFromPoint(screen.x, screen.y) === interaction;

  const dropFood = (screen: PondPoint) => {
    if (!validWater(screen)) return false;
    const now = performance.now();
    if (now - lastFoodInput >= 140) {
      options.onFoodDrop(screen, options.toWorld(screen.x, screen.y));
      options.onGesture?.("tap-food");
      lastFoodInput = now;
    }
    return true;
  };

  const move = (event: PointerEvent) => {
    const now = performance.now();
    const screen = point(event);
    const elapsed = Math.max(16, now - previousPointer.time);
    let velocity = {
      x: (screen.x - previousPointer.x) / elapsed * 1000,
      y: (screen.y - previousPointer.y) / elapsed * 1000,
    };
    const speed = Math.hypot(velocity.x, velocity.y);
    if (speed > 900) velocity = { x: velocity.x * 900 / speed, y: velocity.y * 900 / speed };
    const distance = Math.hypot(screen.x - previousPointer.x, screen.y - previousPointer.y);
    const overWater = ownsPoint(screen) && validWater(screen);
    const energy = overWater ? (previousPointer.time ? Math.min(1, 0.46 + distance / elapsed * 0.46) : 0.55) : 0;
    options.onPointer(screen, options.toWorld(screen.x, screen.y), overWater ? velocity : { x: 0, y: 0 }, energy);
    options.onAffordance(screen, event.pointerType !== "touch" && overWater);
    previousPointer = { ...screen, time: now };

    if (activeTouch?.id === event.pointerId && Math.hypot(screen.x - activeTouch.x, screen.y - activeTouch.y) > 16) {
      activeTouch.moved = true;
    }
  };

  const press = (event: PointerEvent) => {
    const screen = point(event);
    if (event.pointerType === "touch") {
      if (!event.isPrimary || activeTouch) {
        activeTouch = null;
        return;
      }
      activeTouch = {
        id: event.pointerId,
        x: screen.x,
        y: screen.y,
        started: performance.now(),
        moved: false,
      };
      interaction.setPointerCapture(event.pointerId);
      return;
    }
    if (event.button === 0 && validWater(screen)) {
      options.onPrimaryImpact(screen, options.toWorld(screen.x, screen.y));
      dropFood(screen);
    }
  };

  const release = (event: PointerEvent) => {
    if (event.pointerType !== "touch" || !activeTouch || activeTouch.id !== event.pointerId) return;
    const touch = activeTouch;
    activeTouch = null;
    if (interaction.hasPointerCapture(event.pointerId)) interaction.releasePointerCapture(event.pointerId);
    const now = performance.now();
    const screen = point(event);
    if (!validWater(touch) || !isCompletedTap(touch, now, validWater(screen))) return;

    options.onPrimaryImpact({ x: touch.x, y: touch.y }, options.toWorld(touch.x, touch.y));
    if (dropFood(screen) && event.cancelable) event.preventDefault();
  };

  const cancel = (event: PointerEvent) => {
    if (activeTouch?.id === event.pointerId) activeTouch = null;
  };

  // Keyboard and screen reader feeding. The pond surface is aria-hidden, so a
  // visually hidden "Feed fish" control dispatches a cancelable "pond-feed"
  // event here. Search a centre-out grid for open water that no page content
  // ([data-pond-obscures]) covers and drop food at the first hit. Calling
  // preventDefault tells the dispatcher that food was dropped.
  const feedCandidates = [0.5, 0.3, 0.7, 0.15, 0.85, 0.05, 0.95];
  const isObscured = (screen: PondPoint) =>
    [...document.querySelectorAll("[data-pond-obscures]")].some(element => {
      const box = element.getBoundingClientRect();
      return screen.x >= box.left && screen.x <= box.right && screen.y >= box.top && screen.y <= box.bottom;
    });

  const feedFromControl = (event: Event) => {
    for (const y of feedCandidates) {
      for (const x of feedCandidates) {
        const screen = { x: innerWidth * x, y: innerHeight * y };
        if (!isObscured(screen) && ownsPoint(screen) && dropFood(screen)) {
          event.preventDefault();
          return;
        }
      }
    }
  };

  const resize = () => {
    activeTouch = null;
  };

  window.addEventListener("pointermove", move, { passive: true });
  interaction.addEventListener("pointerdown", press, { passive: true });
  interaction.addEventListener("pointerup", release, { passive: false });
  interaction.addEventListener("pointercancel", cancel, { passive: true });
  interaction.addEventListener("pond-feed", feedFromControl);
  window.addEventListener("resize", resize, { passive: true });

  return () => {
    window.removeEventListener("pointermove", move);
    interaction.removeEventListener("pointerdown", press);
    interaction.removeEventListener("pointerup", release);
    interaction.removeEventListener("pointercancel", cancel);
    interaction.removeEventListener("pond-feed", feedFromControl);
    window.removeEventListener("resize", resize);
  };
}
