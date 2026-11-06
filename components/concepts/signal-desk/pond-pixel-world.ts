import {
  createPondRandom,
  pondClamp as clamp,
  pondDistance as distance,
  pondHashSeed as hashSeed,
  pondLerp as lerp,
  pondSmoothstep as smoothstep,
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
} from "./pond-pixel-model.ts";

export * from "./pond-pixel-model.ts";

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
  progressDistance: number;
  progressAt: number;
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

const MAX_FOOD = 8;
const FOOD_MERGE_DISTANCE = 32;
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
  const foods = new Map<string, FoodInternal>();
  const fishBrains = new Map<string, FishBrain>();
  const flyBrains = new Map<string, FlyBrain>();
  const reservations = new Map<string, Set<string>>();
  const pendingFoodDrops: { id: string; position: PondPoint }[] = [];
  let foodSequence = 0;
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
    return Math.max(30 + fish.interactionRange * 0.78, fish.bodyRadius ?? 0) + food.pelletSize;
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
          progressDistance: Infinity,
          progressAt: input.now,
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
      const approach = food && input.foodApproach
        ? input.foodApproach(fish, food.position, feedingRadius(fish, food), foodGoal(fish, food, brain, input.now))
        : null;

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
          if (reserved.size >= capacity && (!input.foodApproach || approach)) {
            const replacement = liveFish
              .filter((other) => reserved.has(other.id) && fishBrains.get(other.id)?.state === "approaching-food")
              .map((other) => ({ fish: other, distance: distance(other.position, food!.position) }))
              .sort((a, b) => b.distance - a.distance)[0];
            if (replacement && distance(fish.position, food.position) + 40 < replacement.distance) {
              const displaced = fishBrains.get(replacement.fish.id)!;
              releaseReservation(replacement.fish.id, displaced);
              displaced.foodId = null;
              displaced.nextInterestAt = input.now + 3000;
              transitionFish(replacement.fish.id, displaced, "returning-to-cruise", "closer-fish-reserved", input.now, duration(620, 1280), events);
            }
          }
          if ((input.foodApproach && !approach) || reserved.size >= capacity) {
            brain.foodId = null;
            brain.nextInterestAt = input.now + 3000;
            transitionFish(fish.id, brain, "returning-to-cruise", approach || !input.foodApproach ? "food-reservation-full" : "food-unreachable", input.now, duration(620, 1280), events);
          } else {
            brain.slot = reserved.size;
            reserved.add(fish.id);
            reservations.set(food.id, reserved);
            brain.progressDistance = distance(fish.position, approach ?? food.position);
            brain.progressAt = input.now;
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
          } else if (input.foodApproach && !approach) {
            releaseReservation(fish.id, brain);
            brain.foodId = null;
            brain.nextInterestAt = input.now + 3000;
            transitionFish(fish.id, brain, "returning-to-cruise", "food-unreachable", input.now, duration(720, 1500), events);
          } else if (elapsed >= brain.stateDuration || input.now - brain.progressAt >= 4000) {
            releaseReservation(fish.id, brain);
            brain.foodId = null;
            brain.nextInterestAt = input.now + 3000;
            transitionFish(fish.id, brain, "returning-to-cruise", elapsed >= brain.stateDuration ? "approach-timed-out" : "approach-stalled", input.now, duration(720, 1500), events);
          } else if (distance(fish.position, approach ?? food.position) < brain.progressDistance - 5) {
            brain.progressDistance = distance(fish.position, approach ?? food.position);
            brain.progressAt = input.now;
          }
        }
      } else if (brain.state === "circling" && elapsed >= brain.stateDuration) {
        if (food && food.state === "floating" && food.remainingAmount > 0 && distance(fish.position, food.position) > feedingRadius(fish, food)) {
          brain.progressDistance = distance(fish.position, approach ?? food.position);
          brain.progressAt = input.now;
          transitionFish(fish.id, brain, "approaching-food", "left-feeding-radius", input.now, duration(18000, 26000), events);
        } else if (food && food.state === "floating" && food.remainingAmount > 0) {
          transitionFish(fish.id, brain, "feeding", "feeding-opening", input.now, duration(360, 690), events);
          brain.nextBiteAt = input.now + brain.stateDuration;
        } else {
          releaseReservation(fish.id, brain);
          brain.foodId = null;
          transitionFish(fish.id, brain, "returning-to-cruise", "food-gone-while-circling", input.now, duration(620, 1200), events);
        }
      } else if (brain.state === "feeding" && input.now >= brain.nextBiteAt) {
        if (food && food.state === "floating" && food.remainingAmount > 0 && distance(fish.position, food.position) > feedingRadius(fish, food)) {
          brain.progressDistance = distance(fish.position, approach ?? food.position);
          brain.progressAt = input.now;
          transitionFish(fish.id, brain, "approaching-food", "left-feeding-radius", input.now, duration(18000, 26000), events);
        } else {
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
        }
      } else if (brain.state === "startled" && elapsed >= brain.stateDuration) {
        transitionFish(fish.id, brain, "returning-to-cruise", "danger-cleared", input.now, duration(620, 1300), events);
      } else if (brain.state === "returning-to-cruise" && elapsed >= brain.stateDuration) {
        transitionFish(fish.id, brain, "cruising", "cruise-restored", input.now, 0, events);
      }

      food = brain.foodId ? foods.get(brain.foodId) ?? null : null;
      const arrivalRadius = food ? feedingRadius(fish, food) : 28;
      const goal = food && ["detecting-food", "approaching-food", "circling", "feeding"].includes(brain.state)
        ? approach ?? foodGoal(fish, food, brain, input.now)
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
        speedScale: brain.state === "startled" ? 2.8 : brain.state === "foraging" ? 2.1 : brain.state === "hovering" ? 0.42 : 0.08,
        reason: brain.reason,
      };
    });
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

  function step(input: PondWorldInput): PondWorldFrame {
    const events: PondWorldEvent[] = [];
    updateEnvironment(input, events);
    updateFoods(input.now, events);
    const fish = updateFish(input, events);
    const flies = updateFlies(input, events);

    return {
      environment: { wind, currentA, currentB, surfaceA, surfaceB, light },
      foods: foodFrames(input.now),
      fish,
      flies,
      events,
      debug: { seed },
    };
  }

  return { dropFood, step };
}
