import type { PondPoint, PondWorldInput as SharedPondWorldInput } from "./pond-shared-model.ts";

export * from "./pond-shared-model.ts";

export type PondWorldInput = SharedPondWorldInput & {
  visibleAnchorIds?: readonly string[];
};

export type RockSurface = {
  id: string;
  center: PondPoint;
  tangent: PondPoint;
  normal: PondPoint;
  sittingRegion: { radiusX: number; radiusY: number };
  surfaceAngle: number;
  anchors: readonly { id: string; local: PondPoint; clearance: number }[];
};

export type RockAnchor = {
  id: string;
  rockId: string;
  position: PondPoint;
  normal: PondPoint;
  surfaceAngle: number;
  clearance: number;
  surfaceArea: number;
};

export const ROCK_SURFACES: readonly RockSurface[] = [
  {
    id: "south-stone",
    center: { x: 790, y: 954 },
    tangent: { x: 0.999, y: -0.035 },
    normal: { x: 0.035, y: 0.999 },
    sittingRegion: { radiusX: 67, radiusY: 34 },
    surfaceAngle: -0.035,
    anchors: [{ id: "south-stone-top", local: { x: 0, y: -6 }, clearance: 74 }],
  },
  {
    id: "reed-step",
    center: { x: 1080, y: 852 },
    tangent: { x: 0.998, y: 0.055 },
    normal: { x: -0.055, y: 0.998 },
    sittingRegion: { radiusX: 44, radiusY: 27 },
    surfaceAngle: 0.055,
    anchors: [{ id: "reed-step-top", local: { x: 0, y: -5 }, clearance: 56 }],
  },
  {
    id: "moss-step",
    center: { x: 1185, y: 890 },
    tangent: { x: 0.999, y: -0.03 },
    normal: { x: 0.03, y: 0.999 },
    sittingRegion: { radiusX: 72, radiusY: 40 },
    surfaceAngle: -0.03,
    anchors: [{ id: "moss-step-top", local: { x: -3, y: -8 }, clearance: 82 }],
  },
  {
    id: "broad-shelf",
    center: { x: 1275, y: 855 },
    tangent: { x: 0.999, y: 0.025 },
    normal: { x: -0.025, y: 0.999 },
    sittingRegion: { radiusX: 91, radiusY: 43 },
    surfaceAngle: 0.025,
    anchors: [{ id: "broad-shelf-top", local: { x: 0, y: -9 }, clearance: 96 }],
  },
  {
    id: "lower-shelf",
    center: { x: 1285, y: 930 },
    tangent: { x: 1, y: 0 },
    normal: { x: 0, y: 1 },
    sittingRegion: { radiusX: 92, radiusY: 45 },
    surfaceAngle: 0,
    anchors: [{ id: "lower-shelf-top", local: { x: 2, y: -8 }, clearance: 98 }],
  },
  {
    id: "fern-stone",
    center: { x: 1480, y: 780 },
    tangent: { x: 0.998, y: -0.06 },
    normal: { x: 0.06, y: 0.998 },
    sittingRegion: { radiusX: 69, radiusY: 37 },
    surfaceAngle: -0.06,
    anchors: [{ id: "fern-stone-top", local: { x: -2, y: -7 }, clearance: 78 }],
  },
  {
    id: "east-island",
    center: { x: 1390, y: 484 },
    tangent: { x: 0.999, y: 0.035 },
    normal: { x: -0.035, y: 0.999 },
    sittingRegion: { radiusX: 61, radiusY: 32 },
    surfaceAngle: 0.035,
    anchors: [{ id: "east-island-top", local: { x: -2, y: -9 }, clearance: 70 }],
  },
  {
    id: "east-bank-step",
    center: { x: 1550, y: 520 },
    tangent: { x: 0.998, y: -0.06 },
    normal: { x: 0.06, y: 0.998 },
    sittingRegion: { radiusX: 48, radiusY: 31 },
    surfaceAngle: -0.06,
    anchors: [{ id: "east-bank-step-top", local: { x: -3, y: -8 }, clearance: 58 }],
  },
  {
    id: "east-bank-shelf",
    center: { x: 1548, y: 690 },
    tangent: { x: 0.999, y: 0.025 },
    normal: { x: -0.025, y: 0.999 },
    sittingRegion: { radiusX: 54, radiusY: 34 },
    surfaceAngle: 0.025,
    anchors: [{ id: "east-bank-shelf-top", local: { x: -4, y: -8 }, clearance: 64 }],
  },
];

export const ROCK_ANCHORS: readonly RockAnchor[] = ROCK_SURFACES.flatMap((rock) =>
  rock.anchors.map((anchor) => ({
    id: anchor.id,
    rockId: rock.id,
    position: {
      x: rock.center.x + rock.tangent.x * anchor.local.x + rock.normal.x * anchor.local.y,
      y: rock.center.y + rock.tangent.y * anchor.local.x + rock.normal.y * anchor.local.y,
    },
    normal: rock.normal,
    surfaceAngle: rock.surfaceAngle,
    clearance: anchor.clearance,
    surfaceArea: Math.PI * rock.sittingRegion.radiusX * rock.sittingRegion.radiusY,
  })),
);
