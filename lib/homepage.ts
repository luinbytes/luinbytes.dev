import {
  Activity,
  AudioLines,
  Bot,
  Boxes,
  CheckSquare,
  Gamepad2,
  MousePointerBan,
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
    buildName: "linux-sonar",
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
    id: "poke-android-client",
    index: "03",
    problem: "Android RCS makes Poke feel slower than it should.",
    buildName: "Poke Android",
    shortName: "Poke client",
    summary:
      "Native Android client plus companion backend for faster Poke messaging, rich actions, notifications, and webhook-backed context.",
    outcome:
      "A dedicated Android lane for Poke: Compose app, Node backend, SQLite event store, SSE sessions, and Samsung-tested debug flows.",
    proof: "Public Android client repo with Compose UI plus backend-backed event/session architecture.",
    tech: ["Kotlin", "Compose", "Node", "SQLite"],
    href: "https://github.com/luinbytes/poke-android-client",
    sourceHref: "https://github.com/luinbytes/poke-android-client",
    filters: ["android", "kotlin", "node", "ai"],
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
    buildName: "game systems / reverse engineering",
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
  {
    id: "minecrooft",
    index: "08",
    problem: "Voxel engines are best understood by building one.",
    buildName: "Minecrooft",
    shortName: "Voxel engine",
    summary:
      "Minecraft-style engine built from scratch in Rust with wgpu rendering, procedural biomes, survival/creative modes, and chunk save/load.",
    outcome:
      "A deterministic voxel sandbox with culled chunk meshing, generated textures, inventory, HUD, physics, and multithreaded world loading.",
    proof: "Public Rust source repo contains the wgpu renderer, world generation, and chunk systems.",
    tech: ["Rust", "wgpu", "winit", "egui"],
    href: "https://github.com/luinbytes/minecrooft",
    sourceHref: "https://github.com/luinbytes/minecrooft",
    filters: ["rust", "game", "systems", "engine"],
    icon: Boxes,
  },
  {
    id: "cursor-barrier",
    index: "09",
    problem: "Pointer boundaries should follow the way the desktop is actually used.",
    buildName: "Cursor Barrier",
    shortName: "Pointer control",
    summary:
      "Linux cursor utility for controlling pointer movement at workspace and monitor edges without reaching for a heavier desktop tool.",
    outcome:
      "Small systems utility shaped around a single desktop annoyance: predictable cursor behavior with minimal moving parts.",
    proof: "Public C source repo for the Linux pointer-boundary utility.",
    tech: ["C", "Linux", "Desktop"],
    href: "https://github.com/luinbytes/cursor-barrier",
    sourceHref: "https://github.com/luinbytes/cursor-barrier",
    filters: ["linux", "desktop", "systems", "utility"],
    icon: MousePointerBan,
  },
  {
    id: "raycast-automation",
    index: "10",
    problem: "Automation is more work than doing the thing.",
    buildName: "Raycast automation",
    shortName: "Small workflow tools",
    summary:
      "Raycast extensions and utilities that remove friction from lookups, window switching, smart-home control, and repeated tasks.",
    outcome:
      "Small tools with big leverage: fast to summon, easy to trust, and designed for muscle memory.",
    proof: "Public extensions repo collects the TypeScript/Raycast workflow tools.",
    tech: ["TypeScript", "Raycast API", "Node"],
    href: "https://github.com/luinbytes/extensions",
    sourceHref: "https://github.com/luinbytes/extensions",
    filters: ["raycast", "automation", "typescript", "workflow"],
    icon: Bot,
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
];
