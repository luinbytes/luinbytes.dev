import assert from "node:assert/strict";
import test from "node:test";

import {
  createPondWorld,
  ROCK_ANCHORS,
  ROCK_SURFACES,
  type PondTarget,
  type PondWorldEvent,
} from "../components/concepts/signal-desk/pond-world.ts";
import { createPondSimulation } from "../components/concepts/signal-desk/pond-simulation.ts";

const FRAME_MS = 1000 / 30;
const ALL_ANCHORS = ROCK_ANCHORS.map((anchor) => anchor.id);

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
