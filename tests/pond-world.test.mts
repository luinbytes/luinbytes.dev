import assert from "node:assert/strict";
import test from "node:test";
import { inflateSync } from "node:zlib";

import {
  createPondWorld,
  ROCK_ANCHORS,
  ROCK_SURFACES,
  type PondTarget,
  type PondWorldEvent,
} from "../components/concepts/signal-desk/pond-world.ts";
import {
  createPondSimulation,
  type FishDefinition,
  type FishSimulationFrame,
  type PondPointerInput,
} from "../components/concepts/signal-desk/pond-simulation.ts";

const FRAME_MS = 1000 / 30;
const ALL_ANCHORS = ROCK_ANCHORS.map((anchor) => anchor.id);
const QUIET_POINTER: PondPointerInput = {
  position: { x: -1000, y: -1000 },
  velocity: { x: 0, y: 0 },
  influence: 0,
  energy: 0,
};

const MOTION_FISH = {
  id: "motion-koi",
  row: 0,
  displayWidth: 54,
  position: { x: 500, y: 500 },
  heading: 0,
  cruise: 13,
  alpha: 0.8,
  species: "koi",
};

const MOTION_FLY = {
  id: "motion-fly",
  position: { x: 580, y: 285 },
  orbitX: 240,
  orbitY: 90,
  phase: 0.4,
  speed: 0.021,
  color: 0x56d7c8,
};

function contactSimulation(fish: readonly FishDefinition[], seed = "contact-angles") {
  return createPondSimulation({ seed, width: 1586, height: 1024, isWater: () => true, fish, flies: [] });
}

function tickFish(simulation: ReturnType<typeof createPondSimulation>, index: number, delta = 1 / 30, pointer = QUIET_POINTER) {
  return simulation.step({ now: index * FRAME_MS, delta, pointer, visibleAnchorIds: [] });
}

function assertFishBodiesClear(fish: readonly FishSimulationFrame[]) {
  for (let first = 0; first < fish.length; first += 1) {
    for (let second = first + 1; second < fish.length; second += 1) {
      const a = fish[first];
      const b = fish[second];
      for (const firstOffset of [-0.2, 0, 0.2]) {
        for (const secondOffset of [-0.2, 0, 0.2]) {
          const distance = Math.hypot(
            b.position.x + Math.cos(b.heading) * secondOffset * b.displayWidth - a.position.x - Math.cos(a.heading) * firstOffset * a.displayWidth,
            b.position.y + Math.sin(b.heading) * secondOffset * b.displayWidth - a.position.y - Math.sin(a.heading) * firstOffset * a.displayWidth,
          );
          assert.ok(distance >= (a.displayWidth + b.displayWidth) * 0.36 - 1e-7,
            `${a.id} passed through ${b.id} at depth ${a.depth}/${b.depth}, gap ${distance - (a.displayWidth + b.displayWidth) * 0.36}`);
        }
      }
    }
  }
}

function noseContactFish(degrees: number): FishDefinition[] {
  const angle = degrees * Math.PI / 180;
  return [
    { ...MOTION_FISH, id: "a" },
    {
      ...MOTION_FISH,
      id: "b",
      heading: Math.PI + angle,
      position: {
        x: 500 + 10.8 * (1 + Math.cos(angle)) + Math.cos(angle / 2) * 38.891,
        y: 500 + 10.8 * Math.sin(angle) + Math.sin(angle / 2) * 38.891,
      },
    },
  ];
}

function nearbyTargets(now: number): PondTarget[] {
  return ROCK_ANCHORS.map((anchor, index) => ({
    id: `fish-${index}`,
    type: index % 3 === 0 ? "fly" : "fish",
    position: {
      x: anchor.position.x + (index % 2 === 0 ? 72 : -72) + Math.sin(now * 0.0007 + index) * 9,
      y: anchor.position.y - 24 + Math.cos(now * 0.0009 + index * 0.7) * 7,
    },
    velocity: {
      x: Math.cos(now * 0.0007 + index) * 6.3,
      y: -Math.sin(now * 0.0009 + index * 0.7) * 6.3,
    },
    visible: true,
    attackable: true,
    interactionRange: index % 3 === 0 ? 12 : 34,
  }));
}

function runWorld(seed: string, seconds: number, withTargets = true, manualHops = true) {
  const world = createPondWorld(seed);
  const events: PondWorldEvent[] = [];
  const trace: string[] = [];
  let now = 0;

  for (let frameIndex = 0; frameIndex < seconds * 30; frameIndex += 1) {
    now += FRAME_MS;
    if (manualHops && frameIndex > 0 && frameIndex % 330 === 0) world.requestHop();
    const targets = withTargets ? nearbyTargets(now) : [];
    const frame = world.step({ now, delta: 1 / 30, targets, visibleAnchorIds: ALL_ANCHORS });
    events.push(...frame.events);

    const anchor = ROCK_ANCHORS.find((candidate) => candidate.id === frame.cat.anchorId);
    assert.ok(anchor, `unknown current anchor ${frame.cat.anchorId}`);
    if (frame.cat.grounded) {
      assert.ok(Math.hypot(frame.cat.contact.x - anchor.position.x, frame.cat.contact.y - anchor.position.y) < 0.001);
    }

    for (const event of frame.events) {
      if (event.type === "land") {
        const landed = ROCK_ANCHORS.find((candidate) => candidate.id === event.anchorId);
        assert.ok(landed, `unknown landing anchor ${event.anchorId}`);
        assert.equal(frame.cat.grounded, true);
        assert.ok(Math.hypot(event.position.x - landed.position.x, event.position.y - landed.position.y) < 0.001);
      }
      if (event.type === "bat") {
        const target = targets.find((candidate) => candidate.id === event.targetId);
        assert.ok(target, "bat target must exist in the current world frame");
        assert.equal(target.visible && target.attackable, true);
        assert.ok(event.distance <= event.reach, `bat distance ${event.distance} exceeded reach ${event.reach}`);
        assert.equal(frame.cat.selectedTargetId, event.targetId);
        assert.ok(Math.hypot(frame.cat.aim.x - event.aim.x, frame.cat.aim.y - event.aim.y) < 0.001);
        assert.equal(frame.cat.facing, event.aim.x < frame.cat.contact.x ? -1 : 1);
      }
    }

    if (frame.events.length) {
      trace.push(
        frame.events
          .map((event) =>
            event.type === "transition"
              ? `${event.type}:${event.to}:${event.reason}`
              : event.type === "land"
                ? `${event.type}:${event.anchorId}`
                : event.type === "bat"
                  ? `${event.type}:${event.targetType}:${event.hit}`
                  : event.type,
          )
          .join("|"),
      );
    }
  }

  return { events, trace };
}

test("authored anchors lie inside their rock-local sitting regions", () => {
  for (const rock of ROCK_SURFACES) {
    for (const authored of rock.anchors) {
      assert.ok(Math.abs(authored.local.x) <= rock.sittingRegion.radiusX);
      assert.ok(Math.abs(authored.local.y) <= rock.sittingRegion.radiusY);
      const anchor = ROCK_ANCHORS.find((candidate) => candidate.id === authored.id);
      assert.ok(anchor);
      const dx = anchor.position.x - rock.center.x;
      const dy = anchor.position.y - rock.center.y;
      assert.ok(Math.abs(dx * rock.tangent.x + dy * rock.tangent.y) <= rock.sittingRegion.radiusX);
      assert.ok(Math.abs(dx * rock.normal.x + dy * rock.normal.y) <= rock.sittingRegion.radiusY);
    }
  }
});

test("five virtual minutes without targets never produces an empty-space bat", () => {
  const { events } = runWorld("empty-target-soak", 300, false, false);
  assert.equal(events.some((event) => event.type === "bat"), false);
});

test("passive patrols remember recent rocks instead of ping-ponging", () => {
  const { events } = runWorld("routine-memory", 300, false, false);
  const hops = events.filter((event): event is Extract<PondWorldEvent, { type: "takeoff" }> => event.type === "takeoff");
  assert.ok(hops.length >= 4, "the cat should still patrol occasionally");
  for (let index = 1; index < hops.length; index += 1) {
    assert.notDeepEqual(
      [hops[index].fromAnchor, hops[index].toAnchor],
      [hops[index - 1].toAnchor, hops[index - 1].fromAnchor],
      "the cat immediately reversed its previous hop",
    );
  }
});

test("the cat routes across rocks to hunt an actual fish", () => {
  const world = createPondWorld("purposeful-hunt");
  const south = ROCK_ANCHORS.find((anchor) => anchor.id === "south-stone-top")!;
  const events: PondWorldEvent[] = [];
  for (let frameIndex = 1; frameIndex <= 30 * 30; frameIndex += 1) {
    const now = frameIndex * FRAME_MS;
    const fish: PondTarget = {
      id: "hunt-fish",
      type: "fish",
      position: { x: south.position.x + 68, y: south.position.y - 28 },
      velocity: { x: 0, y: 0 },
      visible: true,
      attackable: true,
      interactionRange: 34,
    };
    events.push(...world.step({ now, delta: 1 / 30, targets: [fish], visibleAnchorIds: ALL_ANCHORS }).events);
  }
  assert.ok(events.some((event) => event.type === "transition" && event.reason === "moving-to-better-rock"));
  assert.ok(events.some((event) => event.type === "bat" && event.targetId === "hunt-fish"));
});

test("the cat chooses a fish beside a reachable perch instead of an open-water decoy", () => {
  const world = createPondWorld("perch-aware-hunt");
  const upperPerch = ROCK_ANCHORS.find((anchor) => anchor.id === "east-island-top")!;
  const targets: PondTarget[] = [
    {
      id: "open-water-decoy",
      type: "fish",
      position: { x: 900, y: 800 },
      velocity: { x: 0, y: 0 },
      visible: true,
      attackable: true,
      interactionRange: 30,
    },
    {
      id: "upper-perch-fish",
      type: "fish",
      position: { x: upperPerch.position.x + 72, y: upperPerch.position.y - 22 },
      velocity: { x: 0, y: 0 },
      visible: true,
      attackable: true,
      interactionRange: 34,
    },
  ];
  let firstTarget: string | null = null;
  const events: PondWorldEvent[] = [];

  for (let frameIndex = 1; frameIndex <= 40 * 30; frameIndex += 1) {
    const frame = world.step({
      now: frameIndex * FRAME_MS,
      delta: 1 / 30,
      targets,
      visibleAnchorIds: ALL_ANCHORS,
    });
    firstTarget ??= frame.cat.selectedTargetId;
    events.push(...frame.events);
  }

  assert.equal(firstTarget, "upper-perch-fish");
  assert.ok(events.some((event) => event.type === "land" && event.anchorId === "fern-stone-top"));
  assert.ok(events.some((event) => event.type === "land" && event.anchorId === "east-island-top"));
  assert.ok(events.some((event) => event.type === "bat" && event.targetId === "upper-perch-fish"));
  assert.equal(events.some((event) => event.type === "bat" && event.targetId === "open-water-decoy"), false);
});

test("the integrated cat hunts moving koi from the eastern rock route", () => {
  const simulation = createPondSimulation({
    seed: "6c75",
    width: 1586,
    height: 1024,
    isWater: () => true,
    fish: Array.from({ length: 14 }, (_, index) => ({
      id: `fish-${index}`,
      row: index % 4,
      displayWidth: 54 + index % 4 * 8,
      position: { x: 220 + index % 7 * 180, y: 180 + Math.floor(index / 7) * 400 },
      heading: index * 0.8,
      cruise: 12 + index % 4,
      alpha: 0.8,
      species: "koi",
    })),
    flies: [],
  });
  const events: PondWorldEvent[] = [];
  const landedAnchors = new Set<string>();

  for (let frameIndex = 1; frameIndex <= 300 * 30; frameIndex += 1) {
    const frame = simulation.step({
      now: frameIndex * FRAME_MS,
      delta: 1 / 30,
      pointer: { position: { x: -1000, y: -1000 }, velocity: { x: 0, y: 0 }, influence: 0, energy: 0 },
      visibleAnchorIds: ALL_ANCHORS,
    });
    events.push(...frame.events);
    for (const event of frame.events) if (event.type === "land") landedAnchors.add(event.anchorId);
  }

  assert.ok(landedAnchors.has("east-island-top"), "cat never reached the eastern island");
  assert.ok(landedAnchors.has("east-bank-step-top"), "cat never used the eastern bank step");
  assert.ok(events.some((event) => event.type === "bat" && event.targetType === "fish"), "cat never completed a moving-koi hunt");
  simulation.destroy();
});

test("long seeded sessions only land on anchors and only bat valid targets", () => {
  for (let seed = 0; seed < 12; seed += 1) {
    const { events } = runWorld(`quality-${seed}`, 180);
    assert.ok(events.some((event) => event.type === "land"), `seed ${seed} never landed`);
    assert.ok(events.some((event) => event.type === "bat"), `seed ${seed} never batted`);
  }
});

test("the same seed is reproducible and different seeds stay varied", () => {
  const first = runWorld("repeatable", 90).trace;
  const second = runWorld("repeatable", 90).trace;
  assert.deepEqual(first, second);

  const traces = new Set(Array.from({ length: 8 }, (_, index) => runWorld(`variety-${index}`, 90).trace.join("\n")));
  assert.ok(traces.size >= 6, `expected varied procedural traces, got ${traces.size}`);
});

test("food drops are exact, bounded, and evict the oldest entity at capacity", () => {
  const world = createPondWorld("food-capacity");
  const requested = Array.from({ length: 12 }, (_, index) => ({
    x: 120 + index % 4 * 260,
    y: 150 + Math.floor(index / 4) * 220,
  }));
  requested.forEach((position) => world.dropFood(position));
  const frame = world.step({ now: 1000, delta: 1 / 30, targets: [], visibleAnchorIds: ALL_ANCHORS });
  assert.equal(frame.foods.length, 8);
  assert.equal(frame.events.filter((event) => event.type === "food-dropped").length, 12);
  assert.equal(frame.events.filter((event) => event.type === "food-expired" && event.reason === "capacity").length, 4);
  const lastDrop = frame.events.filter((event) => event.type === "food-dropped").at(-1);
  assert.equal(lastDrop?.type, "food-dropped");
  if (lastDrop?.type === "food-dropped") assert.deepEqual(lastDrop.position, requested.at(-1));
});

test("fish discover, reserve, curve toward, eat, and release seeded food", () => {
  const foodPosition = { x: 820, y: 520 };
  const world = createPondSimulation({
    seed: "feeding-soak",
    width: 1586,
    height: 1024,
    isWater: () => true,
    fish: Array.from({ length: 6 }, (_, index) => ({
      id: `feeding-fish-${index}`,
      row: index % 4,
      displayWidth: 52 + index * 2,
      position: {
        x: foodPosition.x + Math.cos(index / 6 * Math.PI * 2) * (120 + index * 12),
        y: foodPosition.y + Math.sin(index / 6 * Math.PI * 2) * (105 + index * 10),
      },
      heading: index / 6 * Math.PI * 2,
      cruise: 13,
      alpha: 0.8,
      species: ["kohaku", "ogon", "showa"][index % 3],
    })),
    flies: [],
  });
  world.dropFood(foodPosition);
  const events: PondWorldEvent[] = [];
  let sawDistinctReservedGoals = false;
  let maxFood = 0;

  for (let frameIndex = 1; frameIndex <= 75 * 30; frameIndex += 1) {
    const now = frameIndex * FRAME_MS;
    const frame = world.step({
      now,
      delta: 1 / 30,
      pointer: {
        position: { x: -1000, y: -1000 },
        velocity: { x: 0, y: 0 },
        influence: 0,
        energy: 0,
      },
      visibleAnchorIds: ["south-stone-top"],
    });
    events.push(...frame.events);
    maxFood = Math.max(maxFood, frame.foods.length);
    const reservedGoals = frame.fish.filter((intent) => intent.reserved && intent.goal).map((intent) => `${intent.goal!.x.toFixed(2)},${intent.goal!.y.toFixed(2)}`);
    if (new Set(reservedGoals).size > 1) sawDistinctReservedGoals = true;
  }

  assert.equal(maxFood, 1);
  assert.ok(events.some((event) => event.type === "fish-noticed-food"));
  assert.ok(events.some((event) => event.type === "fish-reserved-food"));
  assert.ok(events.some((event) => event.type === "fish-arrived"));
  assert.ok(events.some((event) => event.type === "fish-fed"));
  assert.ok(events.some((event) => event.type === "food-expired"));
  assert.equal(sawDistinctReservedGoals, true);
  world.destroy();
});

test("nearby fish commit to fresh food promptly despite the drop disturbance", () => {
  const world = createPondWorld("food-response-latency");
  const foodPosition = { x: 820, y: 520 };
  world.dropFood(foodPosition);
  let noticedAt = Number.POSITIVE_INFINITY;
  let reservedAt = Number.POSITIVE_INFINITY;

  for (let frameIndex = 1; frameIndex <= 60; frameIndex += 1) {
    const now = frameIndex * FRAME_MS;
    const fish: PondTarget = {
      id: "quick-fish",
      type: "fish",
      position: { x: foodPosition.x + 160, y: foodPosition.y + 25 },
      velocity: { x: -4, y: 0 },
      visible: true,
      attackable: true,
      interactionRange: 32,
      species: "kohaku",
      danger: 0.78,
    };
    const frame = world.step({ now, delta: 1 / 30, targets: [fish], visibleAnchorIds: ALL_ANCHORS });
    if (frame.events.some((event) => event.type === "fish-noticed-food")) noticedAt = Math.min(noticedAt, now);
    if (frame.events.some((event) => event.type === "fish-reserved-food")) reservedAt = Math.min(reservedAt, now);
  }

  assert.ok(noticedAt <= 200, `fish noticed food too slowly: ${noticedAt}ms`);
  assert.ok(reservedAt <= 400, `fish reserved food too slowly: ${reservedAt}ms`);
});

test("idle koi stagger swimming, gliding, darts and surface rises without food or danger", () => {
  const simulation = createPondSimulation({
    seed: "idle-life",
    width: 1586,
    height: 1024,
    isWater: (x, y) => x > 180 && x < 850 && y > 160 && y < 700,
    fish: Array.from({ length: 3 }, (_, index) => ({
      ...MOTION_FISH,
      id: `idle-${index}`,
      position: { x: 360 + index * 120, y: 350 },
    })),
    flies: [],
  });
  const activities = Array.from({ length: 3 }, () => new Set<string>());
  let staggered = false;
  let glidingSpeed = Infinity;
  let dartingSpeed = 0;
  let surfaceDepth = 1;
  let swimmingDepth = 0;
  let previous = simulation.step({ now: 0, delta: 0, pointer: QUIET_POINTER, visibleAnchorIds: [] }).fish;
  for (let index = 1; index <= 120 * 30; index += 1) {
    const frame = simulation.step({ now: index * FRAME_MS, delta: 1 / 30, pointer: QUIET_POINTER, visibleAnchorIds: [] });
    staggered ||= new Set(frame.fish.map((fish) => fish.activity)).size > 1;
    frame.fish.forEach((fish, fishIndex) => {
      assert.equal(fish.reacting, false);
      assert.equal(fish.state, "cruising");
      assert.equal(fish.foodId, null);
      activities[fishIndex].add(fish.activity);
      if (fish.activity === "gliding") glidingSpeed = Math.min(glidingSpeed, fish.speedScale);
      if (fish.activity === "darting") dartingSpeed = Math.max(dartingSpeed, fish.speedScale);
      if (fish.activity === "surfacing") surfaceDepth = Math.min(surfaceDepth, fish.depth);
      if (fish.activity === "swimming") swimmingDepth = Math.max(swimmingDepth, fish.depth);
      const before = previous[fishIndex].position;
      assert.ok(Math.hypot(fish.position.x - before.x, fish.position.y - before.y) <= MOTION_FISH.cruise * 3.5 / 30);
      for (let sample = 0; sample <= 8; sample += 1) {
        const x = before.x + (fish.position.x - before.x) * sample / 8;
        const y = before.y + (fish.position.y - before.y) * sample / 8;
        assert.ok(x > 180 && x < 850 && y > 160 && y < 700, "idle motion crossed dry shore");
      }
    });
    previous = frame.fish;
  }
  for (const observed of activities) assert.deepEqual([...observed].sort(), ["darting", "gliding", "surfacing", "swimming"]);
  assert.equal(staggered, true, "idle fish switched activities together");
  assert.ok(glidingSpeed < 0.5 && dartingSpeed > 2, "idle speed changes were too small to read");
  assert.ok(surfaceDepth < 0.1 && swimmingDepth > 0.3, "idle fish never visibly rose and submerged");
  simulation.destroy();
});

test("fish accelerate and turn away from danger within locomotion bounds at different frame rates", () => {
  const finishes = [];
  for (const fps of [15, 30, 60]) {
    const simulation = createPondSimulation({
      seed: "escape-motion",
      width: 1586,
      height: 1024,
      isWater: () => true,
      fish: [MOTION_FISH],
      flies: [],
    });
    let previous = { position: MOTION_FISH.position, heading: 0, speed: MOTION_FISH.cruise };
    let fish;
    for (let index = 1; index <= fps; index += 1) {
      fish = simulation.step({
        now: index * 1000 / fps,
        delta: 1 / fps,
        pointer: { ...QUIET_POINTER, position: { x: 500, y: 520 }, influence: 1, energy: 1 },
        visibleAnchorIds: ["south-stone-top"],
      }).fish[0];
      const speed = Math.hypot(fish.velocity.x, fish.velocity.y);
      const turn = Math.atan2(Math.sin(fish.heading - previous.heading), Math.cos(fish.heading - previous.heading));
      assert.ok(Math.abs(turn) <= 6.7 / fps, "escape heading changed faster than its turn limit");
      assert.ok(Math.abs(speed - previous.speed) <= MOTION_FISH.cruise * 8.1 / fps, "escape acceleration exceeded its limit");
      assert.ok(Math.hypot(fish.position.x - previous.position.x, fish.position.y - previous.position.y) <= MOTION_FISH.cruise * 3.5 / fps);
      assert.ok(Math.abs(fish.turnRate - turn * fps) < 1e-9);
      assert.ok(Math.abs(fish.speedScale - speed / MOTION_FISH.cruise) < 1e-9);
      previous = { position: fish.position, heading: fish.heading, speed };
    }
    assert.ok(fish);
    assert.equal(fish.reacting, true);
    assert.ok(fish.position.y < 475, "fish failed to flee away from the nearby pointer");
    assert.ok(fish.speedScale > 2.5 && fish.speedScale <= 3.5);
    assert.ok(fish.depth > 0.8 && fish.depth <= 1);
    finishes.push(fish);
    simulation.destroy();
  }
  for (const fish of finishes.slice(1)) {
    assert.ok(Math.hypot(fish.position.x - finishes[0].position.x, fish.position.y - finishes[0].position.y) < 2);
    assert.ok(Math.abs(fish.speedScale - finishes[0].speedScale) < 0.15);
  }
});

test("shoreline avoidance rounds an island corner without dry crossings or recovery jumps", () => {
  const isWater = (x: number, y: number) =>
    x > 200 && x < 1000 && y > 200 && y < 800 && !(x > 445 && x < 525 && y > 420 && y < 580);
  const simulation = createPondSimulation({
    seed: "shore",
    width: 1586,
    height: 1024,
    isWater,
    fish: [{ ...MOTION_FISH, position: { x: 410, y: 500 } }],
    flies: [],
  });
  let previous = { x: 410, y: 500 };
  let crossedIsland = false;
  for (let index = 1; index <= 60 * 30; index += 1) {
    const fish = simulation.step({
      now: index * FRAME_MS,
      delta: 1 / 30,
      pointer: { ...QUIET_POINTER, position: { x: 350, y: 500 }, influence: 1, energy: 1 },
      visibleAnchorIds: ["south-stone-top"],
    }).fish[0];
    const distance = Math.hypot(fish.position.x - previous.x, fish.position.y - previous.y);
    assert.ok(distance <= MOTION_FISH.cruise * 3.5 / 30, "shore recovery teleported the fish");
    for (let sample = 0; sample <= 8; sample += 1) {
      assert.equal(isWater(
        previous.x + (fish.position.x - previous.x) * sample / 8,
        previous.y + (fish.position.y - previous.y) * sample / 8,
      ), true, "fish crossed a dry section between frames");
    }
    if (fish.position.x > 550) crossedIsland = true;
    previous = fish.position;
  }
  assert.equal(crossedIsland, true, "fish became trapped against the island corner");
  simulation.destroy();
});

test("flies damp arrival into a small hover and settle with still wings at rest", () => {
  const simulation = createPondSimulation({
    seed: "fly-rest",
    width: 1586,
    height: 1024,
    isWater: () => true,
    fish: [],
    flies: [MOTION_FLY],
  });
  let previous = { position: MOTION_FLY.position, state: "hovering" };
  let stationaryGoal = MOTION_FLY.position;
  let stateFrames = 0;
  let settledHoverFrames = 0;
  let settledRestFrames = 0;
  let sawFlight = false;
  for (let index = 1; index <= 90 * 30; index += 1) {
    const fly = simulation.step({
      now: index * FRAME_MS,
      delta: 1 / 30,
      pointer: QUIET_POINTER,
      visibleAnchorIds: ["south-stone-top"],
    }).flies[0];
    if (fly.state !== previous.state) {
      stationaryGoal = previous.position;
      stateFrames = 0;
    }
    stateFrames += 1;
    const speed = Math.hypot(fly.velocity.x, fly.velocity.y);
    if (fly.state === "foraging" && speed > 10) sawFlight = true;
    if (fly.state === "hovering" && stateFrames > 30) {
      assert.ok(Math.hypot(fly.position.x - stationaryGoal.x, fly.position.y - stationaryGoal.y) < 4, "hover overshot its air patch");
      assert.ok(speed < 4, "hover kept flying at travel speed");
      settledHoverFrames += 1;
    }
    if (fly.state === "resting" && stateFrames > 30) {
      assert.ok(speed < 0.1, "resting fly kept moving");
      assert.ok(fly.wingActivity < 0.01, "resting fly kept beating its wings");
      assert.ok(fly.lift < 0.02, "resting fly failed to settle");
      settledRestFrames += 1;
    }
    assert.equal(fly.reacting, false);
    previous = { position: fly.position, state: fly.state };
  }
  assert.equal(sawFlight, true);
  assert.ok(settledHoverFrames >= 60);
  assert.ok(settledRestFrames >= 60);
  simulation.destroy();
});

test("a batted fly flees the cat origin independently of an inactive pointer", () => {
  const options = {
    seed: "bat-0",
    width: 1586,
    height: 1024,
    isWater: () => true,
    fish: [],
    flies: [{ ...MOTION_FLY, position: { x: 850, y: 880 } }],
  };
  const leftPointer = createPondSimulation(options);
  const rightPointer = createPondSimulation(options);
  let batOrigin;
  let batDistance = 0;
  let batAt = 0;
  let escaped = false;
  for (let index = 1; index <= 40 * 30; index += 1) {
    const input = { now: index * FRAME_MS, delta: 1 / 30, pointer: QUIET_POINTER, visibleAnchorIds: ["south-stone-top"] };
    const left = leftPointer.step(input);
    const right = rightPointer.step({ ...input, pointer: { ...QUIET_POINTER, position: { x: 3000, y: 3000 } } });
    assert.deepEqual(left.flies, right.flies, "bat escape used the inactive pointer as its origin");
    const fly = left.flies[0];
    if (!batOrigin && left.events.some((event) => event.type === "bat" && event.targetType === "fly")) {
      batOrigin = left.cat.contact;
      batDistance = Math.hypot(fly.position.x - batOrigin.x, fly.position.y - batOrigin.y);
      batAt = index;
      assert.equal(fly.reacting, true);
    }
    if (batOrigin && index === batAt + 20) {
      assert.ok(Math.hypot(fly.position.x - batOrigin.x, fly.position.y - batOrigin.y) > batDistance + 30, "fly failed to flee the bat origin");
      assert.ok((fly.position.x - batOrigin.x) * fly.velocity.x + (fly.position.y - batOrigin.y) * fly.velocity.y > 0);
      escaped = true;
      break;
    }
  }
  assert.equal(escaped, true, "fixture never produced a bat followed by an escape");
  leftPointer.destroy();
  rightPointer.destroy();
});

test("seeded locomotion is reproducible and paused or invalid deltas cannot advance it", () => {
  const options = { seed: "motion-repeatable", width: 1586, height: 1024, isWater: () => true, fish: [MOTION_FISH], flies: [MOTION_FLY] };
  const first = createPondSimulation(options);
  const second = createPondSimulation(options);
  for (let index = 1; index <= 90; index += 1) {
    const input = { now: index * FRAME_MS, delta: 1 / 30, pointer: QUIET_POINTER, visibleAnchorIds: ["south-stone-top"] };
    const frame = first.step(input);
    assert.deepEqual(frame, second.step(input));
  }
  const before = first.frame!;
  for (const delta of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
    const paused = first.step({ now: 3000, delta, pointer: QUIET_POINTER, visibleAnchorIds: ["south-stone-top"] });
    assert.deepEqual(paused.fish, before.fish);
    assert.deepEqual(paused.flies, before.flies);
  }
  const resumed = first.step({ now: 3000 + FRAME_MS, delta: 100, pointer: QUIET_POINTER, visibleAnchorIds: ["south-stone-top"] });
  assert.ok(Math.hypot(resumed.fish[0].position.x - before.fish[0].position.x, resumed.fish[0].position.y - before.fish[0].position.y) <= MOTION_FISH.cruise * 3.5 * 0.1);
  assert.ok(Math.hypot(resumed.flies[0].position.x - before.flies[0].position.x, resumed.flies[0].position.y - before.flies[0].position.y) <= 14.3);
  first.destroy();
  second.destroy();
});

test("shore steering retains its turn instead of flipping at a blocked bank", () => {
  const simulation = createPondSimulation({
    seed: "jitter-9", width: 1586, height: 1024,
    isWater: (x, y) => x > 200 && x < 750 && y > 200 && y < 700,
    fish: [{ ...MOTION_FISH, id: "a", displayWidth: 82, position: { x: 720, y: 490 }, cruise: 35 }], flies: [],
  });
  const pointer = { ...QUIET_POINTER, position: { x: 600, y: 490 }, influence: 1, energy: 1 };
  let previous = tickFish(simulation, 0, 0, pointer).fish[0];
  let reversals = 0;
  let stillFrames = 0;
  let longestStill = 0;
  let traveled = 0;
  for (let index = 1; index <= 900; index += 1) {
    const fish = tickFish(simulation, index, 1 / 30, pointer).fish[0];
    const distance = Math.hypot(fish.position.x - previous.position.x, fish.position.y - previous.position.y);
    if (fish.turnRate * previous.turnRate < 0 && Math.abs(fish.turnRate) > 1 && Math.abs(previous.turnRate) > 1) reversals += 1;
    stillFrames = distance < 0.01 ? stillFrames + 1 : 0;
    longestStill = Math.max(longestStill, stillFrames);
    traveled += distance;
    assert.ok(distance <= 35 * 3.5 / 30 + 1e-8, "bank recovery jumped");
    previous = fish;
  }
  assert.ok(reversals <= 4, `shore steering reversed ${reversals} times`);
  assert.ok(longestStill < 30, `fish was pinned for ${longestStill} frames`);
  assert.ok(traveled > 600, `fish traveled only ${traveled} world units`);
  simulation.destroy();
});

test("the authored raster bank provides an escape instead of a stationary fish", () => {
  // Alpha > 96 from the authored water layer, cropped at 1180,400 to 160 by 160.
  const bits = inflateSync(Buffer.from(
    "eJzt1LuRxCAMAFAxDggpgVJcGu7kWnEp28E5dOAxh8RPAu2Nw7uZJVnvGwOSEI6xjADwiv4Vo4XYhlFsgSO6ZI6ZhTPaI0bPzMNNtjILW3r3TA/MaP6NE6R9xc/4jP88TsVeiu3l1+3d6gVZ4O5WHgH6ynDRT7q9x2geoC9YpjiATTEYzSZrG5f1lmTXYIZZKDPQaoD1g8CtfjiAmd1mW/bZzDFbDYBZqAlBj68Zi3nldsuQKd8hZLRtNNvr3L6THr+mdUqsm/XU0CA/1TIbwFdagUv4uM/BKaAt7GTzbpQqt3Sq+C5rH4oUowDemCkjnC82SdWgruDNCsXYxrg8dUpvKVqeDAbDarJgcEuqOjPXrFcBl6JTHCwAiERw+fWB4fJ+WO+dOZDxQbM42/arhWa7NNr3JW2VRn+DYrTRMdgi0qXlqWCj+ek4cm/0NFzOVBx5sYW3Szltx3u3WOAtWbvim9kiq/nWjGIw2zpbbhRpVjGjGMy2KuYVs4qZ2Up0wvxDc3/Insas2aqYVhfN4lNTap8b7YFpZznYihfCSTP5VnDDFK6hXzD9Y+grfGNvCWdr15EZRXHVoFkGp+xxyr5tIqy8yCp3RHHfmjnFwmBnfWJ21d1Gw0h/AHkU42I=",
    "base64",
  ));
  const isWater = (x: number, y: number) => {
    const localX = Math.round(x) - 1180;
    const localY = Math.round(y) - 400;
    const bit = localY * 160 + localX;
    return localX >= 0 && localX < 160 && localY >= 0 && localY < 160 && (bits[bit >> 3] & 1 << (bit & 7)) !== 0;
  };
  const simulation = createPondSimulation({
    seed: "stuck-repro", width: 1586, height: 992, isWater,
    fish: [{ ...MOTION_FISH, id: "fish-15", position: { x: 1256.779, y: 470.504 }, heading: -0.9224, cruise: 27 }], flies: [],
  });
  let previous = tickFish(simulation, 0, 0).fish[0];
  let still = 0;
  let longestStill = 0;
  let traveled = 0;
  for (let index = 1; index <= 450; index += 1) {
    const fish = tickFish(simulation, index).fish[0];
    const distance = Math.hypot(fish.position.x - previous.position.x, fish.position.y - previous.position.y);
    traveled += distance;
    still = distance < 0.001 ? still + 1 : 0;
    longestStill = Math.max(longestStill, still);
    assert.equal(isWater(fish.position.x, fish.position.y), true);
    assert.ok(distance <= 27 * 3.5 / 30 + 1e-8);
    previous = fish;
  }
  assert.ok(longestStill < 60, `raster bank pinned the fish for ${longestStill} frames`);
  assert.ok(traveled > 40, `fish swam only ${traveled} world units`);
  simulation.destroy();
});

test("crossing, flank and overtaking fish swim around occupied bodies without bonking", () => {
  const scenarios = [
    [{ ...MOTION_FISH, id: "a", position: { x: 450, y: 500 }, cruise: 35 }, { ...MOTION_FISH, id: "b", position: { x: 500, y: 450 }, heading: Math.PI / 2, cruise: 35 }],
    [{ ...MOTION_FISH, id: "a", position: { x: 420, y: 500 }, cruise: 40 }, { ...MOTION_FISH, id: "b", position: { x: 500, y: 500 }, cruise: 8 }],
    [{ ...MOTION_FISH, id: "a", cruise: 30 }, { ...MOTION_FISH, id: "b", position: { x: 538.901, y: 500 }, heading: Math.PI / 2, cruise: 30 }],
  ];
  for (const definitions of scenarios) {
    const simulation = contactSimulation(definitions, "passing");
    let previous = tickFish(simulation, 0, 0).fish;
    const traveled = [0, 0];
    for (let index = 1; index <= 240; index += 1) {
      const fish = tickFish(simulation, index).fish;
      assertFishBodiesClear(fish);
      fish.forEach((agent, fishIndex) => {
        assert.equal(agent.stun, null, "ordinary passing produced a bonk");
        traveled[fishIndex] += Math.hypot(agent.position.x - previous[fishIndex].position.x, agent.position.y - previous[fishIndex].position.y);
      });
      previous = fish;
    }
    assert.ok(traveled[0] > 100 && traveled[1] > 35, `contact froze fish, travel ${traveled}`);
    simulation.destroy();
  }
});

test("a distant head-on course avoids predictively before actual nose contact", () => {
  const simulation = contactSimulation([
    { ...MOTION_FISH, id: "a", position: { x: 400, y: 500 }, cruise: 30 },
    { ...MOTION_FISH, id: "b", position: { x: 600, y: 500 }, heading: Math.PI, cruise: 30 },
  ], "predictive");
  let maximumSideStep = 0;
  for (let index = 1; index <= 120; index += 1) {
    const fish = tickFish(simulation, index).fish;
    assertFishBodiesClear(fish);
    assert.equal(fish.some((agent) => agent.stun !== null), false);
    maximumSideStep = Math.max(maximumSideStep, ...fish.map((agent) => Math.abs(agent.position.y - 500)));
  }
  assert.ok(maximumSideStep > 20, "head-on course never steered aside");
  simulation.destroy();
});

test("fish touching a flank yield space to turn and resume swimming", () => {
  const simulation = contactSimulation([
    { ...MOTION_FISH, id: "a" },
    { ...MOTION_FISH, id: "b", position: { x: 549.691, y: 500 }, heading: Math.PI / 2 },
  ], "touching");
  const initial = tickFish(simulation, 0, 0).fish;
  const firstContact = tickFish(simulation, 1).fish;
  assertFishBodiesClear(firstContact);
  assert.ok(firstContact[0].heading > 0.05, "a contact at t=0 cancelled the avoidance turn");
  assert.ok(firstContact[1].heading < Math.PI / 2 - 0.05, "the other fish could not turn out of contact");
  const traveled = [0, 0];
  let previous = firstContact;
  for (let index = 2; index <= 90; index += 1) {
    const fish = tickFish(simulation, index).fish;
    assertFishBodiesClear(fish);
    fish.forEach((agent, fishIndex) => {
      assert.equal(agent.stun, null, "a flank contact bonked");
      const distance = Math.hypot(agent.position.x - previous[fishIndex].position.x, agent.position.y - previous[fishIndex].position.y);
      assert.ok(distance <= 13 * 3.5 / 30 + 1e-8, "yielding teleported a fish");
      traveled[fishIndex] += distance;
    });
    previous = fish;
  }
  assert.ok(traveled.every((distance) => distance > 30), `touching fish failed to escape, travel ${traveled}`);
  assert.ok(Math.hypot(previous[0].position.x - previous[1].position.x, previous[0].position.y - previous[1].position.y) > 60);
  assertFishBodiesClear(initial);
  simulation.destroy();
});

test("only approaching nose contact within 30 degrees of opposing headings bonks", () => {
  for (const degrees of [0, 29, 30, 31, 90]) {
    const simulation = contactSimulation(noseContactFish(degrees));
    const frame = tickFish(simulation, 1);
    assertFishBodiesClear(frame.fish);
    assert.deepEqual(frame.fish.map((fish) => fish.stun), degrees <= 30
      ? [{ remaining: 5, elapsed: 0, serial: 1 }, { remaining: 5, elapsed: 0, serial: 1 }]
      : [null, null]);
    simulation.destroy();
  }
  const separating = contactSimulation(noseContactFish(0).map((fish) => ({ ...fish, heading: fish.heading + Math.PI })));
  for (let index = 1; index <= 30; index += 1) {
    const frame = tickFish(separating, index);
    assert.equal(frame.fish.some((fish) => fish.stun !== null), false, "opposing tails or separating fish bonked");
    assertFishBodiesClear(frame.fish);
  }
  separating.destroy();
});

test("bonk lasts five simulation seconds, freezes on pause, ignores food and threat, then accelerates", () => {
  const simulation = contactSimulation(noseContactFish(0));
  const contact = tickFish(simulation, 1);
  assert.deepEqual(contact.fish[0].stun, { remaining: 5, elapsed: 0, serial: 1 });
  const pausedFish = contact.fish;
  for (const delta of [0, -1, Number.NaN, Infinity]) {
    const paused = simulation.step({ now: 300000, delta, pointer: QUIET_POINTER, visibleAnchorIds: [] });
    assert.deepEqual(paused.fish, pausedFish, "wall-clock pause consumed stun time or moved fish");
  }
  simulation.dropFood({ x: 530, y: 500 });
  const pointer = { ...QUIET_POINTER, position: { x: 480, y: 520 }, influence: 1, energy: 1 };
  for (let index = 1; index <= 49; index += 1) {
    const frame = tickFish(simulation, index + 1, 0.1, pointer);
    assertFishBodiesClear(frame.fish);
    for (const fish of frame.fish) {
      assert.ok(fish.stun);
      assert.equal(fish.stun.serial, 1);
      assert.ok(Math.abs(fish.stun.remaining - (5 - index * 0.1)) < 1e-8);
      assert.ok(Math.abs(fish.stun.elapsed - index * 0.1) < 1e-8);
      assert.ok(fish.speedScale > 0.1 && fish.speedScale <= 0.1800001, "food or danger bypassed slow movement");
    }
  }
  assert.deepEqual(contact.fish[0].stun, { remaining: 5, elapsed: 0, serial: 1 }, "later ticks mutated an exported snapshot");
  const recovered = tickFish(simulation, 51, 0.1, pointer);
  assert.deepEqual(recovered.fish.map((fish) => fish.stun), [null, null]);
  assert.ok(recovered.fish.every((fish) => fish.speedScale > 0.18 && fish.speedScale < 1.1), "recovery skipped normal acceleration");
  let resumedSpeed = 0;
  for (let index = 52; index <= 81; index += 1) {
    const frame = tickFish(simulation, index, 0.1, pointer);
    assertFishBodiesClear(frame.fish);
    assert.equal(frame.fish.some((fish) => fish.stun !== null), false, "contact retriggered a stun loop");
    resumedSpeed = Math.max(resumedSpeed, frame.fish[0].speedScale);
  }
  assert.ok(resumedSpeed > 2, "fish never resumed normal escape speed");
  simulation.destroy();
});

test("swept contacts prevent small fast fish from tunneling between large frame steps", () => {
  const simulation = contactSimulation([
    { ...MOTION_FISH, id: "a", displayWidth: 12, position: { x: 420, y: 500 }, cruise: 500 },
    { ...MOTION_FISH, id: "b", displayWidth: 12, position: { x: 500, y: 420 }, heading: Math.PI / 2, cruise: 500 },
  ], "swept");
  let previous = tickFish(simulation, 0, 0).fish;
  let traveled = 0;
  for (let index = 1; index <= 10; index += 1) {
    const fish = tickFish(simulation, index, 0.1).fish;
    for (let sample = 0; sample <= 20; sample += 1) {
      assertFishBodiesClear(fish.map((agent, fishIndex) => {
        const before = previous[fishIndex];
        const turn = Math.atan2(Math.sin(agent.heading - before.heading), Math.cos(agent.heading - before.heading));
        return { ...agent, position: {
          x: before.position.x + (agent.position.x - before.position.x) * sample / 20,
          y: before.position.y + (agent.position.y - before.position.y) * sample / 20,
        }, heading: before.heading + turn * sample / 20 };
      }));
    }
    traveled += Math.hypot(fish[0].position.x - previous[0].position.x, fish[0].position.y - previous[0].position.y);
    previous = fish;
  }
  assert.ok(traveled > 200, "swept resolution froze the scene");
  simulation.destroy();
});

test("separating disc chords still prevent contact during the interpolated turn", () => {
  const simulation = contactSimulation([
    { ...MOTION_FISH, id: "a", displayWidth: 82, cruise: 0.1 },
    { ...MOTION_FISH, id: "b", displayWidth: 82, cruise: 0.1,
      position: { x: 591.5452552932435, y: 506.4186551001654 }, heading: Math.PI },
  ]);
  const pointer = { ...QUIET_POINTER, position: { x: 480, y: 500 }, influence: 1, energy: 1 };
  const before = tickFish(simulation, 0, 0, pointer).fish;
  const after = tickFish(simulation, 1, 0.1, pointer).fish;
  assertFishBodiesClear(before);
  assertFishBodiesClear(after);
  for (let sample = 1; sample < 100; sample += 1) {
    assertFishBodiesClear(after.map((agent, fishIndex) => {
      const start = before[fishIndex];
      const turn = Math.atan2(Math.sin(agent.heading - start.heading), Math.cos(agent.heading - start.heading));
      return { ...agent, position: {
        x: start.position.x + (agent.position.x - start.position.x) * sample / 100,
        y: start.position.y + (agent.position.y - start.position.y) * sample / 100,
      }, heading: start.heading + turn * sample / 100 };
    }));
  }
  assert.deepEqual(after.map((agent) => agent.stun), [
    { remaining: 5, elapsed: 0, serial: 1 },
    { remaining: 5, elapsed: 0, serial: 1 },
  ]);
  simulation.destroy();
});

test("overlapping shoreline spawns separate in water before the first frame without bonking", () => {
  const isWater = (x: number, y: number) => x > 200 && x < 900 && y > 200 && y < 700;
  const simulation = createPondSimulation({
    seed: "spawn-overlap", width: 1586, height: 1024, isWater, flies: [],
    fish: Array.from({ length: 4 }, (_, index) => ({ ...MOTION_FISH, id: `overlap-${index}`, position: { x: 215, y: 220 }, heading: index * Math.PI / 2 })),
  });
  const initial = tickFish(simulation, 0, 0).fish;
  assertFishBodiesClear(initial);
  assert.ok(initial.every((fish) => isWater(fish.position.x, fish.position.y) && fish.stun === null && fish.maxStep === 0));
  for (let index = 1; index <= 90; index += 1) assertFishBodiesClear(tickFish(simulation, index).fish);
  simulation.destroy();
});

test("crowded fish locomotion and contact serials are reproducible across seeds", () => {
  const run = (seed: string) => {
    const simulation = contactSimulation(Array.from({ length: 8 }, (_, index) => ({
      ...MOTION_FISH, id: `crowd-${index}`, displayWidth: 40 + index * 3,
      position: { x: 500 + index % 4 * 62, y: 420 + Math.floor(index / 4) * 65 }, heading: index * 0.9, cruise: 30,
    })), seed);
    const trace = [];
    for (let index = 1; index <= 300; index += 1) {
      const fish = tickFish(simulation, index).fish;
      assertFishBodiesClear(fish);
      if (index % 10 === 0) trace.push(fish);
    }
    simulation.destroy();
    return trace;
  };
  const first = run("crowd-1");
  assert.deepEqual(run("crowd-1"), first);
  assert.notDeepEqual(run("crowd-2"), first);
});
