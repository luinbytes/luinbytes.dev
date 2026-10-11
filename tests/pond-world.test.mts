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

test("a natural converging head-on approach reaches nose contact before bonking", () => {
  const simulation = contactSimulation([
    { ...MOTION_FISH, id: "a", position: { x: 400, y: 500 }, cruise: 30 },
    { ...MOTION_FISH, id: "b", position: { x: 600, y: 500 }, heading: Math.PI, cruise: 30 },
  ], "predictive");
  let previous = tickFish(simulation, 0, 0).fish;
  let contactAt = 0;
  for (let index = 1; index <= 120; index += 1) {
    const fish = tickFish(simulation, index).fish;
    assertFishBodiesClear(fish);
    if (fish.some((agent) => agent.stun !== null)) {
      assert.deepEqual(fish.map((agent) => agent.stun), [
        { remaining: 5, elapsed: 0, serial: 1 }, { remaining: 5, elapsed: 0, serial: 1 },
      ]);
      assert.ok(index > 30, "bonk occurred before the fish completed their approach");
      assert.ok(previous[0].position.x < fish[0].position.x && previous[1].position.x > fish[1].position.x,
        "separating fish produced a bonk");
      assert.ok(Math.abs(Math.cos(fish[0].heading - fish[1].heading) + 1) < 1e-8);
      const noseDiscDistance = Math.hypot(
        fish[1].position.x + Math.cos(fish[1].heading) * 10.8 - fish[0].position.x - Math.cos(fish[0].heading) * 10.8,
        fish[1].position.y + Math.sin(fish[1].heading) * 10.8 - fish[0].position.y - Math.sin(fish[0].heading) * 10.8,
      );
      assert.ok(noseDiscDistance <= 39.26, `fish bonked across a gap of ${noseDiscDistance - 38.88}`);
      contactAt = index;
      break;
    }
    assert.ok(Math.abs(fish[0].position.y - 500) < 1e-8 && Math.abs(fish[1].position.y - 500) < 1e-8);
    previous = fish;
  }
  assert.ok(contactAt > 0, "converging noses never reached contact");
  for (let index = 1; index <= 49; index += 1) {
    const fish = tickFish(simulation, contactAt + index, 0.1).fish;
    assertFishBodiesClear(fish);
    for (const agent of fish) assert.ok(agent.stun && Math.abs(agent.stun.remaining - (5 - index * 0.1)) < 1e-8);
  }
  assert.deepEqual(tickFish(simulation, contactAt + 50, 0.1).fish.map((agent) => agent.stun), [null, null]);
  simulation.destroy();
});

test("opposing courses that miss the noses pass without a bonk", () => {
  const simulation = contactSimulation([
    { ...MOTION_FISH, id: "a", position: { x: 400, y: 480 }, cruise: 30 },
    { ...MOTION_FISH, id: "b", position: { x: 600, y: 520 }, heading: Math.PI, cruise: 30 },
  ], "predictive-miss");
  let traveled = 0;
  let previous = tickFish(simulation, 0, 0).fish;
  for (let index = 1; index <= 120; index += 1) {
    const fish = tickFish(simulation, index).fish;
    assertFishBodiesClear(fish);
    assert.deepEqual(fish.map((agent) => agent.stun), [null, null]);
    traveled += Math.hypot(fish[0].position.x - previous[0].position.x, fish[0].position.y - previous[0].position.y);
    previous = fish;
  }
  assert.ok(traveled > 80, "passing fish stalled instead of swimming aside");
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
  const traveled = [0, 0];
  const longestStill = [0, 0];
  const still = [0, 0];
  const turned = [false, false];
  let previous = firstContact;
  for (let index = 2; index <= 90; index += 1) {
    const fish = tickFish(simulation, index).fish;
    assertFishBodiesClear(fish);
    fish.forEach((agent, fishIndex) => {
      assert.equal(agent.stun, null, "a flank contact bonked");
      const distance = Math.hypot(agent.position.x - previous[fishIndex].position.x, agent.position.y - previous[fishIndex].position.y);
      assert.ok(distance <= 13 * 3.5 / 30 + 1e-8, "yielding teleported a fish");
      traveled[fishIndex] += distance;
      still[fishIndex] = distance < 0.001 ? still[fishIndex] + 1 : 0;
      longestStill[fishIndex] = Math.max(longestStill[fishIndex], still[fishIndex]);
      const headingChange = agent.heading - initial[fishIndex].heading;
      turned[fishIndex] ||= Math.abs(Math.atan2(Math.sin(headingChange), Math.cos(headingChange))) > 0.03;
    });
    previous = fish;
  }
  assert.deepEqual(turned, [true, true], "a flank contact indefinitely canceled a turn");
  assert.ok(longestStill.every((frames) => frames < 30), `touching fish stopped for ${longestStill} frames`);
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

test("a third fish cannot leave a bonk whose accepted nose paths never contact", () => {
  const definitions = [
    { ...MOTION_FISH, id: "a", displayWidth: 12, position: { x: 420, y: 500 }, heading: 0, cruise: 500 },
    { ...MOTION_FISH, id: "b", displayWidth: 12, position: { x: 500, y: 500 }, heading: Math.PI, cruise: 500 },
    { ...MOTION_FISH, id: "c", displayWidth: 12, position: { x: 442, y: 320 }, heading: Math.PI / 2, cruise: 2000 },
  ];
  const isolated = contactSimulation(definitions.slice(0, 2), "crowd-bonk-0");
  tickFish(isolated, 0, 0);
  assert.ok(tickFish(isolated, 1, 0.1).fish.every((fish) => fish.stun?.remaining === 5), "the pair never approached a real nose impact");
  isolated.destroy();

  const simulation = contactSimulation(definitions, "crowd-bonk-0");
  const before = tickFish(simulation, 0, 0).fish;
  const after = tickFish(simulation, 1, 0.1).fish;
  assert.ok(after[2].position.y > 490, "the crossing fish never reached the impact region");
  assertFishBodiesClear(after);
  for (let sample = 0; sample <= 200; sample += 1) {
    assertFishBodiesClear(after.map((fish, index) => ({ ...fish, position: {
      x: before[index].position.x + (fish.position.x - before[index].position.x) * sample / 200,
      y: before[index].position.y + (fish.position.y - before[index].position.y) * sample / 200,
    }, heading: before[index].heading + Math.atan2(Math.sin(fish.heading - before[index].heading), Math.cos(fish.heading - before[index].heading)) * sample / 200 })));
  }
  for (let index = 0; index < 2; index += 1) assert.equal(after[index].heading, before[index].heading);
  const nose = (fish: FishSimulationFrame) => ({
    x: fish.position.x + Math.cos(fish.heading) * fish.displayWidth * 0.2,
    y: fish.position.y + Math.sin(fish.heading) * fish.displayWidth * 0.2,
  });
  const aStart = nose(before[0]);
  const bStart = nose(before[1]);
  const aEnd = nose(after[0]);
  const bEnd = nose(after[1]);
  const x = bStart.x - aStart.x;
  const y = bStart.y - aStart.y;
  const vx = bEnd.x - bStart.x - aEnd.x + aStart.x;
  const vy = bEnd.y - bStart.y - aEnd.y + aStart.y;
  const closestTime = Math.max(0, Math.min(1, -(x * vx + y * vy) / (vx * vx + vy * vy)));
  const closestDistance = Math.hypot(x + vx * closestTime, y + vy * closestTime);
  if (after[0].stun || after[1].stun) {
    assert.ok(after[0].stun && after[1].stun, "a revised bonk stunned only one participant");
    assert.ok(closestDistance <= 8.650001, `a revised trajectory manufactured a bonk at nose distance ${closestDistance}`);
  }
  simulation.destroy();
});

test("padded disc chords cannot manufacture a bonk during a separating turn", () => {
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
  assert.ok(Math.abs(after[1].heading - before[1].heading) > 0.1, "the fish never exercised its rotating body sweep");
  assert.deepEqual(after.map((agent) => agent.stun), [null, null], "arc padding manufactured a nose contact");
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

test("a bank-pinched pair cannot withhold a distant fish's movement", () => {
  const free = { ...MOTION_FISH, id: "free", position: { x: 1000, y: 300 }, cruise: 30 };
  const options = {
    seed: "pin", width: 1586, height: 1024,
    isWater: (x: number, y: number) => x > 454.07 && x < 1400 && y > 200 && y < 900,
    fish: [free], flies: [],
  };
  const isolated = createPondSimulation(options);
  const simulation = createPondSimulation({ ...options, fish: [free,
    { ...MOTION_FISH, id: "a", displayWidth: 82, cruise: 0.1 },
    { ...MOTION_FISH, id: "b", displayWidth: 82, cruise: 0.1, position: { x: 575.47, y: 500 }, heading: Math.PI / 2 },
  ] });
  const pointer = { ...QUIET_POINTER, position: { x: 970, y: 330 }, influence: 1, energy: 1 };
  const initial = tickFish(simulation, 0, 0, pointer).fish;
  tickFish(isolated, 0, 0, pointer);
  for (let index = 1; index <= 120; index += 1) {
    const fish = tickFish(simulation, index, 1 / 30, pointer).fish;
    const expected = tickFish(isolated, index, 1 / 30, pointer).fish[0];
    assertFishBodiesClear(fish);
    assert.ok(Math.hypot(fish[0].position.x - expected.position.x, fish[0].position.y - expected.position.y) < 1e-8,
      `a local pinch withheld unrelated movement at frame ${index}`);
  }
  assert.ok(Math.hypot(simulation.frame!.fish[0].position.x - initial[0].position.x,
    simulation.frame!.fish[0].position.y - initial[0].position.y) > 120);
  simulation.destroy();
  isolated.destroy();
});

// Snapshot of alpha > 96 in the authored 1586 by 992 water layer.
const AUTHORED_WATER_BITS = inflateSync(Buffer.from("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", "base64"));

function authoredWater(x: number, y: number) {
  const pixelX = Math.round(x);
  const pixelY = Math.round(y);
  const bit = pixelY * 1586 + pixelX;
  return pixelX >= 0 && pixelX < 1586 && pixelY >= 0 && pixelY < 992 &&
    (AUTHORED_WATER_BITS[bit >> 3] & 1 << (bit & 7)) !== 0;
}

function authoredPondScenario(viewportWidth: number, viewportHeight: number) {
  const source = [
    [0, 82, 0.78, 0.18, 2.2, 17, 0.94], [1, 66, 0.22, 0.74, -0.7, 13, 0.86],
    [2, 52, 0.58, 0.28, 2.7, 11, 0.68], [3, 74, 0.83, 0.68, -2.4, 15, 0.87],
    [0, 48, 0.36, 0.12, 1.1, 10, 0.67], [1, 58, 0.12, 0.47, 0.2, 12, 0.76],
    [2, 70, 0.64, 0.82, -1.4, 14, 0.82], [3, 46, 0.42, 0.63, 2.9, 9, 0.64],
    [0, 44, 0.72, 0.48, -2.1, 10, 0.62], [1, 62, 0.48, 0.9, -0.9, 12, 0.78],
    [2, 40, 0.31, 0.34, 1.7, 9, 0.58], [3, 56, 0.9, 0.8, -2.7, 11, 0.74],
    [0, 50, 0.68, 0.58, 0.8, 11, 0.7], [1, 46, 0.86, 0.42, -1.9, 10, 0.66],
    [2, 60, 0.76, 0.34, -0.2, 14, 0.76], [3, 54, 0.92, 0.57, 2.4, 12, 0.7],
    [0, 68, 0.56, 0.72, -1.1, 15, 0.82], [1, 50, 0.25, 0.2, 0.6, 11, 0.68],
    [2, 58, 0.8, 0.86, -2.2, 13, 0.74], [3, 42, 0.18, 0.62, 1.9, 10, 0.62],
  ];
  const mobile = viewportWidth < 720;
  const scale = Math.max(viewportWidth / 1586, viewportHeight / 992) * 1.015;
  const centerX = 793 + (mobile ? 170 : 0);
  const toWorld = (x: number, y: number) => ({ x: centerX + (x - viewportWidth / 2) / scale, y: 496 + (y - viewportHeight / 2) / scale });
  const nearest = (position: { x: number; y: number }) => {
    if (authoredWater(position.x, position.y)) return position;
    for (let radius = 12; radius <= 240; radius += 12) {
      for (let sample = 0; sample < 24; sample += 1) {
        const angle = sample / 24 * Math.PI * 2;
        const candidate = { x: position.x + Math.cos(angle) * radius, y: position.y + Math.sin(angle) * radius };
        if (authoredWater(candidate.x, candidate.y)) return candidate;
      }
    }
    return { x: 793, y: 496 };
  };
  return {
    seed: "6c75", width: 1586, height: 992, isWater: authoredWater,
    fish: source.slice(0, mobile ? 14 : 20).map(([row, displayWidth, x, y, heading, cruise, alpha], index) => ({
      id: `fish-${index}`, row, displayWidth: displayWidth * (mobile ? 0.8 : 1), heading,
      cruise: Math.round(cruise * 1.8 + 5), alpha, species: ["kohaku", "ogon", "showa", "utsuri"][row],
      position: nearest({ x: centerX + (x - 0.5) * viewportWidth / scale * 0.88, y: 496 + (y - 0.5) * viewportHeight / scale * 0.88 }),
    })),
    flies: [
      { ...MOTION_FLY, id: "fly-0", position: toWorld(viewportWidth * 0.72, viewportHeight * 0.25) },
      { ...MOTION_FLY, id: "fly-1", position: toWorld(viewportWidth * 0.33, viewportHeight * 0.36), orbitX: 190, orbitY: 115, phase: 2.7, speed: 0.019, color: 0xe8a64f },
    ],
  };
}

for (const [viewportWidth, viewportHeight, fishCount] of [[1280, 800, 20], [390, 844, 14]]) {
  test(`all ${fishCount} authored fish swim without deadlock or heading jitter and bonk naturally`, () => {
    const options = authoredPondScenario(viewportWidth, viewportHeight);
    const simulation = createPondSimulation(options);
    let previous = tickFish(simulation, 0, 0).fish;
    assert.equal(previous.length, fishCount);
    assertFishBodiesClear(previous);
    assert.ok(previous.every((agent) => agent.stun === null));
    const census = previous.map((agent) => ({ id: agent.id, run: 0, longestRun: 0, lastTurn: 0, reversals: 0, travel: 0 }));
    let bonks = 0;
    for (let index = 1; index <= 3600; index += 1) {
      const fish = simulation.step({ now: index * 1000 / 30, delta: 1 / 30, pointer: QUIET_POINTER, visibleAnchorIds: [] }).fish;
      assertFishBodiesClear(fish);
      const midpoints = fish.map((agent, fishIndex) => {
        const before = previous[fishIndex];
        const turn = Math.atan2(Math.sin(agent.heading - before.heading), Math.cos(agent.heading - before.heading));
        return { ...agent, position: {
          x: (before.position.x + agent.position.x) / 2,
          y: (before.position.y + agent.position.y) / 2,
        }, heading: before.heading + turn / 2 };
      });
      assertFishBodiesClear(midpoints);
      fish.forEach((agent, fishIndex) => {
        const before = previous[fishIndex];
        const stats = census[fishIndex];
        const distance = Math.hypot(agent.position.x - before.position.x, agent.position.y - before.position.y);
        const turn = Math.atan2(Math.sin(agent.heading - before.heading), Math.cos(agent.heading - before.heading));
        stats.travel += distance;
        stats.run = distance < 0.001 ? stats.run + 1 : 0;
        stats.longestRun = Math.max(stats.longestRun, stats.run);
        if (Math.abs(turn) > 0.02) {
          if (turn * stats.lastTurn < 0) stats.reversals += 1;
          stats.lastTurn = turn;
        }
        assert.ok(distance <= options.fish[fishIndex].cruise * 3.5 / 30 + 1e-8, `${agent.id} teleported at frame ${index}`);
        assert.equal(authoredWater(agent.position.x, agent.position.y), true, `${agent.id} crossed dry shore`);
        if (agent.stun?.elapsed === 0) {
          bonks += 1;
          assert.ok(fish.some((other) => other.id !== agent.id && other.stun?.elapsed === 0 &&
            Math.cos(agent.heading - other.heading) <= -Math.cos(Math.PI / 6) + 1e-8 &&
            Math.hypot(
              other.position.x + Math.cos(other.heading) * other.displayWidth * 0.2 - agent.position.x - Math.cos(agent.heading) * agent.displayWidth * 0.2,
              other.position.y + Math.sin(other.heading) * other.displayWidth * 0.2 - agent.position.y - Math.sin(agent.heading) * agent.displayWidth * 0.2,
            ) <= (agent.displayWidth + other.displayWidth) * 0.36 + 0.5), `${agent.id} bonked without an opposing nose contact`);
        }
      });
      previous = fish;
    }
    for (const stats of census) {
      assert.ok(stats.longestRun < 60, `${stats.id} stopped for ${stats.longestRun} consecutive frames`);
      assert.ok(stats.reversals <= 90, `${stats.id} reversed its heading ${stats.reversals} times`);
      assert.ok(stats.travel > 1000, `${stats.id} traveled only ${stats.travel} world units`);
    }
    assert.ok(bonks >= 2, "natural courses never produced a nose-to-nose bonk");
    simulation.destroy();
  });
}
