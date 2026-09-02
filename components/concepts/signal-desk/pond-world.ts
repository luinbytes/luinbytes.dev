import {
  ROCK_ANCHORS,
  createPondRandom,
  pondClamp as clamp,
  pondDistance as distance,
  pondHashSeed as hashSeed,
  pondLerp as lerp,
  pondSmoothstep as smoothstep,
  type CatRoutine,
  type CatWorldState,
  type FishFoodEntity,
  type FishFoodStateName,
  type FishWorldIntent,
  type FlyRoutineState,
  type FlyWorldIntent,
  type PondPoint,
  type PondTarget,
  type PondWorldEvent,
  type PondWorldFrame,
  type PondWorldInput,
  type RockAnchor,
} from "./pond-model.ts";

export * from "./pond-model.ts";

type FoodInternal = Omit<FishFoodEntity, "age" | "dropProgress"> & {
  spawnedAt: number;
  depletedAt: number | null;
  rippleStrength: number;
};

type FishBrain = {
  state: FishFoodStateName;
  stateStarted: number;
  stateDuration: number;
  foodId: string | null;
  hunger: number;
  nextInterestAt: number;
  pathBias: number;
  slot: number;
  slotAngle: number;
  nextBiteAt: number;
  reason: string;
};

type FlyBrain = {
  state: FlyRoutineState;
  stateStarted: number;
  stateDuration: number;
  goal: PondPoint;
  home: PondPoint;
  reason: string;
};

type AnchorRoute = {
  anchor: RockAnchor;
  path: readonly RockAnchor[];
  distance: number;
};

const MAX_FOOD = 8;
const FOOD_MERGE_DISTANCE = 32;
const CAT_HOP_MIN = 55;
const CAT_HOP_MAX = 360;
const LEGAL_CAT_TRANSITIONS: Record<CatWorldState, readonly CatWorldState[]> = {
  idle: ["notice-target", "approach", "observe"],
  observe: ["notice-target", "approach", "observe"],
  "notice-target": ["recover", "prepare-bat", "approach", "observe"],
  approach: ["recover", "anticipate-hop"],
  "anticipate-hop": ["recover", "airborne"],
  airborne: ["land"],
  land: ["settle"],
  settle: ["notice-target", "idle"],
  "prepare-bat": ["recover", "bat"],
  bat: ["react"],
  react: ["recover"],
  recover: ["idle"],
};
const LEGAL_FISH_TRANSITIONS: Record<FishFoodStateName, readonly FishFoodStateName[]> = {
  cruising: ["detecting-food", "startled"],
  "detecting-food": ["approaching-food", "returning-to-cruise", "startled"],
  "approaching-food": ["circling", "returning-to-cruise", "startled"],
  circling: ["feeding", "approaching-food", "returning-to-cruise", "startled"],
  feeding: ["returning-to-cruise", "approaching-food", "startled"],
  startled: ["returning-to-cruise"],
  "returning-to-cruise": ["cruising", "detecting-food", "startled"],
};
const LEGAL_FLY_TRANSITIONS: Record<FlyRoutineState, readonly FlyRoutineState[]> = {
  hovering: ["foraging", "resting", "startled"],
  foraging: ["hovering", "resting", "startled"],
  resting: ["hovering", "foraging", "startled"],
  startled: ["hovering"],
};

export function createPondWorld(seedValue: string | number = "6c75") {
  const seed = hashSeed(seedValue);
  const random = createPondRandom(seed);
  const anchorCooldowns = new Map<string, number>();
  const anchorVisits = new Map<string, number>();
  const targetCooldowns = new Map<string, number>();
  const foods = new Map<string, FoodInternal>();
  const fishBrains = new Map<string, FishBrain>();
  const flyBrains = new Map<string, FlyBrain>();
  const reservations = new Map<string, Set<string>>();
  const pendingFoodDrops: { id: string; position: PondPoint }[] = [];
  let foodSequence = 0;
  let initialized = false;
  let hopRequested = false;
  let state: CatWorldState = "idle";
  let routine: CatRoutine = "watching";
  let stateStarted = 0;
  let stateDuration = 3200;
  let currentAnchor = ROCK_ANCHORS[0];
  let takeoffAnchor = currentAnchor;
  let destinationAnchor: RockAnchor | null = null;
  let selectedTargetId: string | null = null;
  let huntExpiresAt = 0;
  let huntHops = 0;
  let nextHuntAt = 0;
  let nextTargetScan = 0;
  let nextPatrolAt = 0;
  const recentAnchors: string[] = [];
  let lastReason = "initialised";
  let idleAim = { x: currentAnchor.position.x - 90, y: currentAnchor.position.y - 10 };
  let wind = 0;
  let windTarget = 0.25;
  let nextWindShift = 0;
  let currentA = { x: 5.4, y: 2.1 };
  let currentB = { x: -3.2, y: 4.1 };
  let targetCurrentA = { ...currentA };
  let targetCurrentB = { ...currentB };
  let surfaceA = { x: 5.2, y: 3.7 };
  let surfaceB = { x: -2.8, y: 3.2 };
  let targetSurfaceA = { ...surfaceA };
  let targetSurfaceB = { ...surfaceB };
  let light = 0.12;
  let lightTarget = 0.12;
  let nextCurrentShift = 0;
  let nextAmbientRipple = 0;

  const duration = (minimum: number, maximum: number) => minimum + random() * (maximum - minimum);

  function dropFood(position: PondPoint) {
    const id = `food-${seed.toString(16)}-${foodSequence}`;
    foodSequence += 1;
    pendingFoodDrops.push({ id, position: { ...position } });
    return id;
  }

  function releaseReservation(fishId: string, brain: FishBrain) {
    if (!brain.foodId) return;
    const reserved = reservations.get(brain.foodId);
    reserved?.delete(fishId);
    if (reserved?.size === 0) reservations.delete(brain.foodId);
  }

  function wakeFishForFood(now: number) {
    for (const brain of fishBrains.values()) {
      if (brain.state === "cruising") {
        brain.nextInterestAt = Math.min(brain.nextInterestAt, now + duration(20, 90));
      }
    }
  }

  function transitionFish(
    fishId: string,
    brain: FishBrain,
    next: FishFoodStateName,
    reason: string,
    now: number,
    nextDuration: number,
    events: PondWorldEvent[],
  ) {
    if (!LEGAL_FISH_TRANSITIONS[brain.state].includes(next)) {
      throw new Error(`Illegal fish transition ${brain.state} -> ${next}`);
    }
    const previous = brain.state;
    brain.state = next;
    brain.stateStarted = now;
    brain.stateDuration = nextDuration;
    brain.reason = reason;
    events.push({ type: "fish-state", fishId, from: previous, to: next, reason });
  }

  function expireFood(
    food: FoodInternal,
    reason: "consumed" | "lifetime" | "capacity",
    events: PondWorldEvent[],
  ) {
    food.expired = true;
    foods.delete(food.id);
    reservations.delete(food.id);
    events.push({
      type: "food-expired",
      foodId: food.id,
      position: food.position,
      consumed: food.consumed,
      reason,
    });
  }

  function updateFoods(now: number, events: PondWorldEvent[]) {
    while (pendingFoodDrops.length) {
      const drop = pendingFoodDrops.shift()!;
      const merge = [...foods.values()]
        .filter((food) => !food.expired && food.state !== "depleted")
        .sort((a, b) => distance(a.position, drop.position) - distance(b.position, drop.position))[0];
      if (merge && distance(merge.position, drop.position) <= FOOD_MERGE_DISTANCE) {
        merge.remainingAmount = Math.min(9, merge.remainingAmount + 2);
        merge.lifetime += duration(2200, 4200);
        events.push({
          type: "food-dropped",
          foodId: merge.id,
          position: drop.position,
          rippleStrength: 0.32 + random() * 0.22,
          merged: true,
        });
        wakeFishForFood(now);
        continue;
      }
      if (foods.size >= MAX_FOOD) {
        const oldest = [...foods.values()].sort((a, b) => a.spawnedAt - b.spawnedAt)[0];
        if (oldest) expireFood(oldest, "capacity", events);
      }
      const food: FoodInternal = {
        id: drop.id,
        position: drop.position,
        spawnedAt: now,
        state: "dropping",
        remainingAmount: 3 + Math.floor(random() * 4),
        attractionRadius: 430 + random() * 180,
        consumed: false,
        expired: false,
        pelletSize: 4 + random() * 3.5,
        settleDelay: duration(170, 310),
        lifetime: duration(24000, 38000),
        depletedAt: null,
        rippleStrength: 0.34 + random() * 0.28,
      };
      foods.set(food.id, food);
      events.push({
        type: "food-dropped",
        foodId: food.id,
        position: food.position,
        rippleStrength: food.rippleStrength,
        merged: false,
      });
      wakeFishForFood(now);
    }

    for (const food of [...foods.values()]) {
      const age = now - food.spawnedAt;
      if (food.state === "dropping" && age >= food.settleDelay) food.state = "floating";
      if (food.remainingAmount <= 0 && food.state !== "depleted") {
        food.state = "depleted";
        food.consumed = true;
        food.depletedAt = now;
      }
      if (food.depletedAt !== null && now - food.depletedAt >= 620) expireFood(food, "consumed", events);
      else if (age >= food.lifetime) expireFood(food, "lifetime", events);
    }
  }

  function foodFrames(now: number): FishFoodEntity[] {
    return [...foods.values()].map((food) => {
      const age = Math.max(0, now - food.spawnedAt);
      return {
        id: food.id,
        position: food.position,
        age,
        state: food.state,
        remainingAmount: food.remainingAmount,
        attractionRadius: food.attractionRadius,
        consumed: food.consumed,
        expired: food.expired,
        pelletSize: food.pelletSize,
        settleDelay: food.settleDelay,
        lifetime: food.lifetime,
        dropProgress: clamp(age / food.settleDelay, 0, 1),
      };
    });
  }

  function foodPreference(fish: PondTarget) {
    if (fish.species === "kohaku") return 1.08;
    if (fish.species === "ogon") return 1.02;
    if (fish.species === "showa") return 0.9;
    return 0.96;
  }

  function chooseFood(fish: PondTarget, brain: FishBrain) {
    return [...foods.values()]
      .filter((food) => food.state !== "depleted" && !food.expired && food.remainingAmount > 0)
      .map((food) => {
        const foodDistance = distance(fish.position, food.position);
        const reserved = reservations.get(food.id)?.size ?? 0;
        const currentGoalBonus = brain.foodId === food.id ? 34 : 0;
        const score =
          brain.hunger * 150 +
          foodPreference(fish) * 42 +
          currentGoalBonus -
          foodDistance * 0.36 -
          reserved * 30 -
          (fish.danger ?? 0) * 190 +
          random() * 15;
        return { food, foodDistance, score };
      })
      .filter(({ food, foodDistance }) => foodDistance <= food.attractionRadius)
      .sort((a, b) => b.score - a.score)[0]?.food ?? null;
  }

  function foodGoal(fish: PondTarget, food: FoodInternal, brain: FishBrain, now: number) {
    const dx = food.position.x - fish.position.x;
    const dy = food.position.y - fish.position.y;
    const foodDistance = Math.max(1, Math.hypot(dx, dy));
    const normalX = -dy / foodDistance;
    const normalY = dx / foodDistance;
    if (brain.state === "circling") {
      const direction = brain.pathBias < 0 ? -1 : 1;
      const angle = brain.slotAngle + direction * (now - brain.stateStarted) * 0.0018;
      const radius = 23 + brain.slot * 9;
      return { x: food.position.x + Math.cos(angle) * radius, y: food.position.y + Math.sin(angle) * radius * 0.72 };
    }
    const far = clamp(foodDistance / food.attractionRadius, 0, 1);
    const curve = brain.pathBias * (8 + far * 54);
    const slotOffset = 5 + brain.slot * 7;
    return {
      x: food.position.x + normalX * curve + Math.cos(brain.slotAngle) * slotOffset,
      y: food.position.y + normalY * curve + Math.sin(brain.slotAngle) * slotOffset * 0.72,
    };
  }

  function feedingRadius(fish: PondTarget, food: FoodInternal) {
    return 30 + fish.interactionRange * 0.78 + food.pelletSize;
  }

  function updateFish(input: PondWorldInput, events: PondWorldEvent[]) {
    const liveFish = input.targets.filter((target) => target.type === "fish");
    const liveIds = new Set(liveFish.map((fish) => fish.id));
    for (const [fishId, brain] of fishBrains) {
      if (!liveIds.has(fishId)) {
        releaseReservation(fishId, brain);
        fishBrains.delete(fishId);
      }
    }

    return liveFish.map((fish): FishWorldIntent => {
      let brain = fishBrains.get(fish.id);
      if (!brain) {
        brain = {
          state: "cruising",
          stateStarted: input.now,
          stateDuration: 0,
          foodId: null,
          hunger: 0.38 + random() * 0.5,
          nextInterestAt: input.now + duration(30, 120),
          pathBias: (random() < 0.5 ? -1 : 1) * duration(0.45, 1),
          slot: 0,
          slotAngle: random() * Math.PI * 2,
          nextBiteAt: 0,
          reason: "cruising",
        };
        fishBrains.set(fish.id, brain);
      }

      brain.hunger = clamp(brain.hunger + input.delta * 0.014, 0, 1);
      let food = brain.foodId ? foods.get(brain.foodId) ?? null : null;
      const elapsed = input.now - brain.stateStarted;
      const danger = fish.danger ?? 0;
      const foodAvailable = [...foods.values()].some((candidate) =>
        !candidate.expired && candidate.remainingAmount > 0,
      );

      if (danger > (foodAvailable ? 0.92 : 0.72) && brain.state !== "startled") {
        releaseReservation(fish.id, brain);
        brain.foodId = null;
        transitionFish(fish.id, brain, "startled", "danger-interrupted-goal", input.now, duration(620, 1150), events);
      } else if (brain.state === "cruising" && input.now >= brain.nextInterestAt && danger < (foodAvailable ? 0.9 : 0.5)) {
        food = chooseFood(fish, brain);
        const foodIsSettling = [...foods.values()].some((candidate) => candidate.state === "dropping" && !candidate.expired);
        brain.nextInterestAt = input.now + (foodIsSettling ? duration(20, 75) : duration(420, 1100));
        if (food) {
          brain.foodId = food.id;
          transitionFish(fish.id, brain, "detecting-food", "food-entered-interest-radius", input.now, duration(40, 110), events);
          events.push({ type: "fish-noticed-food", fishId: fish.id, foodId: food.id });
        }
      } else if (brain.state === "detecting-food" && elapsed >= brain.stateDuration) {
        if (!food || food.state === "depleted" || food.remainingAmount <= 0) {
          brain.foodId = null;
          transitionFish(fish.id, brain, "returning-to-cruise", "food-lost-before-reservation", input.now, duration(520, 1100), events);
        } else if (food.state === "floating") {
          const reserved = reservations.get(food.id) ?? new Set<string>();
          const capacity = Math.min(3, Math.max(1, Math.ceil(food.remainingAmount / 2)));
          if (reserved.size >= capacity) {
            brain.foodId = null;
            transitionFish(fish.id, brain, "returning-to-cruise", "food-reservation-full", input.now, duration(620, 1280), events);
          } else {
            brain.slot = reserved.size;
            reserved.add(fish.id);
            reservations.set(food.id, reserved);
            transitionFish(fish.id, brain, "approaching-food", "food-reserved", input.now, duration(18000, 26000), events);
            events.push({ type: "fish-reserved-food", fishId: fish.id, foodId: food.id, slot: brain.slot });
          }
        }
      } else if (brain.state === "approaching-food") {
        if (!food || food.state !== "floating" || food.remainingAmount <= 0) {
          releaseReservation(fish.id, brain);
          brain.foodId = null;
          transitionFish(fish.id, brain, "returning-to-cruise", "reserved-food-unavailable", input.now, duration(620, 1200), events);
        } else {
          const arrivalRadius = feedingRadius(fish, food);
          if (distance(fish.position, food.position) <= arrivalRadius) {
            transitionFish(fish.id, brain, "circling", "arrived-within-feeding-radius", input.now, duration(280, 860), events);
            events.push({ type: "fish-arrived", fishId: fish.id, foodId: food.id, position: food.position });
          } else if (elapsed >= brain.stateDuration) {
            releaseReservation(fish.id, brain);
            brain.foodId = null;
            transitionFish(fish.id, brain, "returning-to-cruise", "approach-timed-out", input.now, duration(720, 1500), events);
          }
        }
      } else if (brain.state === "circling" && elapsed >= brain.stateDuration) {
        if (food && food.state === "floating" && food.remainingAmount > 0) {
          transitionFish(fish.id, brain, "feeding", "feeding-opening", input.now, duration(360, 690), events);
          brain.nextBiteAt = input.now + brain.stateDuration;
        } else {
          releaseReservation(fish.id, brain);
          brain.foodId = null;
          transitionFish(fish.id, brain, "returning-to-cruise", "food-gone-while-circling", input.now, duration(620, 1200), events);
        }
      } else if (brain.state === "feeding" && input.now >= brain.nextBiteAt) {
        if (food && food.state === "floating" && food.remainingAmount > 0) {
          food.remainingAmount = Math.max(0, food.remainingAmount - 1);
          brain.hunger = Math.max(0.08, brain.hunger - duration(0.35, 0.56));
          events.push({
            type: "fish-fed",
            fishId: fish.id,
            foodId: food.id,
            position: food.position,
            remainingAmount: food.remainingAmount,
          });
        }
        releaseReservation(fish.id, brain);
        brain.foodId = null;
        brain.nextInterestAt = input.now + duration(2600, 6200);
        transitionFish(fish.id, brain, "returning-to-cruise", "bite-complete", input.now, duration(650, 1350), events);
      } else if (brain.state === "startled" && elapsed >= brain.stateDuration) {
        transitionFish(fish.id, brain, "returning-to-cruise", "danger-cleared", input.now, duration(620, 1300), events);
      } else if (brain.state === "returning-to-cruise" && elapsed >= brain.stateDuration) {
        transitionFish(fish.id, brain, "cruising", "cruise-restored", input.now, 0, events);
      }

      food = brain.foodId ? foods.get(brain.foodId) ?? null : null;
      const arrivalRadius = food ? feedingRadius(fish, food) : 28;
      const goal = food && ["detecting-food", "approaching-food", "circling", "feeding"].includes(brain.state)
        ? foodGoal(fish, food, brain, input.now)
        : null;
      return {
        fishId: fish.id,
        state: brain.state,
        foodId: brain.foodId,
        goal,
        arrivalRadius,
        speedScale:
          brain.state === "detecting-food"
            ? 1.16
            : brain.state === "approaching-food"
              ? 3.1
            : brain.state === "circling"
              ? 0.68
              : brain.state === "feeding"
                ? 0.24
                : brain.state === "startled"
                  ? 1.4
                  : 1,
        reserved: Boolean(brain.foodId && reservations.get(brain.foodId)?.has(fish.id)),
        feedingPulse: brain.state === "feeding" ? smoothstep(elapsed / Math.max(1, brain.stateDuration)) : 0,
        reason: brain.reason,
      };
    });
  }

  function transitionFly(
    flyId: string,
    brain: FlyBrain,
    next: FlyRoutineState,
    reason: string,
    now: number,
    nextDuration: number,
    events: PondWorldEvent[],
  ) {
    if (!LEGAL_FLY_TRANSITIONS[brain.state].includes(next)) {
      throw new Error(`Illegal fly transition ${brain.state} -> ${next}`);
    }
    const previous = brain.state;
    brain.state = next;
    brain.stateStarted = now;
    brain.stateDuration = nextDuration;
    brain.reason = reason;
    events.push({ type: "fly-state", flyId, from: previous, to: next, reason });
  }

  function updateFlies(input: PondWorldInput, events: PondWorldEvent[]) {
    const liveFlies = input.targets.filter((target) => target.type === "fly");
    const liveIds = new Set(liveFlies.map((fly) => fly.id));
    for (const flyId of flyBrains.keys()) {
      if (!liveIds.has(flyId)) flyBrains.delete(flyId);
    }

    return liveFlies.map((fly): FlyWorldIntent => {
      let brain = flyBrains.get(fly.id);
      if (!brain) {
        brain = {
          state: "hovering",
          stateStarted: input.now,
          stateDuration: duration(900, 2600),
          goal: { ...fly.position },
          home: { ...fly.position },
          reason: "surveying-home-patch",
        };
        flyBrains.set(fly.id, brain);
      }

      const elapsed = input.now - brain.stateStarted;
      const arrived = distance(fly.position, brain.goal) < 34;
      if ((fly.danger ?? 0) > 0.52 && brain.state !== "startled") {
        const heading = Math.atan2(fly.velocity.y, fly.velocity.x) + duration(-0.7, 0.7);
        brain.goal = {
          x: clamp(fly.position.x + Math.cos(heading) * duration(130, 230), 80, 1506),
          y: clamp(fly.position.y + Math.sin(heading) * duration(90, 170) - 35, 70, 850),
        };
        transitionFly(fly.id, brain, "startled", "danger-broke-routine", input.now, duration(520, 980), events);
      } else if (brain.state === "startled" && elapsed >= brain.stateDuration) {
        brain.goal = { ...fly.position };
        transitionFly(fly.id, brain, "hovering", "found-safe-air", input.now, duration(620, 1500), events);
      } else if (brain.state === "foraging" && (arrived || elapsed >= brain.stateDuration)) {
        brain.goal = { ...fly.position };
        transitionFly(fly.id, brain, "hovering", arrived ? "reached-forage-point" : "abandoned-long-route", input.now, duration(900, 2800), events);
      } else if ((brain.state === "hovering" || brain.state === "resting") && elapsed >= brain.stateDuration) {
        if (brain.state === "hovering" && random() < 0.22) {
          brain.goal = { ...fly.position };
          transitionFly(fly.id, brain, "resting", "settled-on-reed", input.now, duration(1800, 4600), events);
        } else {
          brain.goal = {
            x: clamp(brain.home.x + duration(-280, 280), 80, 1506),
            y: clamp(brain.home.y + duration(-150, 150), 70, 850),
          };
          transitionFly(fly.id, brain, "foraging", "chose-new-air-patch", input.now, duration(3600, 7800), events);
        }
      }

      return {
        flyId: fly.id,
        state: brain.state,
        goal: brain.goal,
        speedScale: brain.state === "startled" ? 1.75 : brain.state === "foraging" ? 1 : brain.state === "hovering" ? 0.42 : 0.08,
        reason: brain.reason,
      };
    });
  }

  function transition(next: CatWorldState, reason: string, now: number, nextDuration: number, events: PondWorldEvent[]) {
    if (!LEGAL_CAT_TRANSITIONS[state].includes(next)) {
      throw new Error(`Illegal cat transition ${state} -> ${next}`);
    }
    const previous = state;
    state = next;
    stateStarted = now;
    stateDuration = nextDuration;
    lastReason = reason;
    events.push({ type: "transition", from: previous, to: next, reason });
  }

  function predictedTarget(target: PondTarget) {
    const lead = target.type === "fly" ? 0.11 : 0.2;
    return {
      x: target.position.x + target.velocity.x * lead,
      y: target.position.y + target.velocity.y * lead,
    };
  }

  function anchorRoutes(visible: Set<string>, now: number) {
    const visibleAnchors = ROCK_ANCHORS.filter(
      (anchor) =>
        visible.has(anchor.id) &&
        (anchor.id === currentAnchor.id || (anchorCooldowns.get(anchor.id) ?? 0) <= now),
    );
    const anchors = visibleAnchors.some((anchor) => anchor.id === currentAnchor.id)
      ? visibleAnchors
      : [currentAnchor, ...visibleAnchors];
    const routes = new Map<string, AnchorRoute>([
      [currentAnchor.id, { anchor: currentAnchor, path: [currentAnchor], distance: 0 }],
    ]);
    const visited = new Set<string>();

    while (visited.size < anchors.length) {
      const route = [...routes.values()]
        .filter((candidate) => !visited.has(candidate.anchor.id))
        .sort((a, b) => a.distance - b.distance)[0];
      if (!route) break;
      visited.add(route.anchor.id);

      for (const anchor of anchors) {
        if (visited.has(anchor.id)) continue;
        const hop = distance(route.anchor.position, anchor.position);
        if (hop < CAT_HOP_MIN || hop > CAT_HOP_MAX) continue;
        const nextDistance = route.distance + hop;
        const known = routes.get(anchor.id);
        if (!known || nextDistance < known.distance) {
          routes.set(anchor.id, {
            anchor,
            path: [...route.path, anchor],
            distance: nextDistance,
          });
        }
      }
    }

    return [...routes.values()];
  }

  function targetPlan(target: PondTarget, routes: readonly AnchorRoute[]) {
    const targetPosition = predictedTarget(target);
    return routes
      .map((route) => {
        const targetDistance = distance(route.anchor.position, targetPosition);
        const reach = route.anchor.clearance + 72 + target.interactionRange * 0.42;
        const verticalReach = 88 + route.anchor.clearance * 0.48;
        if (targetDistance > reach || Math.abs(targetPosition.y - route.anchor.position.y) > verticalReach) return null;
        const visits = anchorVisits.get(route.anchor.id) ?? 0;
        const recentIndex = recentAnchors.lastIndexOf(route.anchor.id);
        const recent = recentIndex < 0
          ? 0
          : Math.max(0, 72 - (recentAnchors.length - 1 - recentIndex) * 18);
        return {
          route,
          score:
            460 -
            targetDistance * 1.15 -
            route.distance * 0.055 -
            (route.path.length - 1) * 10 +
            (visits === 0 ? 110 : Math.max(0, 28 - visits * 8)) -
            recent,
        };
      })
      .filter((plan): plan is { route: AnchorRoute; score: number } => plan !== null)
      .sort((a, b) => b.score - a.score)[0] ?? null;
  }

  function chooseTarget(targets: readonly PondTarget[], now: number, catPosition: PondPoint, visible: Set<string>) {
    const routes = anchorRoutes(visible, now);
    return targets
      .filter((target) => target.visible && target.attackable && (targetCooldowns.get(target.id) ?? 0) <= now)
      .map((target) => {
        const plan = targetPlan(target, routes);
        if (!plan) return null;
        const typeInterest = target.type === "fish" ? 130 : 0;
        const proximity = Math.max(0, 80 - distance(catPosition, target.position) * 0.06);
        return { target, score: typeInterest + proximity + plan.score + random() * 14 };
      })
      .filter((candidate): candidate is { target: PondTarget; score: number } => candidate !== null)
      .sort((a, b) => b.score - a.score)[0]?.target ?? null;
  }

  function chooseDestination(visible: Set<string>, now: number, target: PondTarget | null) {
    const currentPosition = currentAnchor.position;
    if (target) {
      const plan = targetPlan(target, anchorRoutes(visible, now));
      return plan?.route.path[1] ?? null;
    }
    const reachable = ROCK_ANCHORS
      .filter((anchor) => anchor.id !== currentAnchor.id && visible.has(anchor.id))
      .filter((anchor) => (anchorCooldowns.get(anchor.id) ?? 0) <= now)
      .filter((anchor) => {
        const hopDistance = distance(currentPosition, anchor.position);
        return hopDistance >= CAT_HOP_MIN && hopDistance <= CAT_HOP_MAX;
      });
    const previousAnchor = recentAnchors.at(-2);
    const pool = reachable.filter((anchor) => anchor.id !== previousAnchor);
    return pool
      .map((anchor) => {
        const hopDistance = distance(currentPosition, anchor.position);
        const areaScore = Math.min(90, anchor.surfaceArea / 130);
        const distanceScore = 120 - Math.abs(hopDistance - 175) * 0.42;
        const newRock = anchor.rockId === currentAnchor.rockId ? 0 : 38;
        const recentIndex = recentAnchors.lastIndexOf(anchor.id);
        const recentPenalty = recentIndex < 0 ? 0 : (recentAnchors.length - recentIndex) * 78;
        const unvisitedBonus = (anchorVisits.get(anchor.id) ?? 0) === 0 ? 96 : 0;
        return {
          anchor,
          score: distanceScore + areaScore + newRock - recentPenalty + unvisitedBonus + random() * 14,
        };
      })
      .filter((candidate): candidate is { anchor: RockAnchor; score: number } => candidate !== null)
      .sort((a, b) => b.score - a.score)[0]?.anchor ?? null;
  }

  function updateEnvironment(input: PondWorldInput, events: PondWorldEvent[]) {
    const { now, delta } = input;
    if (now >= nextWindShift) {
      windTarget = -1 + random() * 2;
      nextWindShift = now + duration(1700, 5300);
    }
    if (now >= nextCurrentShift) {
      targetCurrentA = { x: 3.5 + random() * 4.8, y: -0.8 + random() * 5.2 };
      targetCurrentB = { x: -5.2 + random() * 3.8, y: 2.6 + random() * 4.4 };
      targetSurfaceA = { x: 4.8 + random() * 1.8, y: 3.2 + random() * 1.5 };
      targetSurfaceB = { x: -3.5 + random() * 1.4, y: 2.8 + random() * 1.5 };
      lightTarget = 0.08 + random() * 0.1;
      nextCurrentShift = now + duration(1900, 5100);
    }
    wind = lerp(wind, windTarget, Math.min(1, delta * 0.5));
    currentA = {
      x: lerp(currentA.x, targetCurrentA.x, Math.min(1, delta * 0.55)),
      y: lerp(currentA.y, targetCurrentA.y, Math.min(1, delta * 0.55)),
    };
    currentB = {
      x: lerp(currentB.x, targetCurrentB.x, Math.min(1, delta * 0.55)),
      y: lerp(currentB.y, targetCurrentB.y, Math.min(1, delta * 0.55)),
    };
    surfaceA = {
      x: lerp(surfaceA.x, targetSurfaceA.x, Math.min(1, delta * 0.72)),
      y: lerp(surfaceA.y, targetSurfaceA.y, Math.min(1, delta * 0.72)),
    };
    surfaceB = {
      x: lerp(surfaceB.x, targetSurfaceB.x, Math.min(1, delta * 0.72)),
      y: lerp(surfaceB.y, targetSurfaceB.y, Math.min(1, delta * 0.72)),
    };
    light = lerp(light, lightTarget, Math.min(1, delta * 0.45));
    if (now >= nextAmbientRipple) {
      events.push({
        type: "ambient-ripple",
        position: { x: 180 + random() * 1080, y: 150 + random() * 650 },
        strength: 0.25 + random() * 0.35,
      });
      nextAmbientRipple = now + duration(2200, 6200);
    }
  }

  function requestHop() {
    hopRequested = true;
  }

  function step(input: PondWorldInput): PondWorldFrame {
    const events: PondWorldEvent[] = [];
    const visible = new Set(input.visibleAnchorIds);
    updateEnvironment(input, events);
    updateFoods(input.now, events);
    const fish = updateFish(input, events);
    const flies = updateFlies(input, events);

    if (!initialized) {
      const initial = ROCK_ANCHORS
        .filter((anchor) => visible.has(anchor.id))
        .sort((a, b) => b.surfaceArea - a.surfaceArea)[0];
      if (initial) currentAnchor = initial;
      takeoffAnchor = currentAnchor;
      idleAim = { x: currentAnchor.position.x - 80, y: currentAnchor.position.y - 10 };
      stateStarted = input.now;
      stateDuration = duration(2200, 4800);
      routine = "watching";
      recentAnchors.push(currentAnchor.id);
      anchorVisits.set(currentAnchor.id, 1);
      nextTargetScan = input.now + duration(240, 720);
      nextHuntAt = input.now + duration(1200, 3000);
      nextPatrolAt = input.now + duration(15000, 30000);
      nextWindShift = input.now + duration(900, 2600);
      nextCurrentShift = input.now + duration(1100, 3100);
      nextAmbientRipple = input.now + duration(1400, 3600);
      initialized = true;
    }

    const elapsed = input.now - stateStarted;
    const target = selectedTargetId ? input.targets.find((candidate) => candidate.id === selectedTargetId) ?? null : null;
    const targetAim = target ? predictedTarget(target) : null;
    const targetDistance = targetAim ? distance(currentAnchor.position, targetAim) : Number.POSITIVE_INFINITY;
    const batReach = currentAnchor.clearance + 72 + (target?.interactionRange ?? 0) * 0.42;
    const batVerticalReach = 88 + currentAnchor.clearance * 0.48;

    if (state === "idle" || state === "observe") {
      const scanDue = input.now >= nextTargetScan && input.now >= nextHuntAt;
      const candidate = scanDue ? chooseTarget(input.targets, input.now, currentAnchor.position, visible) : null;
      if (scanDue) nextTargetScan = input.now + duration(520, 1200);

      if (hopRequested) {
        destinationAnchor = chooseDestination(visible, input.now, null);
        hopRequested = false;
        if (destinationAnchor) {
          selectedTargetId = null;
          routine = "patrolling";
          nextPatrolAt = input.now + duration(12000, 26000);
          transition("approach", "pointer-requested-rock-hop", input.now, duration(180, 360), events);
        }
      } else if (candidate) {
        selectedTargetId = candidate.id;
        huntExpiresAt = input.now + duration(12000, 18000);
        huntHops = 0;
        routine = "hunting";
        transition("notice-target", `noticed-${candidate.type}`, input.now, duration(240, 520), events);
      } else if (elapsed >= stateDuration) {
        destinationAnchor = input.now >= nextPatrolAt ? chooseDestination(visible, input.now, null) : null;
        if (destinationAnchor) {
          selectedTargetId = null;
          routine = "patrolling";
          nextPatrolAt = input.now + duration(12000, 26000);
          transition("approach", "routine-patrol-to-fresh-vantage", input.now, duration(220, 420), events);
        } else {
          selectedTargetId = null;
          routine = random() < 0.38 ? "resting" : "watching";
          idleAim = {
            x: currentAnchor.position.x + duration(-130, 130),
            y: currentAnchor.position.y + duration(-55, 45),
          };
          transition("observe", routine === "resting" ? "settled-into-rest" : "chose-to-stay-and-look", input.now, duration(3200, 7200), events);
        }
      }
    } else if (state === "notice-target") {
      if (!target || !target.visible || !target.attackable) {
        selectedTargetId = null;
        nextHuntAt = input.now + duration(4200, 8200);
        transition("recover", "target-lost-before-action", input.now, duration(420, 760), events);
      } else if (elapsed >= stateDuration) {
        if (targetDistance <= batReach && Math.abs(targetAim!.y - currentAnchor.position.y) <= batVerticalReach) {
          transition("prepare-bat", "target-entered-paw-range", input.now, duration(320, 560), events);
        } else if (input.now < huntExpiresAt && huntHops < 5 && (destinationAnchor = chooseDestination(visible, input.now, target))) {
          huntHops += 1;
          transition("approach", "moving-to-better-rock", input.now, duration(220, 420), events);
        } else {
          targetCooldowns.set(target.id, input.now + duration(3200, 5200));
          selectedTargetId = null;
          nextHuntAt = input.now + duration(4800, 9000);
          routine = "watching";
          transition("observe", "target-visible-but-unreachable", input.now, duration(900, 1800), events);
        }
      }
    } else if (state === "approach") {
      if (!destinationAnchor || !visible.has(destinationAnchor.id)) {
        destinationAnchor = null;
        transition("recover", "destination-no-longer-visible", input.now, duration(420, 720), events);
      } else if (elapsed >= stateDuration) {
        transition("anticipate-hop", "destination-validated", input.now, duration(300, 520), events);
      }
    } else if (state === "anticipate-hop") {
      if (!destinationAnchor || !visible.has(destinationAnchor.id)) {
        destinationAnchor = null;
        transition("recover", "hop-cancelled", input.now, duration(420, 720), events);
      } else if (elapsed >= stateDuration) {
        takeoffAnchor = currentAnchor;
        const hopDistance = distance(takeoffAnchor.position, destinationAnchor.position);
        anchorCooldowns.set(takeoffAnchor.id, input.now + duration(7200, 11800));
        transition("airborne", "takeoff", input.now, clamp(580 + hopDistance * 1.55, 680, 1140), events);
        events.push({ type: "takeoff", fromAnchor: takeoffAnchor.id, toAnchor: destinationAnchor.id });
      }
    } else if (state === "airborne" && destinationAnchor && elapsed >= stateDuration) {
      currentAnchor = destinationAnchor;
      destinationAnchor = null;
      anchorVisits.set(currentAnchor.id, (anchorVisits.get(currentAnchor.id) ?? 0) + 1);
      recentAnchors.push(currentAnchor.id);
      if (recentAnchors.length > 4) recentAnchors.shift();
      events.push({ type: "land", anchorId: currentAnchor.id, position: currentAnchor.position, impact: 0.55 + random() * 0.3 });
      transition("land", "contact-on-authored-surface", input.now, duration(110, 180), events);
    } else if (state === "land" && elapsed >= stateDuration) {
      transition("settle", "landing-compression-complete", input.now, duration(320, 620), events);
    } else if (state === "settle" && elapsed >= stateDuration) {
      const settledTarget = selectedTargetId
        ? input.targets.find((candidate) => candidate.id === selectedTargetId) ?? null
        : null;
      const settledAim = settledTarget ? predictedTarget(settledTarget) : null;
      if (settledTarget?.visible && settledTarget.attackable && settledAim && input.now < huntExpiresAt && huntHops <= 5) {
        transition("notice-target", "target-reacquired-after-landing", input.now, duration(220, 440), events);
      } else {
        if (settledTarget) targetCooldowns.set(settledTarget.id, input.now + duration(3200, 5200));
        selectedTargetId = null;
        nextHuntAt = input.now + duration(3200, 6200);
        routine = "watching";
        transition("idle", "stable-contact-restored", input.now, duration(2200, 5200), events);
      }
    } else if (state === "prepare-bat") {
      const valid = Boolean(
        target &&
        target.visible &&
        target.attackable &&
        targetAim &&
        targetDistance <= batReach &&
        Math.abs(targetAim.y - currentAnchor.position.y) <= batVerticalReach,
      );
      if (!valid) {
        transition("recover", "target-left-paw-range", input.now, duration(480, 820), events);
      } else if (elapsed >= stateDuration && target && targetAim) {
        const hit = targetDistance <= batReach * 0.9;
        events.push({
          type: "bat",
          targetId: target.id,
          targetType: target.type,
          aim: targetAim,
          distance: targetDistance,
          reach: batReach,
          hit,
        });
        targetCooldowns.set(target.id, input.now + duration(4200, 7600));
        nextHuntAt = input.now + duration(2800, 5600);
        transition("bat", hit ? "paw-contact" : "target-evaded-paw", input.now, duration(190, 280), events);
      }
    } else if (state === "bat" && elapsed >= stateDuration) {
      transition("react", "registered-bat-consequence", input.now, duration(220, 440), events);
    } else if (state === "react" && elapsed >= stateDuration) {
      transition("recover", "action-recovery", input.now, duration(480, 860), events);
    } else if (state === "recover" && elapsed >= stateDuration) {
      selectedTargetId = null;
      routine = "watching";
      nextTargetScan = input.now + duration(520, 1200);
      idleAim = {
        x: currentAnchor.position.x + duration(-100, 100),
        y: currentAnchor.position.y + duration(-45, 35),
      };
      transition("idle", "ready", input.now, duration(2400, 5600), events);
    }

    const stateProgress = stateDuration > 0 ? clamp((input.now - stateStarted) / stateDuration, 0, 1) : 1;
    let contact = currentAnchor.position;
    let lift = 0;
    let surfaceAngle = currentAnchor.surfaceAngle;
    let squashX = 1;
    let squashY = 1;
    const grounded = state !== "airborne";

    if (state === "anticipate-hop") {
      squashX = 1.04 + stateProgress * 0.04;
      squashY = 0.98 - stateProgress * 0.1;
    } else if (state === "airborne" && destinationAnchor) {
      const hopFrames = Math.max(8, Math.round(stateDuration / 85));
      const steppedProgress = Math.min(1, Math.round(stateProgress * hopFrames) / hopFrames);
      const progress = smoothstep(steppedProgress);
      contact = {
        x: lerp(takeoffAnchor.position.x, destinationAnchor.position.x, progress),
        y: lerp(takeoffAnchor.position.y, destinationAnchor.position.y, progress),
      };
      const hopDistance = distance(takeoffAnchor.position, destinationAnchor.position);
      lift = Math.sin(steppedProgress * Math.PI) * clamp(24 + hopDistance * 0.16, 30, 72);
      surfaceAngle = lerp(takeoffAnchor.surfaceAngle, destinationAnchor.surfaceAngle, progress);
      squashX = 0.97;
      squashY = 1.04;
    } else if (state === "land") {
      squashX = lerp(1.12, 1.04, stateProgress);
      squashY = lerp(0.82, 0.94, stateProgress);
    } else if (state === "settle") {
      squashX = stateProgress < 0.45 ? lerp(1.04, 0.98, stateProgress / 0.45) : lerp(0.98, 1, (stateProgress - 0.45) / 0.55);
      squashY = stateProgress < 0.45 ? lerp(0.94, 1.025, stateProgress / 0.45) : lerp(1.025, 1, (stateProgress - 0.45) / 0.55);
    } else if (state === "prepare-bat") {
      squashX = 1.02;
      squashY = 0.96;
    } else if (state === "bat") {
      squashX = 1.05;
      squashY = 0.97;
    }

    const selectedTarget = selectedTargetId ? input.targets.find((candidate) => candidate.id === selectedTargetId) ?? null : null;
    const aim = selectedTarget ? predictedTarget(selectedTarget) : destinationAnchor?.position ?? idleAim;
    const facing: 1 | -1 = aim.x < contact.x ? -1 : 1;

    return {
      cat: {
        state,
        routine,
        contact,
        lift,
        squashX,
        squashY,
        surfaceAngle,
        facing,
        aim,
        grounded,
        anchorId: currentAnchor.id,
        rockId: currentAnchor.rockId,
        destinationAnchorId: destinationAnchor?.id ?? null,
        selectedTargetId,
        selectedTargetType: selectedTarget?.type ?? null,
        batReach: currentAnchor.clearance + 72 + (selectedTarget?.interactionRange ?? 0) * 0.42,
      },
      environment: { wind, currentA, currentB, surfaceA, surfaceB, light },
      foods: foodFrames(input.now),
      fish,
      flies,
      events,
      debug: {
        seed,
        reason: lastReason,
        grounded,
        selectedTarget: selectedTargetId,
        destinationAnchor: destinationAnchor?.id ?? null,
        routine,
      },
    };
  }

  return { dropFood, requestHop, step };
}
