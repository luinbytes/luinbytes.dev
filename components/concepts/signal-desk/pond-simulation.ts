import * as YUKA from "yuka";

import {
  createPondRandom,
  pondAngleDelta,
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
  swimPhase: number;
  turnRate: number;
  speedScale: number;
  depth: number;
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
  wingActivity: number;
  lift: number;
  state: FlyRoutineState;
  color: number;
  reacting: boolean;
};

export type PondSimulationFrame = Omit<PondWorldFrame, "fish" | "flies"> & {
  fish: readonly FishSimulationFrame[];
  flies: readonly FlySimulationFrame[];
};

type StartleMemory = { until: number; origin: PondPoint };

type FishMotion = {
  heading: number;
  speed: number;
  swimPhase: number;
  turnRate: number;
  depth: number;
  cruiseDepth: number;
  variation: number;
  turnBias: 1 | -1;
  threat: number;
  escapeHeading: number | null;
  shoreHeading: number | null;
};

type FishAgent = FishDefinition & {
  vehicle: YUKA.Vehicle;
  pointerFlee: YUKA.FleeBehavior;
  catFlee: YUKA.FleeBehavior;
  catOrigin: YUKA.Vector3;
  homeSeek: YUKA.SeekBehavior;
  goalArrive: YUKA.ArriveBehavior;
  goalTarget: YUKA.Vector3;
  wander: SeededWanderBehavior;
  routeGoal: PondPoint;
  nextRouteAt: number;
  routeVisits: number;
  startle: StartleMemory | null;
  motion: FishMotion;
  previous: PondPoint;
  maxStep: number;
};

type FlyAgent = FlyDefinition & {
  worldPosition: PondPoint;
  velocity: PondPoint;
  startle: StartleMemory | null;
  motion: {
    heading: number;
    hoverPhase: number;
    wingPhase: number;
    wingActivity: number;
    lift: number;
    variation: number;
    reacting: boolean;
  };
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

const TAU = Math.PI * 2;
const response = (rate: number, delta: number) => 1 - Math.exp(-rate * delta);
const startleStrength = (startle: StartleMemory | null, now: number, duration: number) =>
  startle ? pondClamp((startle.until - now) / duration, 0, 1) : 0;

function awayHeading(position: PondPoint, origin: PondPoint, fallback: number) {
  return pondDistance(position, origin) > 0.001
    ? Math.atan2(position.y - origin.y, position.x - origin.x)
    : fallback;
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
    this.angle += pondAngleDelta(this.angle, this.targetAngle) * Math.min(1, delta * 1.7);
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
    if (candidate.x < 20 || candidate.x > width - 20 || candidate.y < 20 || candidate.y > height - 20) return false;
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
    const catOrigin = new YUKA.Vector3(-1000, 0, -1000);
    const catFlee = new YUKA.FleeBehavior(catOrigin, 260);
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
    pointerFlee.weight = 0;
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
      catOrigin,
      homeSeek,
      goalArrive,
      goalTarget,
      wander,
      routeGoal: initial,
      nextRouteAt: 0,
      routeVisits: Math.floor(random() * 3),
      startle: null,
      motion: {
        heading: definition.heading,
        speed: definition.cruise,
        swimPhase: random() * TAU,
        turnRate: 0,
        depth: 0.3 + random() * 0.4,
        cruiseDepth: 0.3 + random() * 0.4,
        variation: duration(0.88, 1.12),
        turnBias: random() < 0.5 ? -1 : 1,
        threat: 0,
        escapeHeading: null,
        shoreHeading: null,
      },
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
    startle: null,
    motion: {
      heading: definition.phase,
      hoverPhase: definition.phase,
      wingPhase: definition.phase,
      wingActivity: 0.45,
      lift: 5,
      variation: duration(0.88, 1.12),
      reacting: false,
    },
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
      const startleDanger = startleStrength(agent.startle, input.now, 1250);
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
          startleStrength(agent.startle, input.now, 950),
        ),
      };
    });
  }

  function waterAt(x: number, y: number) {
    return x >= 20 && x <= width - 20 && y >= 20 && y <= height - 20 && isWater(x, y);
  }

  function waterPath(from: PondPoint, heading: number, length: number) {
    const samples = Math.max(1, Math.ceil(length));
    for (let sample = 1; sample <= samples; sample += 1) {
      const distance = length * sample / samples;
      if (!waterAt(from.x + Math.cos(heading) * distance, from.y + Math.sin(heading) * distance)) return false;
    }
    return true;
  }

  function shorelineHeading(agent: FishAgent, heading: number, lookAhead: number) {
    const from = agent.previous;
    if (waterPath(from, heading, lookAhead)) return null;
    for (const angle of [0.45, 0.85, 1.3, 1.85, 2.4, Math.PI]) {
      for (const side of [agent.motion.turnBias, -agent.motion.turnBias]) {
        const candidate = heading + angle * side;
        if (waterPath(from, candidate, lookAhead)) return candidate;
      }
    }
    return awayHeading(from, { x: width / 2, y: height / 2 }, heading) + Math.PI;
  }

  function moveInWater(agent: FishAgent, delta: number) {
    const { motion, previous, vehicle } = agent;
    const distance = motion.speed * delta;
    const samples = Math.max(1, Math.ceil(distance));
    let fraction = 0;
    for (let sample = 1; sample <= samples; sample += 1) {
      const nextFraction = sample / samples;
      if (!waterAt(
        previous.x + Math.cos(motion.heading) * distance * nextFraction,
        previous.y + Math.sin(motion.heading) * distance * nextFraction,
      )) break;
      fraction = nextFraction;
    }
    vehicle.position.set(
      previous.x + Math.cos(motion.heading) * distance * fraction,
      0,
      previous.y + Math.sin(motion.heading) * distance * fraction,
    );
    if (fraction < 1) motion.speed *= fraction;
    vehicle.velocity.set(Math.cos(motion.heading) * motion.speed, 0, Math.sin(motion.heading) * motion.speed);
    return fraction < 1;
  }

  function updateFish(input: SimulationInput, frame: PondWorldFrame) {
    const intents = new Map(frame.fish.map((intent) => [intent.fishId, intent]));
    pointerAgent.position.set(input.pointer.position.x, 0, input.pointer.position.y);
    pointerAgent.velocity.set(input.pointer.velocity.x, 0, input.pointer.velocity.y);

    for (const agent of fish) {
      const intent = intents.get(agent.id);
      const position = agent.vehicle.position;
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
      const impactStartle = startleStrength(agent.startle, input.now, 1250);
      const catThreat = Math.max(catEnergy * Math.max(0, 1 - catDistance / 225), impactStartle);
      const totalThreat = pondClamp(Math.max(pointerThreat, catThreat), 0, 1);
      const catOrigin = impactStartle > 0 && agent.startle ? agent.startle.origin : frame.cat.contact;
      agent.catOrigin.set(catOrigin.x, 0, catOrigin.y);
      agent.motion.threat = totalThreat;
      agent.motion.escapeHeading = totalThreat > 0.04
        ? awayHeading(agent.previous, pointerThreat > catThreat ? input.pointer.position : catOrigin, agent.motion.heading + Math.PI)
        : null;

      agent.pointerFlee.weight += (pointerThreat * 7.4 - agent.pointerFlee.weight) * response(26, input.delta);
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
      agent.vehicle.maxForce += (7 + foodForce + totalThreat * 70 - agent.vehicle.maxForce) * response(12, input.delta);
      const speedScale = Math.max(intent?.speedScale ?? 1, totalThreat > 0.04 ? 1 + totalThreat * 2.35 : 0);
      agent.vehicle.maxSpeed +=
        (agent.cruise * speedScale - agent.vehicle.maxSpeed) * response(9, input.delta);
      agent.vehicle.velocity.x += frame.environment.currentA.x * input.delta * 0.018;
      agent.vehicle.velocity.z += frame.environment.currentA.y * input.delta * 0.018;
      agent.homeSeek.active =
        position.x < 100 || position.x > width - 100 || position.z < 100 || position.z > height - 100;

      const aheadDistance = Math.max(36, agent.displayWidth * 0.6 + agent.motion.speed * 0.9);
      agent.motion.shoreHeading = shorelineHeading(agent, agent.motion.escapeHeading ?? agent.motion.heading, aheadDistance);
    }

    manager.update(input.delta);

    for (const agent of fish) {
      const position = agent.vehicle.position;
      const velocity = agent.vehicle.velocity;
      const intent = intents.get(agent.id);
      const motion = agent.motion;
      const steeredSpeed = Math.hypot(velocity.x, velocity.z);
      const cruising = intent?.state === "cruising" || intent?.state === "returning-to-cruise";
      const targetHeading = motion.shoreHeading ?? motion.escapeHeading ?? (steeredSpeed > 0.1 ? Math.atan2(velocity.z, velocity.x) : motion.heading);
      const maxTurnRate = (motion.shoreHeading !== null ? 3.4 : 1.15 + motion.threat * 4.8) * motion.variation;
      const turn = pondClamp(pondAngleDelta(motion.heading, targetHeading), -maxTurnRate * input.delta, maxTurnRate * input.delta);
      motion.heading = Math.atan2(Math.sin(motion.heading + turn), Math.cos(motion.heading + turn));
      motion.turnRate = input.delta > 0 ? turn / input.delta : 0;
      let targetSpeed = motion.escapeHeading !== null ? agent.vehicle.maxSpeed : Math.max(cruising ? agent.cruise * 0.82 : 0, steeredSpeed);
      if (motion.shoreHeading !== null) {
        targetSpeed = Math.min(targetSpeed, agent.cruise * (0.4 + 0.5 * Math.max(0, Math.cos(pondAngleDelta(motion.heading, targetHeading)))));
      }
      const acceleration = agent.cruise * (1.2 + motion.threat * 6) * motion.variation;
      motion.speed += pondClamp(targetSpeed - motion.speed, -acceleration * input.delta, acceleration * input.delta);
      motion.speed = pondClamp(motion.speed, 0, agent.cruise * 3.5);
      const recovered = moveInWater(agent, input.delta);
      motion.swimPhase = (motion.swimPhase + input.delta * (2.4 + motion.speed / agent.cruise * 5.5) * motion.variation) % TAU;
      const targetDepth = motion.threat > 0.1 ? 0.9 : intent?.state === "feeding" ? 0.08 : intent?.goal ? 0.22 : motion.cruiseDepth;
      motion.depth += (targetDepth - motion.depth) * response(2.8, input.delta);
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
      const motion = agent.motion;
      motion.hoverPhase = (motion.hoverPhase + input.delta * 1.7 * motion.variation) % TAU;
      const hoverRadius = intent.state === "hovering" ? 1.8 * motion.variation : 0;
      const goal = {
        x: pondClamp(intent.goal.x + Math.sin(motion.hoverPhase) * hoverRadius, 60, width - 60),
        y: pondClamp(intent.goal.y + Math.cos(motion.hoverPhase * 2) * hoverRadius * 0.55, 55, height - 80),
      };
      const dx = goal.x - agent.worldPosition.x;
      const dy = goal.y - agent.worldPosition.y;
      const length = Math.hypot(dx, dy);
      const pointerDistance = pondDistance(agent.worldPosition, input.pointer.position);
      const pointerDanger = pondClamp(input.pointer.influence * Math.max(0, 1 - pointerDistance / 170), 0, 1);
      const batDanger = startleStrength(agent.startle, input.now, 950);
      const danger = Math.max(pointerDanger, batDanger);
      const baseSpeed = 24 * intent.speedScale * motion.variation;
      const arrivalSpeed = Math.min(baseSpeed, length * 2.1);
      let targetX = length > 0.001 ? dx / length * arrivalSpeed : 0;
      let targetY = length > 0.001 ? dy / length * arrivalSpeed : 0;
      if (danger > 0.04) {
        const origin = batDanger >= pointerDanger && agent.startle ? agent.startle.origin : input.pointer.position;
        const heading = awayHeading(agent.worldPosition, origin, motion.heading);
        targetX = Math.cos(heading) * (baseSpeed + 95 * danger);
        targetY = Math.sin(heading) * (baseSpeed + 95 * danger);
      }
      const smoothing = response(danger > 0.04 ? 14 : 12, input.delta);
      agent.velocity.x += (targetX - agent.velocity.x) * smoothing;
      agent.velocity.y += (targetY - agent.velocity.y) * smoothing;
      const previous = { ...agent.worldPosition };
      agent.worldPosition.x = pondClamp(previous.x + agent.velocity.x * input.delta, 60, width - 60);
      agent.worldPosition.y = pondClamp(previous.y + agent.velocity.y * input.delta, 55, height - 80);
      agent.velocity.x = (agent.worldPosition.x - previous.x) / input.delta;
      agent.velocity.y = (agent.worldPosition.y - previous.y) / input.delta;
      const speed = Math.hypot(agent.velocity.x, agent.velocity.y);
      if (speed > 0.3) {
        motion.heading += pondClamp(pondAngleDelta(motion.heading, Math.atan2(agent.velocity.y, agent.velocity.x)), -9 * input.delta, 9 * input.delta);
      }
      motion.reacting = danger > 0.04;
      const activity = motion.reacting ? 1 : intent.state === "resting" ? Math.min(1, speed / 20) : pondClamp(0.35 + speed / 70, 0.35, 0.9);
      motion.wingActivity += (activity - motion.wingActivity) * response(9, input.delta);
      motion.wingPhase = (motion.wingPhase + input.delta * agent.speed * 1000 * motion.wingActivity) % TAU;
      const lift = intent.state === "resting" && !motion.reacting ? 0 : 4 + Math.sin(motion.hoverPhase) * 1.2 + Math.min(9, speed * 0.08);
      motion.lift += (lift - motion.lift) * response(6, input.delta);
    }
  }

  function applyConsequences(frame: PondWorldFrame, now: number) {
    for (const event of frame.events) {
      if (event.type !== "bat") continue;
      if (event.targetType === "fish") {
        const target = fish.find((agent) => agent.id === event.targetId);
        if (target) target.startle = { until: now + (event.hit ? 1250 : 760), origin: { ...frame.cat.contact } };
      } else {
        const target = flies.find((agent) => agent.id === event.targetId);
        if (target) target.startle = { until: now + 950, origin: { ...frame.cat.contact } };
      }
    }
  }

  function snapshots(frame: PondWorldFrame): PondSimulationFrame {
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
          heading: agent.motion.heading,
          swimPhase: agent.motion.swimPhase,
          turnRate: agent.motion.turnRate,
          speedScale: agent.motion.speed / agent.cruise,
          depth: agent.motion.depth,
          state: intent.state,
          foodId: intent.foodId,
          goal: intent.goal,
          reserved: intent.reserved,
          feedingPulse: intent.feedingPulse,
          reacting: agent.motion.threat > 0.04,
          maxStep: agent.maxStep,
        };
      }),
      flies: flies.map((agent) => {
        const intent = flyIntents.get(agent.id)!;
        return {
          id: agent.id,
          position: { ...agent.worldPosition },
          velocity: { ...agent.velocity },
          heading: agent.motion.heading,
          wingPhase: agent.motion.wingPhase,
          wingActivity: agent.motion.wingActivity,
          lift: agent.motion.lift,
          state: intent.state,
          color: agent.color,
          reacting: agent.motion.reacting,
        };
      }),
    };
  }

  function step(input: SimulationInput) {
    input = { ...input, delta: Number.isFinite(input.delta) ? pondClamp(input.delta, 0, 0.1) : 0 };
    const targets = [...fishTargets(input), ...flyTargets(input)];
    const frame = world.step({
      now: input.now,
      delta: input.delta,
      targets,
      visibleAnchorIds: input.visibleAnchorIds,
    });
    applyConsequences(frame, input.now);
    if (input.delta > 0) {
      updateFish(input, frame);
      updateFlies(input, frame);
    }
    lastFrame = snapshots(frame);
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
