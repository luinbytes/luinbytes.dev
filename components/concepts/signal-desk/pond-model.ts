export type PondPoint = { x: number; y: number };

export type PondTarget = {
  id: string;
  type: "fish" | "fly";
  position: PondPoint;
  velocity: PondPoint;
  visible: boolean;
  attackable: boolean;
  interactionRange: number;
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

export type RockSurface = {
  id: string;
  center: PondPoint;
  tangent: PondPoint;
  normal: PondPoint;
  sittingRegion: { radiusX: number; radiusY: number };
  surfaceAngle: number;
  anchors: readonly { id: string; local: PondPoint; clearance: number }[];
};

export type RockAnchor = {
  id: string;
  rockId: string;
  position: PondPoint;
  normal: PondPoint;
  surfaceAngle: number;
  clearance: number;
  surfaceArea: number;
};

export type CatWorldState =
  | "idle"
  | "observe"
  | "notice-target"
  | "approach"
  | "anticipate-hop"
  | "airborne"
  | "land"
  | "settle"
  | "prepare-bat"
  | "bat"
  | "react"
  | "recover";

export type CatRoutine = "resting" | "watching" | "hunting" | "patrolling";

export type PondWorldEvent =
  | { type: "transition"; from: CatWorldState; to: CatWorldState; reason: string }
  | { type: "takeoff"; fromAnchor: string; toAnchor: string }
  | { type: "land"; anchorId: string; position: PondPoint; impact: number }
  | {
      type: "bat";
      targetId: string;
      targetType: PondTarget["type"];
      aim: PondPoint;
      distance: number;
      reach: number;
      hit: boolean;
    }
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
  visibleAnchorIds: readonly string[];
};

export type PondWorldFrame = {
  cat: {
    state: CatWorldState;
    routine: CatRoutine;
    contact: PondPoint;
    lift: number;
    squashX: number;
    squashY: number;
    surfaceAngle: number;
    facing: 1 | -1;
    aim: PondPoint;
    grounded: boolean;
    anchorId: string;
    rockId: string;
    destinationAnchorId: string | null;
    selectedTargetId: string | null;
    selectedTargetType: PondTarget["type"] | null;
    batReach: number;
  };
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
    reason: string;
    grounded: boolean;
    selectedTarget: string | null;
    destinationAnchor: string | null;
    routine: CatRoutine;
  };
};

export const ROCK_SURFACES: readonly RockSurface[] = [
  {
    id: "south-stone",
    center: { x: 790, y: 954 },
    tangent: { x: 0.999, y: -0.035 },
    normal: { x: 0.035, y: 0.999 },
    sittingRegion: { radiusX: 67, radiusY: 34 },
    surfaceAngle: -0.035,
    anchors: [{ id: "south-stone-top", local: { x: 0, y: -6 }, clearance: 74 }],
  },
  {
    id: "reed-step",
    center: { x: 1080, y: 852 },
    tangent: { x: 0.998, y: 0.055 },
    normal: { x: -0.055, y: 0.998 },
    sittingRegion: { radiusX: 44, radiusY: 27 },
    surfaceAngle: 0.055,
    anchors: [{ id: "reed-step-top", local: { x: 0, y: -5 }, clearance: 56 }],
  },
  {
    id: "moss-step",
    center: { x: 1185, y: 890 },
    tangent: { x: 0.999, y: -0.03 },
    normal: { x: 0.03, y: 0.999 },
    sittingRegion: { radiusX: 72, radiusY: 40 },
    surfaceAngle: -0.03,
    anchors: [{ id: "moss-step-top", local: { x: -3, y: -8 }, clearance: 82 }],
  },
  {
    id: "broad-shelf",
    center: { x: 1275, y: 855 },
    tangent: { x: 0.999, y: 0.025 },
    normal: { x: -0.025, y: 0.999 },
    sittingRegion: { radiusX: 91, radiusY: 43 },
    surfaceAngle: 0.025,
    anchors: [{ id: "broad-shelf-top", local: { x: 0, y: -9 }, clearance: 96 }],
  },
  {
    id: "lower-shelf",
    center: { x: 1285, y: 930 },
    tangent: { x: 1, y: 0 },
    normal: { x: 0, y: 1 },
    sittingRegion: { radiusX: 92, radiusY: 45 },
    surfaceAngle: 0,
    anchors: [{ id: "lower-shelf-top", local: { x: 2, y: -8 }, clearance: 98 }],
  },
  {
    id: "fern-stone",
    center: { x: 1480, y: 780 },
    tangent: { x: 0.998, y: -0.06 },
    normal: { x: 0.06, y: 0.998 },
    sittingRegion: { radiusX: 69, radiusY: 37 },
    surfaceAngle: -0.06,
    anchors: [{ id: "fern-stone-top", local: { x: -2, y: -7 }, clearance: 78 }],
  },
  {
    id: "east-island",
    center: { x: 1390, y: 484 },
    tangent: { x: 0.999, y: 0.035 },
    normal: { x: -0.035, y: 0.999 },
    sittingRegion: { radiusX: 61, radiusY: 32 },
    surfaceAngle: 0.035,
    anchors: [{ id: "east-island-top", local: { x: -2, y: -9 }, clearance: 70 }],
  },
  {
    id: "east-bank-step",
    center: { x: 1550, y: 520 },
    tangent: { x: 0.998, y: -0.06 },
    normal: { x: 0.06, y: 0.998 },
    sittingRegion: { radiusX: 48, radiusY: 31 },
    surfaceAngle: -0.06,
    anchors: [{ id: "east-bank-step-top", local: { x: -3, y: -8 }, clearance: 58 }],
  },
  {
    id: "east-bank-shelf",
    center: { x: 1548, y: 690 },
    tangent: { x: 0.999, y: 0.025 },
    normal: { x: -0.025, y: 0.999 },
    sittingRegion: { radiusX: 54, radiusY: 34 },
    surfaceAngle: 0.025,
    anchors: [{ id: "east-bank-shelf-top", local: { x: -4, y: -8 }, clearance: 64 }],
  },
];

export const ROCK_ANCHORS: readonly RockAnchor[] = ROCK_SURFACES.flatMap((rock) =>
  rock.anchors.map((anchor) => ({
    id: anchor.id,
    rockId: rock.id,
    position: {
      x: rock.center.x + rock.tangent.x * anchor.local.x + rock.normal.x * anchor.local.y,
      y: rock.center.y + rock.tangent.y * anchor.local.x + rock.normal.y * anchor.local.y,
    },
    normal: rock.normal,
    surfaceAngle: rock.surfaceAngle,
    clearance: anchor.clearance,
    surfaceArea: Math.PI * rock.sittingRegion.radiusX * rock.sittingRegion.radiusY,
  })),
);

export const CAT_INTEREST_RADIUS = 380;

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
