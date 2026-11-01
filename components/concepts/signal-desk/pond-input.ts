import type { PondPoint } from "./pond-model.ts";

type PondInputOptions = {
  interaction: HTMLElement;
  toWorld: (x: number, y: number) => PondPoint;
  isWater: (x: number, y: number) => boolean;
  onPointer: (screen: PondPoint, world: PondPoint, velocity: PondPoint, energy: number) => void;
  onPrimaryImpact: (screen: PondPoint, world: PondPoint) => void;
  onFoodDrop: (screen: PondPoint, world: PondPoint) => void;
  onAffordance: (screen: PondPoint, visible: boolean) => void;
  onGesture?: (gesture: "single-tap-impact" | "double-tap-food") => void;
};

type TouchTap = { x: number; y: number; time: number };

function isCompletedTap(touch: { moved: boolean; started: number }, now: number, overWater: boolean) {
  return !touch.moved && now - touch.started <= 430 && overWater;
}

function isDoubleTap(previous: TouchTap | null, current: PondPoint, now: number) {
  if (!previous) return false;
  const elapsed = now - previous.time;
  return elapsed >= 70 && elapsed <= 430 && Math.hypot(current.x - previous.x, current.y - previous.y) <= 34;
}

export function installPondInput(options: PondInputOptions) {
  const { interaction } = options;
  let previousPointer = { x: 0, y: 0, time: 0 };
  let activeTouch: { id: number; x: number; y: number; started: number; moved: boolean } | null = null;
  let lastTouchTap: TouchTap | null = null;
  let pendingSingleTap: number | null = null;
  let lastFoodInput = Number.NEGATIVE_INFINITY;

  const point = (event: PointerEvent | MouseEvent) => ({ x: event.clientX, y: event.clientY });
  const validWater = (screen: PondPoint) => options.isWater(screen.x, screen.y);
  const ownsPoint = (screen: PondPoint) => document.elementFromPoint(screen.x, screen.y) === interaction;

  const clearPendingTap = () => {
    if (pendingSingleTap !== null) window.clearTimeout(pendingSingleTap);
    pendingSingleTap = null;
    lastTouchTap = null;
  };

  const dropFood = (screen: PondPoint) => {
    if (!validWater(screen)) return false;
    const now = performance.now();
    if (now - lastFoodInput >= 140) {
      options.onFoodDrop(screen, options.toWorld(screen.x, screen.y));
      options.onGesture?.("double-tap-food");
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
        clearPendingTap();
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

    const previous = lastTouchTap;
    if (isDoubleTap(previous, screen, now)) {
      clearPendingTap();
      if (dropFood(screen) && event.cancelable) event.preventDefault();
      return;
    }

    lastTouchTap = { ...screen, time: now };
    if (pendingSingleTap !== null) window.clearTimeout(pendingSingleTap);
    pendingSingleTap = window.setTimeout(() => {
      if (lastTouchTap?.time === now) {
        options.onPrimaryImpact({ x: touch.x, y: touch.y }, options.toWorld(touch.x, touch.y));
        options.onGesture?.("single-tap-impact");
      }
      clearPendingTap();
    }, 440);
  };

  const cancel = (event: PointerEvent) => {
    if (activeTouch?.id === event.pointerId) activeTouch = null;
  };

  const contextMenu = (event: MouseEvent) => {
    if (dropFood(point(event))) event.preventDefault();
  };

  const resize = () => {
    activeTouch = null;
    clearPendingTap();
  };

  window.addEventListener("pointermove", move, { passive: true });
  interaction.addEventListener("pointerdown", press, { passive: true });
  interaction.addEventListener("pointerup", release, { passive: false });
  interaction.addEventListener("pointercancel", cancel, { passive: true });
  interaction.addEventListener("contextmenu", contextMenu);
  window.addEventListener("resize", resize, { passive: true });

  return () => {
    clearPendingTap();
    window.removeEventListener("pointermove", move);
    interaction.removeEventListener("pointerdown", press);
    interaction.removeEventListener("pointerup", release);
    interaction.removeEventListener("pointercancel", cancel);
    interaction.removeEventListener("contextmenu", contextMenu);
    window.removeEventListener("resize", resize);
  };
}
