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

export type FishActivity = "swimming" | "gliding" | "darting" | "surfacing";

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
  activity: FishActivity;
  state: FishFoodStateName;
  foodId: string | null;
  goal: PondPoint | null;
  reserved: boolean;
  feedingPulse: number;
  reacting: boolean;
  maxStep: number;
  stun: { remaining: number; elapsed: number; serial: number } | null;
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
  activity: FishActivity;
  activityIndex: number;
  activityRemaining: number;
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
  shoreRemaining: number;
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
  bodyRadius: number;
  stun: FishSimulationFrame["stun"];
  stunSerial: number;
  stunHeading: number | null;
};

type FishPair = { first: FishAgent; second: FishAgent; side: 1 | -1; touching: boolean };
type FishMove = { position: PondPoint; heading: number };

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

const IDLE_ACTIVITIES: readonly FishActivity[] = ["swimming", "gliding", "darting", "surfacing"];
const IDLE_MOTION: Record<FishActivity, { speed: number; duration: readonly [number, number] }> = {
  swimming: { speed: 1.25, duration: [5, 9] },
  gliding: { speed: 0.38, duration: [3, 5] },
  darting: { speed: 2.5, duration: [1.5, 2.4] },
  surfacing: { speed: 0.65, duration: [2.5, 4] },
};

const TAU = Math.PI * 2;
const STUN_SECONDS = 5;
const CONTACT_GAP = 0.01;
const OPPOSING_COSINE = Math.cos(Math.PI / 6);
const response = (rate: number, delta: number) => 1 - Math.exp(-rate * delta);
const startleStrength = (startle: StartleMemory | null, now: number, duration: number) =>
  startle ? pondClamp((startle.until - now) / duration, 0, 1) : 0;

function awayHeading(position: PondPoint, origin: PondPoint, fallback: number) {
  return pondDistance(position, origin) > 0.001
    ? Math.atan2(position.y - origin.y, position.x - origin.x)
    : fallback;
}

function bodyDiscs(agent: FishAgent, pose: FishMove) {
  return [-0.2, 0, 0.2].map((offset) => ({
    x: pose.position.x + Math.cos(pose.heading) * agent.displayWidth * offset,
    y: pose.position.y + Math.sin(pose.heading) * agent.displayWidth * offset,
  }));
}

function fishPose(agent: FishAgent): FishMove {
  return { position: { x: agent.vehicle.position.x, y: agent.vehicle.position.z }, heading: agent.motion.heading };
}

function bodiesOverlap(first: FishAgent, firstPose: FishMove, second: FishAgent, secondPose: FishMove, gap = CONTACT_GAP) {
  const radius = (first.displayWidth + second.displayWidth) * 0.36 + gap;
  return bodyDiscs(first, firstPose).some((a) => bodyDiscs(second, secondPose).some((b) => pondDistance(a, b) < radius));
}

function sweptDiscContact(a: PondPoint, b: PondPoint, aEnd: PondPoint, bEnd: PondPoint, radius: number) {
  const x = b.x - a.x;
  const y = b.y - a.y;
  const vx = (bEnd.x - b.x) - (aEnd.x - a.x);
  const vy = (bEnd.y - b.y) - (aEnd.y - a.y);
  const closing = x * vx + y * vy;
  const clearance = x * x + y * y - radius * radius;
  if (clearance <= 1e-8) return 0;
  if (closing >= -1e-10) return null;
  const speedSquared = vx * vx + vy * vy;
  const discriminant = closing * closing - speedSquared * clearance;
  if (discriminant < 0) return null;
  const time = clearance / (-closing + Math.sqrt(discriminant));
  return time <= 1 ? time : null;
}

function sweptBodyDiscContact(pair: FishPair, a: FishMove, b: FishMove, aEnd: FishMove, bEnd: FishMove, firstDisc: number, secondDisc: number) {
  const discAt = (agent: FishAgent, start: FishMove, end: FishMove, disc: number, time: number) => {
    const heading = start.heading + pondAngleDelta(start.heading, end.heading) * time;
    const offset = agent.displayWidth * (disc - 1) * 0.2;
    return {
      x: start.position.x + (end.position.x - start.position.x) * time + Math.cos(heading) * offset,
      y: start.position.y + (end.position.y - start.position.y) * time + Math.sin(heading) * offset,
    };
  };
  const sweep = (from: number, to: number): number | null => {
    const first = discAt(pair.first, a, aEnd, firstDisc, from);
    const second = discAt(pair.second, b, bEnd, secondDisc, from);
    const firstEnd = discAt(pair.first, a, aEnd, firstDisc, to);
    const secondEnd = discAt(pair.second, b, bEnd, secondDisc, to);
    const padding = pair.first.displayWidth * Math.abs(firstDisc - 1) * 0.2 *
      (1 - Math.cos(pondAngleDelta(a.heading, aEnd.heading) * (to - from) / 2)) +
      pair.second.displayWidth * Math.abs(secondDisc - 1) * 0.2 *
      (1 - Math.cos(pondAngleDelta(b.heading, bEnd.heading) * (to - from) / 2));
    const radius = (pair.first.displayWidth + pair.second.displayWidth) * 0.36 + CONTACT_GAP + padding;
    const time = sweptDiscContact(first, second, firstEnd, secondEnd, radius);
    if (time === null) return null;
    const closing = (second.x - first.x) * (secondEnd.x - second.x - firstEnd.x + first.x) +
      (second.y - first.y) * (secondEnd.y - second.y - firstEnd.y + first.y);
    if (time > 0 || closing < -1e-10) return from + (to - from) * time;
    // Refine separating chords inside the padded radius so a safe escape can advance.
    if (padding <= 1e-8) return null;
    const middle = (from + to) / 2;
    return sweep(from, middle) ?? sweep(middle, to);
  };
  return sweep(0, 1);
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
  clearance = 12,
  fallback?: PondPoint,
) {
  const hasClearance = (candidate: PondPoint) => {
    if (candidate.x < 20 + clearance || candidate.x > width - 20 - clearance ||
      candidate.y < 20 + clearance || candidate.y > height - 20 - clearance) return false;
    if (!isWater(candidate.x, candidate.y)) return false;
    for (let sample = 0; sample < 8; sample += 1) {
      const angle = sample / 8 * Math.PI * 2;
      if (!isWater(candidate.x + Math.cos(angle) * clearance, candidate.y + Math.sin(angle) * clearance)) return false;
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
  if (fallback && hasClearance(fallback)) return { ...fallback };
  let closest: PondPoint | null = null;
  let closestDistance = Infinity;
  for (let x = 20 + clearance; x < width - 20 - clearance; x += 8) {
    for (let y = 20 + clearance; y < height - 20 - clearance; y += 8) {
      const candidate = { x, y };
      const distance = pondDistance(position, candidate);
      if (distance < closestDistance && hasClearance(candidate)) {
        closest = candidate;
        closestDistance = distance;
      }
    }
  }
  if (closest) return closest;
  throw new Error("Pond has no water position with fish clearance");
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
    const visitShore = agent.routeVisits % 4 === 0;
    agent.routeVisits += 1;
    const angle = duration(0, TAU);
    const radius = duration(170, 420);
    const candidate = visitShore ? SHORE_ROUTES[Math.floor(random() * SHORE_ROUTES.length)] : {
      x: agent.vehicle.position.x + Math.cos(angle) * radius,
      y: agent.vehicle.position.z + Math.sin(angle) * radius,
    };
    const goal = nearestWater(
      {
        x: pondClamp(candidate.x + duration(-46, 46), 60, width - 60),
        y: pondClamp(candidate.y + duration(-38, 38), 60, height - 60),
      },
      width,
      height,
      isWater,
      agent.bodyRadius,
      { x: agent.vehicle.position.x, y: agent.vehicle.position.z },
    );
    const from = { x: agent.vehicle.position.x, y: agent.vehicle.position.z };
    if (waterPath(from, Math.atan2(goal.y - from.y, goal.x - from.x), pondDistance(from, goal), agent.bodyRadius)) return goal;
    // A wet destination across an island is still an unreachable local route.
    for (let sample = 0; sample < 24; sample += 1) {
      const localHeading = angle + sample / 24 * TAU;
      for (const length of [160, 90, 45]) {
        if (waterPath(from, localHeading, length, agent.bodyRadius)) {
          return { x: from.x + Math.cos(localHeading) * length, y: from.y + Math.sin(localHeading) * length };
        }
      }
    }
    return from;
  };

  const fish = options.fish.map((definition): FishAgent => {
    // Three discs cover the atlas, including its 1.08 depth scale and stroke flex.
    // Their 1.12 by 0.72 cell envelope applies equally to every swimming depth.
    const bodyRadius = definition.displayWidth * 0.56;
    const initial = nearestWater(definition.position, width, height, isWater, bodyRadius);
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
      routeVisits: Math.floor(random() * 4),
      startle: null,
      motion: {
        activity: "swimming",
        activityIndex: Math.floor(random() * IDLE_ACTIVITIES.length),
        activityRemaining: duration(0.8, 4),
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
        shoreRemaining: 0,
      },
      previous: initial,
      maxStep: 0,
      bodyRadius,
      stun: null,
      stunSerial: 0,
      stunHeading: null,
    };
    agent.routeGoal = routePoint(agent);
    agent.goalTarget.set(agent.routeGoal.x, 0, agent.routeGoal.y);
    return agent;
  });

  const pairs: FishPair[] = [];
  const orderedFish = [...fish].sort((a, b) => a.id.localeCompare(b.id));
  for (let first = 0; first < orderedFish.length; first += 1) {
    for (let second = first + 1; second < orderedFish.length; second += 1) {
      pairs.push({ first: orderedFish[first], second: orderedFish[second], side: 1, touching: false });
    }
  }

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

  function waterClearance(point: PondPoint, radius = 0) {
    if (!waterAt(point.x, point.y)) return false;
    for (let sample = 0; radius > 0 && sample < 12; sample += 1) {
      const angle = sample / 12 * TAU;
      if (!waterAt(point.x + Math.cos(angle) * radius, point.y + Math.sin(angle) * radius)) return false;
    }
    return true;
  }

  function waterPath(from: PondPoint, heading: number, length: number, radius = 0) {
    // Raster shore edges can reject a subpixel step even when a one-unit probe is wet.
    for (const probe of [0.025, 0.05, 0.1, 0.25]) {
      const distance = Math.min(length, probe);
      if (!waterClearance({ x: from.x + Math.cos(heading) * distance, y: from.y + Math.sin(heading) * distance }, radius)) return false;
    }
    const samples = Math.max(1, Math.ceil(length * 4));
    for (let sample = 1; sample <= samples; sample += 1) {
      const distance = length * sample / samples;
      if (!waterClearance({ x: from.x + Math.cos(heading) * distance, y: from.y + Math.sin(heading) * distance }, radius)) return false;
    }
    return true;
  }

  function shorelineHeading(agent: FishAgent, heading: number, lookAhead: number) {
    const from = agent.previous;
    const retained = agent.motion.shoreHeading;
    if (retained !== null && waterPath(from, retained, Math.min(lookAhead, Math.max(4, agent.motion.speed * 0.5)), agent.bodyRadius) &&
      (agent.motion.shoreRemaining > 0 || !waterPath(from, heading, lookAhead, agent.bodyRadius))) return retained;
    if (waterPath(from, heading, lookAhead, agent.bodyRadius)) return null;
    const basis = retained ?? heading;
    for (const angle of [0.45, 0.85, 1.3, 1.85, 2.4, Math.PI]) {
      for (const side of [agent.motion.turnBias, -agent.motion.turnBias]) {
        const candidate = basis + angle * side;
        if (waterPath(from, candidate, lookAhead, agent.bodyRadius)) {
          agent.motion.shoreRemaining = 1.4;
          return candidate;
        }
      }
    }
    let bestHeading = heading;
    let bestLength = 0;
    let bestTurn = Infinity;
    for (let sample = 0; sample < 48; sample += 1) {
      const candidate = heading + sample / 48 * TAU * agent.motion.turnBias;
      for (const length of [24, 12, 6, 3, 1]) {
        if (!waterPath(from, candidate, length, agent.bodyRadius)) continue;
        const turn = Math.abs(pondAngleDelta(agent.motion.heading, candidate));
        if (length > bestLength || length === bestLength && turn < bestTurn) {
          bestHeading = candidate;
          bestLength = length;
          bestTurn = turn;
        }
        break;
      }
    }
    agent.motion.shoreRemaining = 1.4;
    return bestHeading;
  }

  function moveInWater(agent: FishAgent, delta: number) {
    const { motion, previous, vehicle } = agent;
    let travelHeading = agent.stun ? motion.shoreHeading ?? agent.stunHeading ?? motion.heading : motion.heading;
    const distance = motion.speed * delta;
    if (motion.shoreHeading !== null && !waterPath(previous, travelHeading, distance, agent.bodyRadius) &&
      waterPath(previous, motion.shoreHeading, distance, agent.bodyRadius)) travelHeading = motion.shoreHeading;
    const samples = Math.max(1, Math.ceil(distance));
    let fraction = 0;
    for (let sample = 1; sample <= samples; sample += 1) {
      const nextFraction = sample / samples;
      if (!waterClearance({
        x: previous.x + Math.cos(travelHeading) * distance * nextFraction,
        y: previous.y + Math.sin(travelHeading) * distance * nextFraction,
      }, agent.bodyRadius)) break;
      fraction = nextFraction;
    }
    vehicle.position.set(
      previous.x + Math.cos(travelHeading) * distance * fraction,
      0,
      previous.y + Math.sin(travelHeading) * distance * fraction,
    );
    if (fraction < 1) motion.speed *= fraction;
    vehicle.velocity.set(Math.cos(travelHeading) * motion.speed, 0, Math.sin(travelHeading) * motion.speed);
    return fraction < 1;
  }

  function separateInitialFish() {
    const placed: FishAgent[] = [];
    for (const agent of orderedFish) {
      const pose = fishPose(agent);
      const free = (position: PondPoint, escapeLength: number) => waterClearance(position, agent.bodyRadius) &&
        placed.every((other) => !bodiesOverlap(agent, { position, heading: pose.heading }, other, fishPose(other))) &&
        Array.from({ length: 24 }, (_, sample) => pose.heading + sample / 24 * TAU)
          .some((heading) => waterPath(position, heading, escapeLength, agent.bodyRadius));
      if (!free(pose.position, 60)) {
        let replacement: PondPoint | null = null;
        for (const escapeLength of [60, 30, 12]) {
          for (let radius = 4; !replacement && radius < Math.hypot(width, height); radius += 4) {
            for (let sample = 0; sample < 48; sample += 1) {
              const heading = pose.heading + sample / 48 * TAU;
              const candidate = { x: pose.position.x + Math.cos(heading) * radius, y: pose.position.y + Math.sin(heading) * radius };
              if (free(candidate, escapeLength)) {
                replacement = candidate;
                break;
              }
            }
          }
          if (replacement) break;
        }
        if (!replacement) throw new Error("Pond cannot fit non-overlapping fish in water");
        agent.vehicle.position.set(replacement.x, 0, replacement.y);
        agent.previous = { ...replacement };
        agent.routeGoal = routePoint(agent);
        agent.goalTarget.set(agent.routeGoal.x, 0, agent.routeGoal.y);
      }
      placed.push(agent);
    }
  }

  function avoidanceHeadings() {
    const offsets = new Map<FishAgent, PondPoint>();
    const add = (agent: FishAgent, x: number, y: number) => {
      const offset = offsets.get(agent) ?? { x: 0, y: 0 };
      offset.x += x;
      offset.y += y;
      offsets.set(agent, offset);
    };
    for (const pair of pairs) {
      const { first, second } = pair;
      const a = fishPose(first).position;
      const b = fishPose(second).position;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy);
      const vx = second.vehicle.velocity.x - first.vehicle.velocity.x;
      const vy = second.vehicle.velocity.z - first.vehicle.velocity.z;
      const speedSquared = vx * vx + vy * vy;
      const closing = dx * vx + dy * vy;
      const time = speedSquared > 0.001 ? pondClamp(-closing / speedSquared, 0, 2.8) : 0;
      const closest = Math.hypot(dx + vx * time, dy + vy * time);
      const radius = first.bodyRadius + second.bodyRadius;
      if (distance > radius + 18 && (closing >= 0 || closest > radius + 12)) continue;
      const nx = distance > 0.001 ? dx / distance : 1;
      const ny = distance > 0.001 ? dy / distance : 0;
      const urgency = pondClamp((radius + 24 - closest) / 24, 0, 1) * (1 - time / 4);
      // The same pair keeps its passing side throughout a crossing or an overtake.
      const tx = -ny * pair.side;
      const ty = nx * pair.side;
      add(first, (-nx * 0.45 + tx) * urgency * 2.4, (-ny * 0.45 + ty) * urgency * 2.4);
      add(second, (nx * 0.45 - tx) * urgency * 2.4, (ny * 0.45 - ty) * urgency * 2.4);
    }
    return offsets;
  }

  function resolveFishContacts(starts: Map<FishAgent, FishMove>, ends: Map<FishAgent, FishMove>, delta: number) {
    const poses = new Map([...starts].map(([agent, pose]) => [agent, { position: { ...pose.position }, heading: pose.heading }]));
    for (const pair of pairs) {
      if (!bodiesOverlap(pair.first, starts.get(pair.first)!, pair.second, starts.get(pair.second)!, 4)) pair.touching = false;
    }
    for (let iteration = 0; iteration < fish.length * 6 + 12; iteration += 1) {
      let contact: { pair: FishPair; time: number; firstDisc: number; secondDisc: number } | null = null;
      for (const pair of pairs) {
        const a = poses.get(pair.first)!;
        const b = poses.get(pair.second)!;
        const aEnd = ends.get(pair.first)!;
        const bEnd = ends.get(pair.second)!;
        // Chord sweeps include the maximum sagitta of each rotating disc center.
        const arcPadding = pair.first.displayWidth * 0.2 * (1 - Math.cos(pondAngleDelta(a.heading, aEnd.heading) / 2)) +
          pair.second.displayWidth * 0.2 * (1 - Math.cos(pondAngleDelta(b.heading, bEnd.heading) / 2));
        if (pondDistance(a.position, b.position) > pair.first.bodyRadius + pair.second.bodyRadius +
          pondDistance(a.position, aEnd.position) + pondDistance(b.position, bEnd.position) + arcPadding) continue;
        for (let firstDisc = 0; firstDisc < 3; firstDisc += 1) {
          for (let secondDisc = 0; secondDisc < 3; secondDisc += 1) {
            const time = sweptBodyDiscContact(pair, a, b, aEnd, bEnd, firstDisc, secondDisc);
            if (time !== null && (!contact || time < contact.time)) contact = { pair, time, firstDisc, secondDisc };
          }
        }
      }
      if (!contact) {
        for (const [agent, end] of ends) poses.set(agent, end);
        break;
      }
      const { pair, time, firstDisc, secondDisc } = contact;
      const firstBefore = poses.get(pair.first)!;
      const secondBefore = poses.get(pair.second)!;
      const firstMove = { x: ends.get(pair.first)!.position.x - firstBefore.position.x, y: ends.get(pair.first)!.position.y - firstBefore.position.y };
      const secondMove = { x: ends.get(pair.second)!.position.x - secondBefore.position.x, y: ends.get(pair.second)!.position.y - secondBefore.position.y };
      for (const [agent, pose] of poses) {
        const end = ends.get(agent)!;
        poses.set(agent, {
          position: { x: pose.position.x + (end.position.x - pose.position.x) * time, y: pose.position.y + (end.position.y - pose.position.y) * time },
          heading: pose.heading + pondAngleDelta(pose.heading, end.heading) * time,
        });
      }
      const a = poses.get(pair.first)!;
      const b = poses.get(pair.second)!;
      const aDisc = bodyDiscs(pair.first, a)[firstDisc];
      const bDisc = bodyDiscs(pair.second, b)[secondDisc];
      const distance = pondDistance(aDisc, bDisc);
      const nx = (bDisc.x - aDisc.x) / Math.max(0.001, distance);
      const ny = (bDisc.y - aDisc.y) / Math.max(0.001, distance);
      const point = { x: aDisc.x + nx * pair.first.displayWidth * 0.36, y: aDisc.y + ny * pair.first.displayWidth * 0.36 };
      const atNose = (agent: FishAgent, pose: FishMove) => pondDistance(point, {
        x: pose.position.x + Math.cos(pose.heading) * agent.displayWidth * 0.47,
        y: pose.position.y + Math.sin(pose.heading) * agent.displayWidth * 0.47,
      }) <= agent.displayWidth * 0.14;
      const opposing = Math.cos(a.heading - b.heading) <= -OPPOSING_COSINE + 1e-10;
      const bothApproaching = firstMove.x * nx + firstMove.y * ny > 1e-8 && secondMove.x * nx + secondMove.y * ny < -1e-8;
      const bonk = !pair.touching && !pair.first.stun && !pair.second.stun && firstDisc === 2 && secondDisc === 2 &&
        opposing && bothApproaching && atNose(pair.first, a) && atNose(pair.second, b);
      pair.touching = true;
      for (const [agent, pose, normal, discIndex] of [[pair.first, a, -1, firstDisc], [pair.second, b, 1, secondDisc]] as const) {
        const end = ends.get(agent)!;
        let dx = end.position.x - pose.position.x;
        let dy = end.position.y - pose.position.y;
        if (bonk) {
          agent.stun = { remaining: STUN_SECONDS, elapsed: 0, serial: ++agent.stunSerial };
          agent.stunHeading = pose.heading + pair.side * Math.PI * 0.65;
          agent.motion.shoreHeading = null;
          agent.motion.speed = Math.min(agent.motion.speed, agent.cruise * 0.18);
          dx = nx * normal * agent.motion.speed * 0.01;
          dy = ny * normal * agent.motion.speed * 0.01;
        } else {
          const relativeX = firstMove.x - secondMove.x;
          const relativeY = firstMove.y - secondMove.y;
          const inward = Math.max(0, relativeX * nx + relativeY * ny) * (1 - time) * 0.5;
          dx += nx * normal * inward;
          dy += ny * normal * inward;
          const currentDisc = bodyDiscs(agent, pose)[discIndex];
          const endDisc = bodyDiscs(agent, end)[discIndex];
          const rotationX = endDisc.x - currentDisc.x - (end.position.x - pose.position.x);
          const rotationY = endDisc.y - currentDisc.y - (end.position.y - pose.position.y);
          const rotationInward = Math.max(0, -normal * (rotationX * nx + rotationY * ny));
          const padding = agent.displayWidth * 0.2 * (1 - Math.cos(pondAngleDelta(pose.heading, end.heading) / 2));
          // Yield enough room for the turn instead of indefinitely cancelling it at t=0.
          dx += nx * normal * (rotationInward + padding + CONTACT_GAP);
          dy += ny * normal * (rotationInward + padding + CONTACT_GAP);
        }
        const limit = agent.stun ? agent.cruise * 0.18 * delta : agent.cruise * 3.5 * delta;
        const length = Math.hypot(dx, dy);
        if (length > limit) {
          dx *= limit / length;
          dy *= limit / length;
        }
        const candidate = { x: pose.position.x + dx, y: pose.position.y + dy };
        if (waterPath(pose.position, Math.atan2(dy, dx), Math.hypot(dx, dy), agent.bodyRadius)) {
          end.position = candidate;
          if (bonk) end.heading = pose.heading;
        } else {
          end.position = { ...pose.position };
          end.heading = pose.heading;
        }
      }
    }
    for (const agent of fish) {
      const pose = poses.get(agent)!;
      agent.vehicle.position.set(pose.position.x, 0, pose.position.y);
      agent.motion.heading = Math.atan2(Math.sin(pose.heading), Math.cos(pose.heading));
    }
  }

  function updateFish(input: SimulationInput, frame: PondWorldFrame) {
    const intents = new Map(frame.fish.map((intent) => [intent.fishId, intent]));
    const starts = new Map(fish.map((agent) => [agent, fishPose(agent)]));
    const avoidance = avoidanceHeadings();
    pointerAgent.position.set(input.pointer.position.x, 0, input.pointer.position.y);
    pointerAgent.velocity.set(input.pointer.velocity.x, 0, input.pointer.velocity.y);

    for (const agent of fish) {
      agent.previous = { ...starts.get(agent)!.position };
      agent.motion.shoreRemaining = Math.max(0, agent.motion.shoreRemaining - input.delta);
      if (agent.stun) {
        agent.stun.remaining = Math.max(0, agent.stun.remaining - input.delta);
        agent.stun.elapsed = STUN_SECONDS - agent.stun.remaining;
        if (agent.stun.remaining < 1e-9) {
          agent.stun = null;
          agent.stunHeading = null;
        }
      }
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

      const idle = !intent?.goal && totalThreat <= 0.04 &&
        (intent?.state === "cruising" || intent?.state === "returning-to-cruise");
      if (idle) {
        agent.motion.activityRemaining -= input.delta;
        if (agent.motion.activityRemaining <= 0) {
          agent.motion.activityIndex = (agent.motion.activityIndex + 1) % IDLE_ACTIVITIES.length;
          const activity = IDLE_ACTIVITIES[agent.motion.activityIndex];
          agent.motion.activityRemaining = duration(...IDLE_MOTION[activity].duration);
          if (activity === "darting") agent.nextRouteAt = 0;
        }
      }
      agent.motion.activity = idle ? IDLE_ACTIVITIES[agent.motion.activityIndex] : "swimming";

      agent.pointerFlee.weight += (pointerThreat * 7.4 - agent.pointerFlee.weight) * response(26, input.delta);
      agent.pointerFlee.active = agent.pointerFlee.weight > 0.012;
      agent.catFlee.active = catThreat > 0.012;
      agent.catFlee.weight = 2.8 + catThreat * 2.8;

      if (intent?.goal) {
        const goal = nearestWater(intent.goal, width, height, isWater, agent.bodyRadius, agent.previous);
        agent.goalTarget.set(goal.x, 0, goal.y);
        agent.goalArrive.active = true;
        agent.goalArrive.weight = intent.state === "feeding" ? 1.25 : intent.state === "circling" ? 0.95 : 2.5;
        agent.goalArrive.deceleration = intent.state === "feeding" ? 1.6 : 2.2;
        agent.goalArrive.tolerance = Math.max(5, intent.arrivalRadius * 0.28);
        agent.wander.weight += ((intent.state === "approaching-food" ? 0.14 : 0.06) - agent.wander.weight) * Math.min(1, input.delta * 4);
      } else {
        const current = { x: position.x, y: position.z };
        if (input.now >= agent.nextRouteAt || pondDistance(current, agent.routeGoal) < 12) {
          agent.routeGoal = routePoint(agent);
          agent.nextRouteAt = input.now + duration(4200, 8500);
        }
        agent.goalTarget.set(agent.routeGoal.x, 0, agent.routeGoal.y);
        agent.goalArrive.active = true;
        agent.goalArrive.weight = 0.9;
        agent.goalArrive.deceleration = 2.8;
        agent.goalArrive.tolerance = 30;
        const wanderWeight = agent.motion.activity === "darting" ? 0.06 : 0.38;
        agent.wander.weight += (wanderWeight - agent.wander.weight) * Math.min(1, input.delta * 1.8);
      }

      const foodForce = intent?.state === "approaching-food" ? 9 : 0;
      agent.vehicle.maxForce += (7 + foodForce + totalThreat * 70 - agent.vehicle.maxForce) * response(12, input.delta);
      const speedScale = agent.stun ? 0.18 : Math.max(
        idle ? IDLE_MOTION[agent.motion.activity].speed * agent.motion.variation : intent?.speedScale ?? 1,
        totalThreat > 0.04 ? 1 + totalThreat * 2.35 : 0,
      );
      agent.vehicle.maxSpeed +=
        (agent.cruise * speedScale - agent.vehicle.maxSpeed) * response(9, input.delta);
      agent.vehicle.velocity.x += frame.environment.currentA.x * input.delta * 0.018;
      agent.vehicle.velocity.z += frame.environment.currentA.y * input.delta * 0.018;
      agent.homeSeek.active =
        position.x < 100 || position.x > width - 100 || position.z < 100 || position.z > height - 100;

    }

    // Yuka supplies steering only. Locomotion owns position and velocity together.
    const steering = new Map<FishAgent, PondPoint>();
    for (const agent of fish) {
      manager.updateNeighborhood(agent.vehicle);
      const force = new YUKA.Vector3();
      agent.vehicle.steering.calculate(input.delta, force);
      steering.set(agent, {
        x: agent.vehicle.velocity.x + force.x * input.delta,
        y: agent.vehicle.velocity.z + force.z * input.delta,
      });
    }

    const ends = new Map<FishAgent, FishMove>();
    const recoveredFish = new Set<FishAgent>();
    for (const agent of fish) {
      const intent = intents.get(agent.id);
      const motion = agent.motion;
      const suggested = steering.get(agent)!;
      const steeredSpeed = Math.hypot(suggested.x, suggested.y);
      const cruising = intent?.state === "cruising" || intent?.state === "returning-to-cruise";
      let desiredHeading = motion.escapeHeading ?? (steeredSpeed > 0.1 ? Math.atan2(suggested.y, suggested.x) : motion.heading);
      if (motion.escapeHeading === null && !agent.stun) {
        const goalHeading = Math.atan2(agent.goalTarget.z - agent.previous.y, agent.goalTarget.x - agent.previous.x);
        desiredHeading += pondAngleDelta(desiredHeading, goalHeading) * (intent?.goal ? 0.8 : 0.35);
      }
      const offset = avoidance.get(agent);
      if (offset) desiredHeading = Math.atan2(Math.sin(desiredHeading) + offset.y, Math.cos(desiredHeading) + offset.x);
      if (agent.stun) desiredHeading = agent.stunHeading ?? motion.heading;
      motion.shoreHeading = shorelineHeading(agent, desiredHeading, Math.max(36, agent.bodyRadius + motion.speed * 0.9));
      if (motion.shoreHeading !== null) motion.activity = "swimming";
      const targetHeading = motion.shoreHeading ?? desiredHeading;
      const maxTurnRate = (agent.stun ? 0.9 : motion.shoreHeading !== null ? 3.4 : offset ? 2.8 : 1.15 + motion.threat * 4.8) * motion.variation;
      const turn = pondClamp(pondAngleDelta(motion.heading, targetHeading), -maxTurnRate * input.delta, maxTurnRate * input.delta);
      motion.heading = Math.atan2(Math.sin(motion.heading + turn), Math.cos(motion.heading + turn));
      motion.turnRate = input.delta > 0 ? turn / input.delta : 0;
      const idle = cruising && !intent?.goal && motion.threat <= 0.04;
      let targetSpeed = motion.escapeHeading !== null ? agent.vehicle.maxSpeed : idle
        ? agent.cruise * IDLE_MOTION[motion.activity].speed * motion.variation
        : Math.max(cruising ? agent.cruise * 0.82 : 0, steeredSpeed);
      if (motion.shoreHeading !== null) {
        targetSpeed = Math.min(targetSpeed, agent.cruise * (0.4 + 0.5 * Math.max(0, Math.cos(pondAngleDelta(motion.heading, targetHeading)))));
      }
      if (agent.stun) targetSpeed = agent.cruise * 0.18;
      const acceleration = agent.cruise * (1.2 + motion.threat * 6) * motion.variation;
      motion.speed += pondClamp(targetSpeed - motion.speed, -acceleration * input.delta, acceleration * input.delta);
      motion.speed = pondClamp(motion.speed, 0, agent.cruise * 3.5);
      const recovered = moveInWater(agent, input.delta);
      if (recovered) recoveredFish.add(agent);
      ends.set(agent, fishPose(agent));
      const start = starts.get(agent)!;
      agent.vehicle.position.set(start.position.x, 0, start.position.y);
      motion.heading = start.heading;
    }

    resolveFishContacts(starts, ends, input.delta);
    for (const agent of fish) {
      const { motion, vehicle } = agent;
      const position = vehicle.position;
      const velocity = vehicle.velocity;
      const intent = intents.get(agent.id);
      const idle = (intent?.state === "cruising" || intent?.state === "returning-to-cruise") && !intent?.goal && motion.threat <= 0.04;
      velocity.set((position.x - agent.previous.x) / input.delta, 0, (position.z - agent.previous.y) / input.delta);
      motion.speed = Math.hypot(velocity.x, velocity.z);
      motion.turnRate = pondAngleDelta(starts.get(agent)!.heading, motion.heading) / input.delta;
      motion.swimPhase = (motion.swimPhase + input.delta * (2.4 + motion.speed / agent.cruise * 5.5) * motion.variation) % TAU;
      const targetDepth = motion.threat > 0.1 ? 0.9 : intent?.state === "feeding" ? 0.08 : intent?.goal ? 0.22
        : idle && motion.activity === "surfacing" ? 0.05 : motion.cruiseDepth;
      motion.depth += (targetDepth - motion.depth) * response(2.8, input.delta);
      const step = pondDistance(agent.previous, { x: position.x, y: position.z });
      agent.maxStep = Math.max(agent.maxStep, step);
      agent.previous = { x: position.x, y: position.z };
      if (recoveredFish.has(agent) && !intents.get(agent.id)?.goal) {
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
          activity: agent.motion.activity,
          state: intent.state,
          foodId: intent.foodId,
          goal: intent.goal,
          reserved: intent.reserved,
          feedingPulse: intent.feedingPulse,
          reacting: agent.motion.threat > 0.04,
          maxStep: agent.maxStep,
          stun: agent.stun ? { ...agent.stun } : null,
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

  separateInitialFish();

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
