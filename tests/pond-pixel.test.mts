import assert from "node:assert/strict";
import test from "node:test";
import { createPondWorld, type PondTarget, type PondWorldEvent } from "../components/concepts/signal-desk/pond-pixel-world.ts";
import { createPondSimulation } from "../components/concepts/signal-desk/pond-pixel-simulation.ts";

const pointer = { position: { x: -1000, y: -1000 }, velocity: { x: 0, y: 0 }, influence: 0, energy: 0 };
const fish = { id: "koi", row: 0, displayWidth: 30, position: { x: 300, y: 300 }, heading: 0, cruise: 24, alpha: 1, species: "koi" };
const inside = (x: number, y: number) => ((x - 300) / 180) ** 2 + ((y - 300) / 130) ** 2 <= 1;

test("seeded food drops merge, settle and expire deterministically", () => {
  function run(seed: string) {
    const world = createPondWorld(seed);
    const first = world.dropFood({ x: 200, y: 200 });
    world.dropFood({ x: 210, y: 200 });
    const step = (now: number) => world.step({ now, delta: 0.1, targets: [] });
    const dropped = step(0);
    const settled = step(400);
    const expired = step(50000);
    return { first, dropped, settled, expired };
  }
  const result = run("food-seed");
  assert.deepEqual(result, run("food-seed"));
  assert.notDeepEqual(result.dropped.foods, run("other-seed").dropped.foods);
  assert.equal(result.dropped.foods.length, 1);
  assert.equal(result.dropped.foods[0].id, result.first);
  assert.equal(result.dropped.foods[0].state, "dropping");
  assert.deepEqual(result.dropped.events.filter((event) => event.type === "food-dropped").map((event) => event.merged), [false, true]);
  assert.equal(result.settled.foods[0].state, "floating");
  assert.equal(result.settled.foods[0].dropProgress, 1);
  assert.equal(result.expired.foods.length, 0);
  assert.ok(result.expired.events.some((event) => event.type === "food-expired" && event.foodId === result.first && event.reason === "lifetime"));
});

test("zero and invalid deltas pause motion and large deltas are capped", () => {
  const make = () => createPondSimulation({ seed: "delta", width: 600, height: 600, fish: [fish], flies: [], isWater: inside });
  const paused = make();
  const capped = make();
  const large = make();
  try {
    const before = paused.step({ now: 0, delta: 0, pointer });
    for (const delta of [0, -1, Number.NaN, Infinity]) {
      assert.deepEqual(paused.step({ now: 0, delta, pointer }).fish, before.fish);
    }
    assert.deepEqual(large.step({ now: 100, delta: 10, pointer }).fish, capped.step({ now: 100, delta: 0.1, pointer }).fish);
  } finally {
    paused.destroy();
    capped.destroy();
    large.destroy();
  }
});

test("fish remain in water while swimming toward the shoreline", () => {
  const simulation = createPondSimulation({ seed: "shore", width: 600, height: 600, fish: [{ ...fish, position: { x: 440, y: 300 } }], flies: [], isWater: inside });
  try {
    for (let index = 1; index <= 600; index += 1) {
      const frame = simulation.step({ now: index * 1000 / 60, delta: 1 / 60, pointer });
      const position = frame.fish[0].position;
      assert.ok(inside(position.x, position.y), `fish left water on step ${index}: ${position.x}, ${position.y}`);
    }
  } finally {
    simulation.destroy();
  }
});

test("stalled food reservations are released for a nearby fish", () => {
  const world = createPondWorld("food-reservation-progress");
  world.dropFood({ x: 500, y: 500 });
  const target = (id: string, x: number): PondTarget => ({
    id, type: "fish", position: { x, y: 500 }, velocity: { x: 0, y: 0 },
    visible: true, attackable: true, interactionRange: 18,
  });
  const distant = [target("a", 200), target("b", 250), target("c", 300)];
  const events: PondWorldEvent[] = [];
  let initiallyReserved = 0;
  for (let index = 0; index <= 100; index += 1) {
    const frame = world.step({
      now: index * 100, delta: 0.1,
      targets: index < 20 ? distant : [...distant, target("near", 500)],
      foodApproach: (_fish, food) => food,
    });
    if (index === 19) initiallyReserved = frame.fish.filter((fish) => fish.reserved).length;
    events.push(...frame.events);
  }
  assert.equal(initiallyReserved, 3);
  assert.ok(events.some((event) => event.type === "fish-state" && event.reason === "approach-stalled"));
  assert.ok(events.some((event) => event.type === "fish-fed" && event.fishId === "near"));
});

test("food reservations require a reachable approach and bites require actual proximity", () => {
  const world = createPondWorld("food-reachability");
  world.dropFood({ x: 100, y: 500 });
  const fish: PondTarget = {
    id: "near", type: "fish", position: { x: 130, y: 500 }, velocity: { x: 0, y: 0 },
    visible: true, attackable: true, interactionRange: 18,
  };
  const events: PondWorldEvent[] = [];
  let allowApproach = false;
  let movedAway = false;
  for (let index = 0; index < 150; index += 1) {
    if (index === 45) allowApproach = true;
    const frame = world.step({
      now: index * 100, delta: 0.1, targets: [fish],
      foodApproach: (_fish, _food, radius) => allowApproach ? { x: 100 + radius * 0.5, y: 500 } : null,
    });
    events.push(...frame.events);
    if (frame.fish[0].state === "feeding" && !movedAway) {
      fish.position = { x: 400, y: 500 };
      movedAway = true;
    }
  }
  assert.ok(events.some((event) => event.type === "fish-state" && event.reason === "food-unreachable"));
  assert.ok(movedAway, "reachable food was never approached");
  assert.ok(events.some((event) => event.type === "fish-state" && event.reason === "left-feeding-radius"));
  assert.equal(events.some((event) => event.type === "fish-fed"), false);
});

test("a nearby fish can replace a distant reservation after a drop startles it", () => {
  const world = createPondWorld("priority-after-disturbance");
  world.dropFood({ x: 500, y: 500 });
  const target = (id: string, x: number): PondTarget => ({
    id, type: "fish", position: { x, y: 500 }, velocity: { x: 0, y: 0 },
    visible: true, attackable: true, interactionRange: 18,
  });
  const fish = [target("distant-a", 200), target("distant-b", 250), target("distant-c", 300), target("near", 510)];
  const events: PondWorldEvent[] = [];
  let occupied = 0;
  for (let index = 0; index <= 60; index += 1) {
    fish[3].danger = index < 15 ? 1 : 0;
    const frame = world.step({ now: index * 100, delta: 0.1, targets: fish });
    if (index === 14) occupied = frame.fish.filter((entry) => entry.reserved).length;
    events.push(...frame.events);
  }
  assert.ok(occupied >= 2);
  assert.ok(events.some((event) => event.type === "fish-state" && event.reason === "closer-fish-reserved"));
  assert.ok(events.some((event) => event.type === "fish-fed" && event.fishId === "near"));
});

test("large fish feed near a bank without leaving water", () => {
  const isWater = (x: number, y: number) => x >= 100 && x <= 900 && y >= 100 && y <= 900;
  const simulation = createPondSimulation({
    seed: "bank-feeding", width: 1000, height: 1000, isWater,
    fish: [{ ...fish, id: "large", displayWidth: 210, position: { x: 360, y: 500 }, heading: Math.PI, cruise: 35 }], flies: [],
  });
  simulation.dropFood({ x: 110, y: 500 });
  const events: PondWorldEvent[] = [];
  try {
    for (let index = 1; index <= 1800; index += 1) {
      const frame = simulation.step({ now: index * 1000 / 30, delta: 1 / 30, pointer });
      events.push(...frame.events);
      assert.ok(isWater(frame.fish[0].position.x, frame.fish[0].position.y));
      if (events.some((event) => event.type === "fish-fed")) break;
    }
    assert.ok(events.some((event) => event.type === "fish-reserved-food"));
    assert.ok(events.some((event) => event.type === "fish-arrived"));
    assert.ok(events.some((event) => event.type === "fish-fed"));
  } finally {
    simulation.destroy();
  }
});
