import assert from "node:assert/strict";
import test from "node:test";

import {
  createPondWorld,
  ROCK_ANCHORS,
  ROCK_SURFACES,
  type PondTarget,
  type PondWorldEvent,
} from "../components/concepts/signal-desk/pond-world.ts";

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

function runWorld(seed: string, seconds: number, withTargets = true) {
  const world = createPondWorld(seed);
  const events: PondWorldEvent[] = [];
  const trace: string[] = [];
  let now = 0;

  for (let frameIndex = 0; frameIndex < seconds * 30; frameIndex += 1) {
    now += FRAME_MS;
    if (frameIndex > 0 && frameIndex % 330 === 0) world.requestHop();
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
  const { events } = runWorld("empty-target-soak", 300, false);
  assert.equal(events.some((event) => event.type === "bat"), false);
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
  const world = createPondWorld("feeding-soak");
  const foodPosition = { x: 820, y: 520 };
  world.dropFood(foodPosition);
  const fish = Array.from({ length: 6 }, (_, index) => ({
    id: `feeding-fish-${index}`,
    position: {
      x: foodPosition.x + Math.cos(index / 6 * Math.PI * 2) * (120 + index * 12),
      y: foodPosition.y + Math.sin(index / 6 * Math.PI * 2) * (105 + index * 10),
    },
    velocity: { x: 0, y: 0 },
  }));
  const events: PondWorldEvent[] = [];
  let sawDistinctReservedGoals = false;
  let maxFood = 0;

  for (let frameIndex = 1; frameIndex <= 75 * 30; frameIndex += 1) {
    const now = frameIndex * FRAME_MS;
    const targets: PondTarget[] = fish.map((entity, index) => ({
      id: entity.id,
      type: "fish",
      position: { ...entity.position },
      velocity: { ...entity.velocity },
      visible: true,
      attackable: true,
      interactionRange: 30 + index,
      species: ["kohaku", "ogon", "showa"][index % 3],
      danger: 0,
    }));
    const frame = world.step({ now, delta: 1 / 30, targets, visibleAnchorIds: ALL_ANCHORS });
    events.push(...frame.events);
    maxFood = Math.max(maxFood, frame.foods.length);
    const reservedGoals = frame.fish.filter((intent) => intent.reserved && intent.goal).map((intent) => `${intent.goal!.x.toFixed(2)},${intent.goal!.y.toFixed(2)}`);
    if (new Set(reservedGoals).size > 1) sawDistinctReservedGoals = true;

    for (const entity of fish) {
      const intent = frame.fish.find((candidate) => candidate.fishId === entity.id);
      if (!intent?.goal) {
        entity.velocity.x *= 0.96;
        entity.velocity.y *= 0.96;
      } else {
        const dx = intent.goal.x - entity.position.x;
        const dy = intent.goal.y - entity.position.y;
        const length = Math.max(1, Math.hypot(dx, dy));
        const desiredSpeed = 52 * intent.speedScale * Math.min(1, length / 48);
        const desiredX = dx / length * desiredSpeed;
        const desiredY = dy / length * desiredSpeed;
        entity.velocity.x += (desiredX - entity.velocity.x) * 0.12;
        entity.velocity.y += (desiredY - entity.velocity.y) * 0.12;
      }
      entity.position.x += entity.velocity.x / 30;
      entity.position.y += entity.velocity.y / 30;
    }
  }

  assert.equal(maxFood, 1);
  assert.ok(events.some((event) => event.type === "fish-noticed-food"));
  assert.ok(events.some((event) => event.type === "fish-reserved-food"));
  assert.ok(events.some((event) => event.type === "fish-arrived"));
  assert.ok(events.some((event) => event.type === "fish-fed"));
  assert.ok(events.some((event) => event.type === "food-expired"));
  assert.equal(sawDistinctReservedGoals, true);
});
