import assert from "node:assert/strict";
import test from "node:test";
import { createPondWorld, type PondTarget, type PondWorldEvent } from "../components/concepts/signal-desk/pond-world.ts";

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
    const frame = world.step({ now: index * 100, delta: 0.1, targets: fish, visibleAnchorIds: [] });
    if (index === 14) occupied = frame.fish.filter((entry) => entry.reserved).length;
    events.push(...frame.events);
  }
  assert.ok(occupied >= 2);
  assert.ok(events.some((event) => event.type === "fish-state" && event.reason === "closer-fish-reserved"));
  assert.ok(events.some((event) => event.type === "fish-fed" && event.fishId === "near"));
});
