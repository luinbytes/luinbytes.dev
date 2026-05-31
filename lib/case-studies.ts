import { projects } from "@/lib/data";

export type CaseStudyRoute =
  | "/meteor"
  | "/sleepr"
  | "/linux-sonar"
  | "/file-deduplicator"
  | "/perkaholic"
  | "/risk-of-anticheat"
  | "/brc-trainer"
  | "/dagger-fall"
  | "/super-hacker-golf"
  | "/meteor/privacy"
  | "/lumi";

export type CaseStudy = {
  route: CaseStudyRoute;
  title: string;
  category: string;
  summary: string;
  tags: string[];
  signal: string;
  sections: string[];
};

const projectById = new Map(projects.map((project) => [project.id, project]));

function fromProject(
  route: CaseStudyRoute,
  projectId: string,
  signal: string,
  sections: string[]
): CaseStudy {
  const project = projectById.get(projectId);

  if (!project) {
    throw new Error(`Missing project data for ${projectId}`);
  }

  return {
    route,
    title: project.name,
    category: project.type,
    summary: project.description,
    tags: project.tags,
    signal,
    sections,
  };
}

export const caseStudies: CaseStudy[] = [
  fromProject("/meteor", "meteor", "local-first daily loop", [
    "Overview",
    "Habits",
    "Tasks",
    "Free vs Pro",
    "Privacy",
    "Get the app",
  ]),
  fromProject("/sleepr", "sleepr", "cycle-aware sleep guidance", [
    "Overview",
    "Wake Windows",
    "Ticker",
    "Learning",
    "Privacy",
    "Build",
    "Get the app",
  ]),
  fromProject("/linux-sonar", "linux-sonar", "PipeWire routing surface", [
    "Overview",
    "Channels",
    "Features",
    "Mic Chain",
    "Tech",
    "Setup",
    "Source",
  ]),
  fromProject("/file-deduplicator", "file-deduplicator", "perceptual cleanup", [
    "Overview",
    "Demo",
    "Features",
    "Tech",
    "Get it",
  ]),
  fromProject("/perkaholic", "perkaholic", "hybrid Wine/Wayland bridge", [
    "Overview",
    "Features",
    "Architecture",
    "Tech",
    "Setup",
    "Source",
  ]),
  fromProject("/risk-of-anticheat", "risk-of-anticheat", "runtime instrumentation", [
    "Overview",
    "Features",
    "Aiming",
    "Tech",
    "Setup",
    "Source",
  ]),
  fromProject("/brc-trainer", "brc-trainer", "Proton-safe trainer internals", [
    "Overview",
    "Features",
    "Wine Fonts",
    "Tech",
    "Setup",
    "Source",
  ]),
  fromProject("/dagger-fall", "dagger-fall", "external Linux trainer", [
    "Overview",
    "Features",
    "Physics",
    "Tech",
    "Setup",
    "Source",
  ]),
  fromProject("/super-hacker-golf", "super-hacker-golf", "decompiled physics assist", [
    "Overview",
    "Features",
    "Trajectory",
    "Tech",
    "Setup",
    "Source",
  ]),
  {
    route: "/meteor/privacy",
    title: "Meteor Privacy Policy",
    category: "Policy",
    summary:
      "Privacy details for Meteor: local task and habit data, crash reports, billing, export, retention, children, changes, and contact.",
    tags: ["Privacy", "Meteor", "Android", "Local-first"],
    signal: "policy surface",
    sections: [
      "Data We Collect",
      "Crash Reporting",
      "Purchases",
      "Export",
      "Retention",
      "Children",
      "Changes",
      "Contact",
    ],
  },
  {
    route: "/lumi",
    title: "Lumi",
    category: "AI Assistant",
    summary: "Lu's AI assistant and overnight worker.",
    tags: ["AI", "Assistant", "Maintenance", "Builds"],
    signal: "support process",
    sections: ["About", "Stats", "Work"],
  },
];

export function getCaseStudy(pathname: string) {
  return caseStudies.find((study) => study.route === pathname);
}
