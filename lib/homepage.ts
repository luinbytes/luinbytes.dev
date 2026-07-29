import {
  Activity,
  AudioLines,
  Bot,
  Boxes,
  CheckSquare,
  Gamepad2,
  Smartphone,
  type LucideIcon,
} from "lucide-react";

export type HomepageLink = {
  label: string;
  href: string;
  external?: boolean;
};

export type ProblemBuild = {
  id: string;
  index: string;
  problem: string;
  buildName: string;
  shortName: string;
  summary: string;
  outcome: string;
  proof: string;
  tech: string[];
  href: string;
  sourceHref?: string;
  filters: string[];
  icon: LucideIcon;
};

export const workbenchItems = [
  { label: "Focus", value: "Building & shipping" },
  { label: "Currently", value: "Meteor, linux-sonar, Raycast extensions" },
  { label: "Always", value: "Learning, breaking, rebuilding" },
  { label: "Jump", value: "/linux /android /reverse /raycast" },
] as const;

export const proofLoopSteps = [
  {
    label: "Problem",
    value: "Name the annoying gap.",
  },
  {
    label: "Build",
    value: "Shape the missing tool.",
  },
  {
    label: "Verify",
    value: "Test it against real use.",
  },
  {
    label: "Ship",
    value: "Leave a usable artifact.",
  },
] as const;

export type JourneyChapter = {
  id: "home" | "builds" | "selected-builds" | "about" | "status" | "contact";
  label: string;
  mode: "thesis" | "friction" | "build" | "origin" | "now";
  surface: string;
  active: string;
  signal: string;
};

export const journeyChapters: JourneyChapter[] = [
  {
    id: "home",
    label: "Thesis",
    mode: "thesis",
    surface: "developer reflex",
    active: "missing thing",
    signal: "notice -> understand -> build",
  },
  {
    id: "builds",
    label: "Friction",
    mode: "friction",
    surface: "problems",
    active: "problem index",
    signal: "problem -> build -> outcome",
  },
  {
    id: "selected-builds",
    label: "Builds",
    mode: "build",
    surface: "shipped artifacts",
    active: "selected builds",
    signal: "range -> stack -> result",
  },
  {
    id: "about",
    label: "Origin",
    mode: "origin",
    surface: "systems curiosity",
    active: "PS3 / modding roots",
    signal: "take apart -> understand -> rebuild",
  },
  {
    id: "status",
    label: "Now",
    mode: "now",
    surface: "workbench",
    active: "current status",
    signal: "building -> shipping -> learning",
  },
  {
    id: "contact",
    label: "Contact",
    mode: "now",
    surface: "handoff",
    active: "weird workflows",
    signal: "send -> inspect -> build",
  },
];

export const problemBuilds: ProblemBuild[] = [
  {
    id: "linux-sonar",
    index: "01",
    problem: "Linux audio tools are stuck in 2005.",
    buildName: "Linux Sonar",
    shortName: "Linux audio",
    summary:
      "SteelSeries Sonar for Linux: per-app PipeWire routing, ChatMix, mic effects, and hardware-aware controls.",
    outcome:
      "Turns headset routing and mic processing into a native Linux workflow instead of a Windows-only compromise.",
    proof: "Public source repo with PipeWire, WirePlumber, and GTK4 implementation paths.",
    tech: ["Python", "PipeWire", "WirePlumber", "GTK4"],
    href: "/linux-sonar",
    sourceHref: "https://github.com/luinbytes/linux-sonar",
    filters: ["linux", "audio", "pipewire", "systems"],
    icon: AudioLines,
  },
  {
    id: "meteor",
    index: "02",
    problem: "Task and habit apps are either bloated or inflexible.",
    buildName: "Meteor",
    shortName: "Android daily view",
    summary:
      "An offline-first Android app that keeps tasks, habits, streaks, reminders, and widgets in one daily surface.",
    outcome:
      "One calm local-first place for the daily loop: no account, no cloud, no productivity theater.",
    proof: "Case route documents the local-first Android stack, widgets, reminders, and Room persistence.",
    tech: ["Kotlin", "Compose", "Room", "Android"],
    href: "/meteor",
    filters: ["android", "kotlin", "habits", "tasks"],
    icon: CheckSquare,
  },
  {
    id: "hermes-android",
    index: "03",
    problem: "Hermes needs a native Android client for its real sessions and controls.",
    buildName: "Hermes Android",
    shortName: "Native Hermes client",
    summary:
      "Native Android client for Nous Research Hermes Agent, using the Dashboard backend for sessions, profiles, skills, tools, models, providers, and automations.",
    outcome:
      "Brings real Hermes Dashboard sessions and controls into a Kotlin and Compose Android client, with REST and WebSocket validation.",
    proof: "Private Kotlin and Compose repo with Dashboard authentication, encrypted session storage, and green Android CI.",
    tech: ["Kotlin", "Compose", "REST", "WebSocket"],
    href: "https://github.com/luinbytes/hermes-android",
    filters: ["android", "kotlin", "hermes", "ai"],
    icon: Smartphone,
  },
  {
    id: "sleepr",
    index: "04",
    problem: "Sleep apps turn bedtime into another dashboard.",
    buildName: "Sleepr",
    shortName: "Sleep guidance",
    summary:
      "A quiet Android sleep companion for cycle-aware wake windows, optional live notifications, and private on-device rhythm learning.",
    outcome:
      "Keeps bedtime planning local and practical: no account, opt-in notification ticker, and morning feedback that tunes the model.",
    proof: "Case route covers the Room, WorkManager, widgets, and on-device rhythm model.",
    tech: ["Kotlin", "Compose", "Room", "WorkManager"],
    href: "/sleepr",
    filters: ["android", "kotlin", "sleep", "local-first"],
    icon: Smartphone,
  },
  {
    id: "reverse-engineering",
    index: "06",
    problem: "Game systems are opaque black boxes.",
    buildName: "Game Systems",
    shortName: "Systems craft",
    summary:
      "Tools to inspect, understand, and work with game internals: overlays, hooks, trainers, and runtime instrumentation.",
    outcome:
      "A practical path from unknown runtime behavior to usable tooling and clear feedback loops.",
    proof: "Case route anchors the reverse-engineering work in shipped overlays, hooks, and runtime tooling.",
    tech: ["C#", "C", "HarmonyX", "BepInEx"],
    href: "/risk-of-anticheat",
    filters: ["reverse", "systems", "game", "modding"],
    icon: Gamepad2,
  },
];

export const selectedBuilds = problemBuilds;

export const originLines = [
  "Started on a PS3: jailbreaks, modding, firmware rabbit holes, and too many late nights taking things apart.",
  "That curiosity never really left. Now it shows up as Android apps, Linux tools, automation, and runtime systems work.",
  "The through-line is simple: understand the system, rebuild the annoying part, ship the useful version.",
];

export const commandFilters = [
  { label: "/linux", value: "linux", icon: AudioLines },
  { label: "/android", value: "android", icon: CheckSquare },
  { label: "/reverse", value: "reverse", icon: Activity },
  { label: "/raycast", value: "raycast", icon: Bot },
  { label: "/cli", value: "cli", icon: Boxes },
] as const;

export const contactLinks: HomepageLink[] = [
  { label: "Email", href: "mailto:0x6c75@protonmail.com" },
  { label: "GitHub", href: "https://github.com/luinbytes", external: true },
  { label: "X / Twitter", href: "https://x.com/x6c75", external: true },
  { label: "Cal.com", href: "https://cal.com/luinbytes", external: true },
];
