export type PondPoint = { x: number; y: number };

export type PondTarget = {
  id: string;
  type: "fish" | "fly";
  position: PondPoint;
  velocity: PondPoint;
  visible: boolean;
  attackable: boolean;
  interactionRange: number;
  bodyRadius?: number;
  species?: string;
  danger?: number;
};

export type FishFoodState = "dropping" | "floating" | "depleted";

export type FishFoodEntity = {
  id: string;
  position: PondPoint;
  age: number;
  state: FishFoodState;
  remainingAmount: number;
  attractionRadius: number;
  consumed: boolean;
  expired: boolean;
  pelletSize: number;
  settleDelay: number;
  lifetime: number;
  dropProgress: number;
};

export type FishFoodStateName =
  | "cruising"
  | "detecting-food"
  | "approaching-food"
  | "circling"
  | "feeding"
  | "startled"
  | "returning-to-cruise";

export type FishWorldIntent = {
  fishId: string;
  state: FishFoodStateName;
  foodId: string | null;
  goal: PondPoint | null;
  arrivalRadius: number;
  speedScale: number;
  reserved: boolean;
  feedingPulse: number;
  reason: string;
};

export type FlyRoutineState = "hovering" | "foraging" | "resting" | "startled";

export type FlyWorldIntent = {
  flyId: string;
  state: FlyRoutineState;
  goal: PondPoint;
  speedScale: number;
  reason: string;
};

export type PondWorldEvent =
  | { type: "ambient-ripple"; position: PondPoint; strength: number }
  | { type: "food-dropped"; foodId: string; position: PondPoint; rippleStrength: number; merged: boolean }
  | { type: "fish-state"; fishId: string; from: FishFoodStateName; to: FishFoodStateName; reason: string }
  | { type: "fish-noticed-food"; fishId: string; foodId: string }
  | { type: "fish-reserved-food"; fishId: string; foodId: string; slot: number }
  | { type: "fish-arrived"; fishId: string; foodId: string; position: PondPoint }
  | { type: "fish-fed"; fishId: string; foodId: string; position: PondPoint; remainingAmount: number }
  | { type: "food-expired"; foodId: string; position: PondPoint; consumed: boolean; reason: "consumed" | "lifetime" | "capacity" }
  | { type: "fly-state"; flyId: string; from: FlyRoutineState; to: FlyRoutineState; reason: string };

export type PondWorldInput = {
  now: number;
  delta: number;
  targets: readonly PondTarget[];
  foodApproach?: (fish: PondTarget, food: PondPoint, arrivalRadius: number, preferred: PondPoint) => PondPoint | null;
};

export type PondWorldFrame = {
  environment: {
    wind: number;
    currentA: PondPoint;
    currentB: PondPoint;
    surfaceA: PondPoint;
    surfaceB: PondPoint;
    light: number;
  };
  foods: readonly FishFoodEntity[];
  fish: readonly FishWorldIntent[];
  flies: readonly FlyWorldIntent[];
  events: readonly PondWorldEvent[];
  debug: {
    seed: number;
  };
};

export function pondDistance(a: PondPoint, b: PondPoint) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function pondLerp(a: number, b: number, amount: number) {
  return a + (b - a) * amount;
}

export function pondClamp(value: number, minimum: number, maximum: number) {
  return Math.max(minimum, Math.min(maximum, value));
}

export function pondSmoothstep(value: number) {
  const clamped = pondClamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

export function pondAngleDelta(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

export function pondHashSeed(value: string | number) {
  if (typeof value === "number") return value >>> 0;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function createPondRandom(seedValue: string | number) {
  return seededRandom(pondHashSeed(seedValue));
}
