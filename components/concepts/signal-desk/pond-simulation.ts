import * as YUKA from "yuka";

import {
  createPondRandom,
  pondClamp,
  pondDistance,
  type FishFoodStateName,
  type FlyRoutineState,
  type PondPoint,
  type PondTarget,
  type PondWorldFrame,
} from "./pond-model.ts";
import { createPondWorld } from "./pond-world.ts";

export type PondPointerInput = {
  position: PondPoint;
  velocity: PondPoint;
  influence: number;
  energy: number;
};

export type FishDefinition = {
  id: string;
  row: number;
  displayWidth: number;
  position: PondPoint;
  heading: number;
  cruise: number;
  alpha: number;
  species: string;
};

export type FlyDefinition = {
  id: string;
  position: PondPoint;
  orbitX: number;
  orbitY: number;
  phase: number;
  speed: number;
  color: number;
};

export type FishSimulationFrame = {
  id: string;
  row: number;
  displayWidth: number;
  alpha: number;
  species: string;
  position: PondPoint;
  velocity: PondPoint;
  heading: number;
  state: FishFoodStateName;
  foodId: string | null;
  goal: PondPoint | null;
  reserved: boolean;
  feedingPulse: number;
  reacting: boolean;
  maxStep: number;
};

export type FlySimulationFrame = {
  id: string;
  position: PondPoint;
  velocity: PondPoint;
  heading: number;
  wingPhase: number;
  state: FlyRoutineState;
  color: number;
  reacting: boolean;
};

export type PondSimulationFrame = Omit<PondWorldFrame, "fish" | "flies"> & {
  fish: readonly FishSimulationFrame[];
  flies: readonly FlySimulationFrame[];
};

type FishAgent = FishDefinition & {
  vehicle: YUKA.Vehicle;
  pointerFlee: YUKA.FleeBehavior;
  catFlee: YUKA.FleeBehavior;
  homeSeek: YUKA.SeekBehavior;
  goalArrive: YUKA.ArriveBehavior;
  goalTarget: YUKA.Vector3;
  wander: SeededWanderBehavior;
  routeGoal: PondPoint;
  nextRouteAt: number;
  routeVisits: number;
  startleUntil: number;
  previous: PondPoint;
  maxStep: number;
};

type FlyAgent = FlyDefinition & {
  worldPosition: PondPoint;
  velocity: PondPoint;
  startleUntil: number;
};

type SimulationOptions = {
  seed: string | number;
  width: number;
  height: number;
  fish: readonly FishDefinition[];
  flies: readonly FlyDefinition[];
  isWater: (x: number, y: number) => boolean;
};

type SimulationInput = {
  now: number;
  delta: number;
  pointer: PondPointerInput;
  visibleAnchorIds: readonly string[];
};

const SHORE_ROUTES: readonly PondPoint[] = [
  { x: 1280, y: 475 },
  { x: 1390, y: 555 },
  { x: 1460, y: 650 },
  { x: 1330, y: 725 },
  { x: 1160, y: 805 },
  { x: 980, y: 760 },
  { x: 1190, y: 610 },
  { x: 1400, y: 810 },
];

const OPEN_ROUTES: readonly PondPoint[] = [
  { x: 420, y: 290 },
  { x: 720, y: 230 },
  { x: 900, y: 430 },
  { x: 670, y: 620 },
  { x: 420, y: 690 },
  { x: 1050, y: 310 },
];

function angleDelta(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

class SeededWanderBehavior extends YUKA.SteeringBehavior {
  private readonly random: () => number;
  private angle: number;
  private targetAngle: number;
  private turnIn: number;

  constructor(random: () => number, heading: number) {
    super();
    this.random = random;
    this.angle = heading;
    this.targetAngle = heading;
    this.turnIn = 0.7 + random() * 1.8;
  }

  calculate(vehicle: YUKA.Vehicle, force: YUKA.Vector3, delta: number) {
    this.turnIn -= delta;
    if (this.turnIn <= 0) {
      this.targetAngle = Math.atan2(vehicle.velocity.z, vehicle.velocity.x) + (this.random() - 0.5) * 1.45;
      this.turnIn = 0.9 + this.random() * 2.4;
    }
    this.angle += angleDelta(this.angle, this.targetAngle) * Math.min(1, delta * 1.7);
    return force.set(Math.cos(this.angle) * 2.2, 0, Math.sin(this.angle) * 2.2);
  }
}

function nearestWater(
  position: PondPoint,
  width: number,
  height: number,
  isWater: SimulationOptions["isWater"],
) {
  const hasClearance = (candidate: PondPoint) => {
    if (!isWater(candidate.x, candidate.y)) return false;
    for (let sample = 0; sample < 8; sample += 1) {
      const angle = sample / 8 * Math.PI * 2;
      if (!isWater(candidate.x + Math.cos(angle) * 12, candidate.y + Math.sin(angle) * 12)) return false;
    }
    return true;
  };
  if (hasClearance(position)) return { ...position };
  const phase = (position.x * 0.017 + position.y * 0.011) % (Math.PI * 2);
  for (let radius = 12; radius <= 260; radius += 12) {
    for (let sample = 0; sample < 24; sample += 1) {
      const angle = phase + sample / 24 * Math.PI * 2;
      const candidate = {
        x: pondClamp(position.x + Math.cos(angle) * radius, 30, width - 30),
        y: pondClamp(position.y + Math.sin(angle) * radius, 30, height - 30),
      };
      if (hasClearance(candidate)) return candidate;
    }
  }
  return { x: width / 2, y: height / 2 };
}

export function createPondSimulation(options: SimulationOptions) {
  const { width, height, isWater } = options;
  const random = createPondRandom(`${options.seed}:agents`);
  const world = createPondWorld(options.seed);
  const manager = new YUKA.EntityManager();
  const pointerAgent = new YUKA.Vehicle();
  const catTarget = new YUKA.Vector3(-1000, 0, -1000);
  const homeTarget = new YUKA.Vector3(width / 2, 0, height / 2);

  const duration = (minimum: number, maximum: number) => minimum + random() * (maximum - minimum);
  const routePoint = (agent: FishAgent) => {
    const routes = agent.routeVisits % 3 === 2 ? OPEN_ROUTES : SHORE_ROUTES;
    agent.routeVisits += 1;
    const candidate = routes[Math.floor(random() * routes.length)];
    return nearestWater(
      { x: candidate.x + duration(-46, 46), y: candidate.y + duration(-38, 38) },
      width,
      height,
      isWater,
    );
  };

  const fish = options.fish.map((definition): FishAgent => {
    const initial = nearestWater(definition.position, width, height, isWater);
    const vehicle = new YUKA.Vehicle();
    vehicle.position.set(initial.x, 0, initial.y);
    vehicle.velocity.set(
      Math.cos(definition.heading) * definition.cruise,
      0,
      Math.sin(definition.heading) * definition.cruise,
    );
    vehicle.maxSpeed = definition.cruise;
    vehicle.maxForce = 7;
    vehicle.maxTurnRate = 0.9;
    vehicle.neighborhoodRadius = 145;
    vehicle.updateNeighborhood = true;
    vehicle.smoother = new YUKA.Smoother(10);

    const wander = new SeededWanderBehavior(random, definition.heading);
    const pointerFlee = new YUKA.FleeBehavior(pointerAgent.position, 410);
    const catFlee = new YUKA.FleeBehavior(catTarget, 210);
    const homeSeek = new YUKA.SeekBehavior(homeTarget);
    const goalTarget = new YUKA.Vector3(initial.x, 0, initial.y);
    const goalArrive = new YUKA.ArriveBehavior(goalTarget, 2.4, 10);
    const separation = new YUKA.SeparationBehavior();
    const alignment = new YUKA.AlignmentBehavior();
    const cohesion = new YUKA.CohesionBehavior();
    wander.weight = 0.68;
    separation.weight = 1.7;
    alignment.weight = 0.24;
    cohesion.weight = 0.11;
    pointerFlee.active = false;
    catFlee.active = false;
    homeSeek.active = false;
    goalArrive.active = true;
    goalArrive.weight = 0.5;
    vehicle.steering
      .add(pointerFlee)
      .add(catFlee)
      .add(homeSeek)
      .add(separation)
      .add(goalArrive)
      .add(alignment)
      .add(cohesion)
      .add(wander);
    manager.add(vehicle);

    const agent: FishAgent = {
      ...definition,
      position: initial,
      vehicle,
      pointerFlee,
      catFlee,
      homeSeek,
      goalArrive,
      goalTarget,
      wander,
      routeGoal: initial,
      nextRouteAt: 0,
      routeVisits: Math.floor(random() * 3),
      startleUntil: 0,
      previous: initial,
      maxStep: 0,
    };
    agent.routeGoal = routePoint(agent);
    agent.goalTarget.set(agent.routeGoal.x, 0, agent.routeGoal.y);
    return agent;
  });

  const flies = options.flies.map((definition): FlyAgent => ({
    ...definition,
    worldPosition: { ...definition.position },
    velocity: { x: 0, y: 0 },
    startleUntil: 0,
  }));

  let lastFrame: PondSimulationFrame | null = null;

  function fishTargets(input: SimulationInput): PondTarget[] {
    return fish.map((agent) => {
      const position = { x: agent.vehicle.position.x, y: agent.vehicle.position.z };
      const pointerDistance = pondDistance(position, input.pointer.position);
      const pointerDanger = Math.min(
        1,
        input.pointer.influence * Math.max(0, 1 - pointerDistance / 360) * (0.42 + input.pointer.energy * 0.78),
      );
      const startleDanger = Math.max(0, Math.min(1, (agent.startleUntil - input.now) / 1250));
      return {
        id: agent.id,
        type: "fish" as const,
        position,
        velocity: { x: agent.vehicle.velocity.x, y: agent.vehicle.velocity.z },
        visible: isWater(position.x, position.y),
        attackable: true,
        interactionRange: Math.max(18, agent.displayWidth * 0.3),
        species: agent.species,
        danger: Math.max(pointerDanger, startleDanger),
      };
    });
  }

  function flyTargets(input: SimulationInput): PondTarget[] {
    return flies.map((agent) => {
      const pointerDistance = pondDistance(agent.worldPosition, input.pointer.position);
      return {
        id: agent.id,
        type: "fly" as const,
        position: { ...agent.worldPosition },
        velocity: { ...agent.velocity },
        visible: true,
        attackable: true,
        interactionRange: 12,
        danger: Math.max(
          input.pointer.influence * Math.max(0, 1 - pointerDistance / 170),
          Math.max(0, Math.min(1, (agent.startleUntil - input.now) / 950)),
        ),
      };
    });
  }

  function recoverWater(agent: FishAgent) {
    const position = agent.vehicle.position;
    const velocity = agent.vehicle.velocity;
    if (isWater(position.x, position.z)) return false;

    const from = agent.previous;
    const to = { x: position.x, y: position.z };
    if (isWater(from.x, from.y)) {
      let inside = 0;
      let outside = 1;
      for (let iteration = 0; iteration < 7; iteration += 1) {
        const probe = (inside + outside) / 2;
        if (isWater(from.x + (to.x - from.x) * probe, from.y + (to.y - from.y) * probe)) inside = probe;
        else outside = probe;
      }
      position.x = from.x + (to.x - from.x) * inside;
      position.z = from.y + (to.y - from.y) * inside;
    } else {
      const recovered = nearestWater(to, width, height, isWater);
      position.set(recovered.x, 0, recovered.y);
    }
    const heading = Math.atan2(velocity.z, velocity.x);
    const leftIsWater = isWater(position.x + Math.cos(heading + 0.9) * 42, position.z + Math.sin(heading + 0.9) * 42);
    const turn = leftIsWater ? 0.9 : -0.9;
    const speed = Math.max(agent.cruise * 0.72, Math.hypot(velocity.x, velocity.z));
    const safeHeading = heading + turn;
    velocity.set(Math.cos(safeHeading) * speed, 0, Math.sin(safeHeading) * speed);
    const inset = {
      x: position.x + Math.cos(safeHeading) * 6,
      y: position.z + Math.sin(safeHeading) * 6,
    };
    if (isWater(inset.x, inset.y)) position.set(inset.x, 0, inset.y);
    return true;
  }

  function updateFish(input: SimulationInput, frame: PondWorldFrame) {
    const intents = new Map(frame.fish.map((intent) => [intent.fishId, intent]));
    pointerAgent.position.set(input.pointer.position.x, 0, input.pointer.position.y);
    pointerAgent.velocity.set(input.pointer.velocity.x, 0, input.pointer.velocity.y);
    catTarget.set(frame.cat.contact.x, 0, frame.cat.contact.y);

    for (const agent of fish) {
      const intent = intents.get(agent.id);
      const position = agent.vehicle.position;
      const velocity = agent.vehicle.velocity;
      const pointerDistance = pondDistance(
        { x: position.x, y: position.z },
        input.pointer.position,
      );
      const pointerThreat = input.pointer.influence * Math.max(0, 1 - pointerDistance / 360) * input.pointer.energy;
      const catDistance = pondDistance(
        { x: position.x, y: position.z },
        frame.cat.contact,
      );
      const catEnergy = ["prepare-bat", "bat", "react"].includes(frame.cat.state) ? 1 : frame.cat.state === "airborne" ? 0.28 : 0;
      const impactStartle = Math.max(0, Math.min(1, (agent.startleUntil - input.now) / 1250));
      const catThreat = Math.max(catEnergy * Math.max(0, 1 - catDistance / 225), impactStartle);
      const totalThreat = Math.max(pointerThreat, catThreat);

      if (pointerThreat > 0.04) {
        let awayX = position.x - input.pointer.position.x;
        let awayY = position.z - input.pointer.position.y;
        const awayLength = Math.hypot(awayX, awayY);
        if (awayLength < 1) {
          awayX = -velocity.x;
          awayY = -velocity.z;
        } else {
          awayX /= awayLength;
          awayY /= awayLength;
        }
        const escapeSpeed = agent.cruise * (1.7 + pointerThreat * 1.65);
        const escapeResponse = Math.min(0.78, input.delta * (11 + pointerThreat * 18));
        velocity.x += (awayX * escapeSpeed - velocity.x) * escapeResponse;
        velocity.z += (awayY * escapeSpeed - velocity.z) * escapeResponse;
      }

      agent.pointerFlee.weight += (pointerThreat * 7.4 - agent.pointerFlee.weight) * Math.min(1, input.delta * 26);
      agent.pointerFlee.active = agent.pointerFlee.weight > 0.012;
      agent.catFlee.active = catThreat > 0.012;
      agent.catFlee.weight = 2.8 + catThreat * 2.8;

      if (intent?.goal) {
        const goal = nearestWater(intent.goal, width, height, isWater);
        agent.goalTarget.set(goal.x, 0, goal.y);
        agent.goalArrive.active = true;
        agent.goalArrive.weight = intent.state === "feeding" ? 1.25 : intent.state === "circling" ? 0.95 : 2.5;
        agent.goalArrive.deceleration = intent.state === "feeding" ? 1.6 : 2.2;
        agent.goalArrive.tolerance = Math.max(5, intent.arrivalRadius * 0.28);
        agent.wander.weight += ((intent.state === "approaching-food" ? 0.14 : 0.06) - agent.wander.weight) * Math.min(1, input.delta * 4);
      } else {
        const current = { x: position.x, y: position.z };
        if (input.now >= agent.nextRouteAt || pondDistance(current, agent.routeGoal) < 70) {
          agent.routeGoal = routePoint(agent);
        agent.nextRouteAt = input.now + duration(4200, 8500);
        }
        agent.goalTarget.set(agent.routeGoal.x, 0, agent.routeGoal.y);
        agent.goalArrive.active = true;
        agent.goalArrive.weight = 0.9;
        agent.goalArrive.deceleration = 2.8;
        agent.goalArrive.tolerance = 30;
        agent.wander.weight += (0.38 - agent.wander.weight) * Math.min(1, input.delta * 1.8);
      }

      const foodForce = intent?.state === "approaching-food" ? 9 : 0;
      agent.vehicle.maxForce += (7 + foodForce + totalThreat * 26 - agent.vehicle.maxForce) * Math.min(1, input.delta * 12);
      agent.vehicle.maxSpeed +=
        (agent.cruise * (intent?.speedScale ?? 1) * (1 + totalThreat * 2.35) - agent.vehicle.maxSpeed) *
        Math.min(1, input.delta * 9);
      agent.vehicle.velocity.x += frame.environment.currentA.x * input.delta * 0.018;
      agent.vehicle.velocity.z += frame.environment.currentA.y * input.delta * 0.018;
      agent.homeSeek.active =
        position.x < 100 || position.x > width - 100 || position.z < 100 || position.z > height - 100;

      const speed = Math.max(1, Math.hypot(velocity.x, velocity.z));
      const aheadDistance = Math.max(42, agent.displayWidth * 0.6 + speed * 0.8);
      const aheadX = position.x + velocity.x / speed * aheadDistance;
      const aheadY = position.z + velocity.z / speed * aheadDistance;
      if (!isWater(aheadX, aheadY)) {
        const heading = Math.atan2(velocity.z, velocity.x);
        const look = (turn: number) => isWater(
          position.x + Math.cos(heading + turn) * aheadDistance,
          position.z + Math.sin(heading + turn) * aheadDistance,
        );
        const turn = look(0.72) ? 0.72 : look(-0.72) ? -0.72 : Number(agent.id.slice(5)) % 2 ? 1.05 : -1.05;
        const targetX = Math.cos(heading + turn) * speed;
        const targetY = Math.sin(heading + turn) * speed;
        velocity.x += (targetX - velocity.x) * Math.min(1, input.delta * 3.2);
        velocity.z += (targetY - velocity.z) * Math.min(1, input.delta * 3.2);
      }
    }

    manager.update(input.delta);

    for (const agent of fish) {
      const recovered = recoverWater(agent);
      const position = agent.vehicle.position;
      const velocity = agent.vehicle.velocity;
      const intent = intents.get(agent.id);
      const speed = Math.hypot(velocity.x, velocity.z);
      const cruising = intent?.state === "cruising" || intent?.state === "returning-to-cruise";
      const speedFloor = agent.cruise * 0.82;
      if (cruising && speed > 0.1 && speed < speedFloor) {
        const nextSpeed = speed + (speedFloor - speed) * Math.min(1, input.delta * 2.6);
        velocity.multiplyScalar(nextSpeed / speed);
      }
      position.x = pondClamp(position.x, 20, width - 20);
      position.z = pondClamp(position.z, 20, height - 20);
      const step = pondDistance(agent.previous, { x: position.x, y: position.z });
      agent.maxStep = Math.max(agent.maxStep, step);
      agent.previous = { x: position.x, y: position.z };
      if (recovered && !intents.get(agent.id)?.goal) {
        agent.routeGoal = routePoint(agent);
        agent.goalTarget.set(agent.routeGoal.x, 0, agent.routeGoal.y);
        agent.nextRouteAt = input.now + duration(3200, 7200);
      }
      if (!Number.isFinite(velocity.x) || !Number.isFinite(velocity.z)) {
        velocity.set(agent.cruise, 0, 0);
      }
    }
  }

  function updateFlies(input: SimulationInput, frame: PondWorldFrame) {
    const intents = new Map(frame.flies.map((intent) => [intent.flyId, intent]));
    for (const agent of flies) {
      const intent = intents.get(agent.id);
      if (!intent) continue;
      const dx = intent.goal.x - agent.worldPosition.x;
      const dy = intent.goal.y - agent.worldPosition.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      const pointerDistance = pondDistance(agent.worldPosition, input.pointer.position);
      const danger = Math.max(
        input.pointer.influence * Math.max(0, 1 - pointerDistance / 170),
        Math.max(0, Math.min(1, (agent.startleUntil - input.now) / 950)),
      );
      const baseSpeed = 24 * intent.speedScale;
      let targetX = dx / length * baseSpeed;
      let targetY = dy / length * baseSpeed;
      if (danger > 0) {
        const fleeX = agent.worldPosition.x - input.pointer.position.x;
        const fleeY = agent.worldPosition.y - input.pointer.position.y;
        const fleeLength = Math.max(1, Math.hypot(fleeX, fleeY));
        targetX += fleeX / fleeLength * 95 * danger;
        targetY += fleeY / fleeLength * 95 * danger;
      }
      const response = Math.min(1, input.delta * (danger > 0 ? 9 : 3.6));
      agent.velocity.x += (targetX - agent.velocity.x) * response;
      agent.velocity.y += (targetY - agent.velocity.y) * response;
      agent.worldPosition.x = pondClamp(agent.worldPosition.x + agent.velocity.x * input.delta, 60, width - 60);
      agent.worldPosition.y = pondClamp(agent.worldPosition.y + agent.velocity.y * input.delta, 55, height - 80);
    }
  }

  function applyConsequences(frame: PondWorldFrame, now: number) {
    for (const event of frame.events) {
      if (event.type !== "bat") continue;
      if (event.targetType === "fish") {
        const target = fish.find((agent) => agent.id === event.targetId);
        if (target) target.startleUntil = now + (event.hit ? 1250 : 760);
      } else {
        const target = flies.find((agent) => agent.id === event.targetId);
        if (target) target.startleUntil = now + 950;
      }
    }
  }

  function snapshots(frame: PondWorldFrame, now: number): PondSimulationFrame {
    const fishIntents = new Map(frame.fish.map((intent) => [intent.fishId, intent]));
    const flyIntents = new Map(frame.flies.map((intent) => [intent.flyId, intent]));
    return {
      ...frame,
      fish: fish.map((agent) => {
        const intent = fishIntents.get(agent.id)!;
        const velocity = { x: agent.vehicle.velocity.x, y: agent.vehicle.velocity.z };
        return {
          id: agent.id,
          row: agent.row,
          displayWidth: agent.displayWidth,
          alpha: agent.alpha,
          species: agent.species,
          position: { x: agent.vehicle.position.x, y: agent.vehicle.position.z },
          velocity,
          heading: Math.atan2(velocity.y, velocity.x),
          state: intent.state,
          foodId: intent.foodId,
          goal: intent.goal,
          reserved: intent.reserved,
          feedingPulse: intent.feedingPulse,
          reacting: agent.pointerFlee.active || agent.catFlee.active || agent.startleUntil > now,
          maxStep: agent.maxStep,
        };
      }),
      flies: flies.map((agent) => {
        const intent = flyIntents.get(agent.id)!;
        return {
          id: agent.id,
          position: { ...agent.worldPosition },
          velocity: { ...agent.velocity },
          heading: Math.atan2(agent.velocity.y, agent.velocity.x),
          wingPhase: now * agent.speed + agent.phase,
          state: intent.state,
          color: agent.color,
          reacting: agent.startleUntil > now,
        };
      }),
    };
  }

  function step(input: SimulationInput) {
    const targets = [...fishTargets(input), ...flyTargets(input)];
    const frame = world.step({
      now: input.now,
      delta: input.delta,
      targets,
      visibleAnchorIds: input.visibleAnchorIds,
    });
    applyConsequences(frame, input.now);
    updateFish(input, frame);
    updateFlies(input, frame);
    lastFrame = snapshots(frame, input.now);
    return lastFrame;
  }

  return {
    dropFood: world.dropFood,
    requestHop: world.requestHop,
    step,
    destroy: () => manager.clear(),
    get frame() {
      return lastFrame;
    },
  };
}
