"use client";

import Link from "next/link";
import { SectionRail, SegmentedStats, useActiveSection } from "@/components/case-page-parts";
import {
  Github,
  Download,
  Layers,
  Cpu,
  Eye,
  Crosshair,
  MousePointerClick,
  Network,
  Plug,
  Wrench,
} from "lucide-react";

const SECTION_NAV = [
  { id: "overview", label: "Overview" },
  { id: "features", label: "Features" },
  { id: "ipc", label: "IPC" },
  { id: "tech", label: "Tech" },
  { id: "controls", label: "Controls" },
  { id: "setup", label: "Setup" },
  { id: "download", label: "Download" },
] as const;

const features = [
  {
    icon: Layers,
    title: "Hybrid Architecture",
    description:
      "DLL-internal hooks own fragile game state reads, writes, aimbot, and ESP command production. The native overlay owns drawing and input. Keeps engine-facing work where engine state lives and Wayland rendering out of Wine.",
    details: [
      "DLL lives inside the game process — no cross-process guessing for engine state",
      "Overlay is a native Linux Wayland process — no Wine windowing path for drawing",
      "Both halves can start and stop independently without crashing the other",
      "IPC frame at /tmp/perkaholic-ipc.bin bridges the two with seq numbers and overflow tracking",
    ],
  },
  {
    icon: Cpu,
    title: "XInput Proxy Loader",
    description:
      "XINPUT9_1_0.dll exports the full XInput entry-point surface and defers runtime startup until BO3 calls into it. DllMain stays minimal so loader-lock under Proton cannot bite.",
    details: [
      "Exports XInputGetState, XInputSetState, and companion entry points",
      "Runtime startup deferred to first XInput call — DllMain does nothing",
      "Installed via WINEDLLOVERRIDES=xinput9_1_0=n,b in Steam launch options",
      "objdump import check verifies no eager d3d / dxgi / dwmapi dependencies",
    ],
  },
  {
    icon: Eye,
    title: "Internal ESP Queue",
    description:
      "DLL reads zombie slots from the Zombies actor table, projects positions with BO3 refdef, runs visibility through the internal engine path, and queues primitives into a shared draw format consumed by the overlay.",
    details: [
      "Zombie actor table walk — slots read from live BO3 engine state",
      "World-to-screen projection via captured refdef data",
      "Internal-engine visibility check where available",
      "Queues boxes, lines, circles, and labels into imgui_esp_text_queue format",
    ],
  },
  {
    icon: Network,
    title: "Binary IPC Frame",
    description:
      "DLL publishes the latest draw frame to Z:\\\\tmp\\\\perkaholic-ipc.bin — the same path the Linux overlay reads as /tmp/perkaholic-ipc.bin. Seq numbers and overflow fields let the overlay detect stale frames.",
    details: [
      "Atomic write via temp file + rename to avoid half-read frames",
      "Seq number increments every publish — overlay detects staleness by seq delta",
      "Overflow field carries count when the command queue exceeds one frame",
      "Publish failures (open, move, short write) are logged and ignored — no crash",
    ],
  },
  {
    icon: MousePointerClick,
    title: "Wayland Layer-Shell Overlay",
    description:
      "wlr-layer-shell overlay surface sits above fullscreen toplevels. Default keyboard_interactivity=NONE with an empty input region so all events pass through to BO3. Input region recomputes only when the menu opens.",
    details: [
      "Layer: overlay — composited above fullscreen game surfaces",
      "Empty input region by default — click-through at all times outside the menu",
      "Input region set to menu rect when menu is open, cleared on close",
      "No mouse grab while scanning; grab only inside the active menu rectangle",
    ],
  },
  {
    icon: Crosshair,
    title: "Aimbot + Trainer Internals",
    description:
      "Aimbot and trainer writes run inside the game process where engine state is live. Projection, visibility, and target picking all happen engine-side. Raw memory access is a fallback diagnostic path only.",
    details: [
      "Aimbot target selection from the same actor table the ESP queue walks",
      "Trainer writes (ammo, health, round state) go through engine paths where available",
      "Internal engine visibility used for target filtering — avoids cross-process reads",
      "Verbose hook log written to AppData/Local/Temp/perkaholic-internal.log",
    ],
  },
  {
    icon: Plug,
    title: "IPC-Only Drawing",
    description:
      "The overlay is a pure draw-only IPC consumer. When the DLL frame is missing or stale the overlay draws nothing — it logs the transition and waits. It does not attach to BO3 and does not grab mouse input.",
    details: [
      "Draws nothing when the IPC frame is missing or stale — logs the transition, no crash, no scan",
      "No BO3 attach and no mouse grab — click-through always, draw-only consumer",
      "DLL keeps publishing even when the overlay is absent; IPC write failures are logged and ignored",
      "Legacy external reader crates remain in the repo as reference/diagnostic code only, not a runtime fallback",
    ],
  },
  {
    icon: Wrench,
    title: "Verbose Debug Trail",
    description:
      "Both halves emit a structured log trail. The overlay prints IPC state transitions to stdout. The DLL writes every publish result to the Proton prefix log file. Import table check confirms no eager graphics dependencies.",
    details: [
      "Overlay: internal ipc active seq=... / internal ipc inactive or stale; falling back",
      "DLL: ipc publish seq=... count=... overflow=... / ipc publish open failed ...",
      "DLL log: AppData/Local/Temp/perkaholic-internal.log inside the Proton prefix",
      "objdump -p XINPUT9_1_0.dll | rg &apos;d3d|dxgi|dwmapi&apos; should return nothing",
    ],
  },
];

const techStack = [
  {
    name: "C / C++",
    description:
      "Internal DLL — hooks, BO3 engine state, refdef projection, ESP command queue (~4.3k LOC across 8 files in internal/src/)",
  },
  {
    name: "Rust",
    description:
      "Linux overlay process and five helper crates: overlay, game, mem, math, config (~18k LOC across the workspace)",
  },
  {
    name: "MinGW",
    description:
      "DLL build toolchain via make internal — cross-compiles the C/C++ DLL for Win64 from Linux",
  },
  {
    name: "wgpu + egui",
    description:
      "Overlay rendering through egui-wgpu on a Wayland surface — egui menu, ESP draw calls, click-through input regions",
  },
  {
    name: "wlr-layer-shell",
    description:
      "Overlay layer above fullscreen toplevels — conditional input region, keyboard_interactivity=NONE by default",
  },
  {
    name: "Wine / Proton",
    description:
      "WINEDLLOVERRIDES=xinput9_1_0=n,b loads the proxy DLL; Z: drive maps /tmp for the IPC path shared between halves",
  },
];

export function PerkaholicPage() {
  const activeSection = useActiveSection(SECTION_NAV);

  return (
    <div className="min-h-screen bg-nd-black scroll-smooth">
      <SectionRail sections={SECTION_NAV} activeSection={activeSection} />

      {/* Hero */}
      <section id="overview" className="relative border-b border-nd-border">
        <div className="absolute inset-0 dot-grid-subtle opacity-30 pointer-events-none" />
        <div className="container px-4 mx-auto max-w-5xl relative z-10 py-24 md:py-40">
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-12 items-center">
            {/* Left column — copy */}
            <div>
              <Link
                href="/#projects"
                className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled hover:text-nd-text-display nd-transition mb-12"
              >
                ← Back to projects
              </Link>

              <div className="flex items-center gap-3 mb-6">
                <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled border border-nd-border px-2 py-1 rounded-full">
                  Game Mod
                </span>
                <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-success border border-nd-success/30 px-2 py-1 rounded-full">
                  Open Source
                </span>
              </div>

              <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-nd-text-display leading-[1.0] tracking-[-0.03em] mb-6">
                perkaholic<span className="text-nd-accent">.</span>
              </h1>

              <p className="text-nd-text-secondary text-base md:text-lg max-w-2xl leading-relaxed mb-10">
                Hybrid trainer for BO3 Zombies under Wine/Proton. An XInput proxy
                DLL inside the game owns reads, writes, aim, visibility, and ESP
                command production. A native Wayland layer-shell overlay owns
                drawing and input routing. Both halves communicate through a binary
                IPC frame at /tmp/perkaholic-ipc.bin.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="https://github.com/luinbytes/perkaholic/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-nd-text-display text-nd-black font-mono text-[13px] font-bold tracking-[0.06em] uppercase rounded-full nd-transition hover:opacity-80 min-h-[44px]"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
                <a
                  href="https://github.com/luinbytes/perkaholic"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-transparent border border-nd-border-visible text-nd-text-primary font-mono text-[13px] font-bold tracking-[0.06em] uppercase rounded-full nd-transition hover:border-nd-text-secondary min-h-[44px]"
                >
                  <Github className="w-4 h-4" />
                  Source Code
                </a>
              </div>
            </div>

            {/* Right column — topology */}
            <div className="hidden lg:block relative">
              <div className="absolute inset-0 dot-grid-subtle opacity-20 pointer-events-none" />
              <div className="relative">
                <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-nd-text-disabled mb-6">
                  SYSTEM.TOPOLOGY
                </p>

                <div className="flex flex-col items-stretch">
                  <div className="bg-nd-surface border border-nd-border px-5 py-4 rounded-sm">
                    <p className="font-mono text-[10px] tracking-[0.08em] uppercase text-nd-text-disabled">
                      LAYER 01 / LOADER
                    </p>
                    <p className="font-mono text-sm text-nd-text-display mt-1">
                      XINPUT9_1_0.dll proxy
                    </p>
                    <p className="font-mono text-[10px] tracking-[0.04em] text-nd-text-disabled mt-1">
                      WINEDLLOVERRIDES=xinput9_1_0=n,b
                    </p>
                  </div>

                  <div className="flex flex-col items-center py-1">
                    <span className="block w-px h-6 bg-nd-border-visible" />
                    <span className="font-mono text-[10px] leading-none text-nd-text-disabled -mt-0.5">
                      ▼
                    </span>
                  </div>

                  <div className="bg-nd-surface border border-nd-border px-5 py-4 rounded-sm">
                    <p className="font-mono text-[10px] tracking-[0.08em] uppercase text-nd-text-disabled">
                      LAYER 02 / INTERNAL
                    </p>
                    <p className="font-mono text-sm text-nd-text-display mt-1">
                      MinGW C/C++ DLL
                    </p>
                    <p className="font-mono text-[10px] tracking-[0.04em] text-nd-text-disabled mt-1">
                      BO3 hooks · refdef projection · aimbot · ESP queue
                    </p>
                  </div>

                  <div className="flex flex-col items-center py-1">
                    <span className="block w-px h-6 bg-nd-border-visible" />
                    <span className="font-mono text-[10px] leading-none text-nd-text-disabled -mt-0.5">
                      ▼
                    </span>
                  </div>

                  <div className="bg-nd-surface border border-nd-border px-5 py-4 rounded-sm">
                    <p className="font-mono text-[10px] tracking-[0.08em] uppercase text-nd-text-disabled">
                      LAYER 03 / IPC
                    </p>
                    <p className="font-mono text-sm text-nd-text-display mt-1">
                      Z:\tmp\perkaholic-ipc.bin ⇄ /tmp/perkaholic-ipc.bin
                    </p>
                    <p className="font-mono text-[10px] tracking-[0.04em] text-nd-text-disabled mt-1">
                      binary frame · seq + commands · Wine Z: maps Linux /tmp
                    </p>
                  </div>

                  <div className="flex flex-col items-center py-1">
                    <span className="block w-px h-6 bg-nd-border-visible" />
                    <span className="font-mono text-[10px] leading-none text-nd-text-disabled -mt-0.5">
                      ▼
                    </span>
                  </div>

                  <div className="bg-nd-surface border border-nd-accent/40 px-5 py-4 rounded-sm">
                    <p className="font-mono text-[10px] tracking-[0.08em] uppercase text-nd-text-disabled">
                      LAYER 04 / OVERLAY
                    </p>
                    <p className="font-mono text-sm text-nd-accent mt-1">
                      Rust + wgpu + wlr-layer-shell
                    </p>
                    <p className="font-mono text-[10px] tracking-[0.04em] text-nd-text-disabled mt-1">
                      egui menu · click-through · IPC consumer
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 pt-10 border-t border-nd-border">
            <SegmentedStats stats={[
                { label: "Source langs", value: "3", total: 3, filled: 3, accentFrom: -1 },
                { label: "Internal LOC", value: "~4.3k", total: 20, filled: 9, accentFrom: -1 },
                { label: "Overlay LOC", value: "~18k", total: 20, filled: 20, accentFrom: 17 },
                { label: "Crates", value: "5", total: 5, filled: 5, accentFrom: -1 },
              ] as const
            } />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 md:py-32 border-b border-nd-border">
        <div className="container px-4 mx-auto max-w-5xl">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            01 / Features
          </span>
          <p className="text-nd-text-secondary text-base max-w-xl mb-16">
            Two processes, one trainer. The DLL owns everything that needs engine
            state; the overlay owns everything the user sees. Neither side crashes
            when the other is missing.
          </p>

          <div className="space-y-16">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="grid md:grid-cols-[1fr_1.5fr] gap-8 md:gap-12"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 flex items-center justify-center border border-nd-border-visible text-nd-text-secondary">
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-nd-text-disabled">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                    </div>
                    <h3 className="font-body text-lg font-bold text-nd-text-display mb-3">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-nd-text-secondary leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                  <div className="bg-nd-surface border border-nd-border p-6">
                    <ul className="space-y-2.5">
                      {feature.details.map((detail) => (
                        <li
                          key={detail}
                          className="flex items-start gap-3 text-sm text-nd-text-secondary"
                        >
                          <span className="w-1 h-1 rounded-full bg-nd-text-disabled mt-2 shrink-0" />
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* IPC Bridge */}
      <section id="ipc" className="py-24 md:py-32 border-b border-nd-border">
        <div className="container px-4 mx-auto max-w-5xl">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            02 / IPC Bridge
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-nd-text-display tracking-[-0.02em] mb-6">
            Why the split, and how the halves coordinate
          </h2>
          <p className="text-nd-text-secondary text-base max-w-2xl leading-relaxed mb-12">
            The hybrid split is not an aesthetic choice — it is forced by the constraints
            of Wine windowing, Wayland compositing, and BO3 engine state availability.
            A shared binary frame at /tmp/perkaholic-ipc.bin carries draw commands from
            the DLL to the overlay on every game tick.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: "Why hybrid",
                items: [
                  "Wine windowing path cannot host a wlr-layer-shell surface — Wayland extension is compositor-side only",
                  "Engine state (actor table, refdef, visibility) is only coherent inside the game process",
                  "A native Linux process can create a Wayland layer-shell surface above a Wine fullscreen window",
                  "IPC file-based transport costs one rename per frame — cheap enough for game-tick rates",
                ],
              },
              {
                title: "DLL responsibilities",
                items: [
                  "Captures live BO3 engine state via internal hooks at game-tick rate",
                  "Reads zombie slots from the actor table; projects positions with refdef",
                  "Runs internal-engine visibility check for ESP and aimbot target filtering",
                  "Queues ESP primitives and publishes a binary draw frame to Z:\\\\tmp\\\\perkaholic-ipc.bin",
                ],
              },
              {
                title: "Overlay responsibilities",
                items: [
                  "Creates a wlr-layer-shell surface above fullscreen toplevels via Wayland",
                  "Maintains click-through (empty input region) unless the menu is open",
                  "Reads /tmp/perkaholic-ipc.bin each frame and draws the queued ESP primitives",
                  "Draws nothing when the IPC frame is missing or stale — logs the transition, does not scan for BO3",
                ],
              },
              {
                title: "Failure modes handled",
                items: [
                  "DLL alive, no overlay: IPC publish failures logged and ignored — game runs normally",
                  "Overlay alive, no DLL: overlay draws nothing, logs stale-frame transitions, no crash",
                  "Stale IPC frame: overlay logs the transition and draws nothing until a fresh frame arrives",
                  "Menu closed: full pointer pass-through — BO3 receives all mouse and keyboard events",
                ],
              },
            ].map((group) => (
              <div
                key={group.title}
                className="bg-nd-surface border border-nd-border p-6"
              >
                <h3 className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-display mb-4">
                  {group.title}
                </h3>
                <ul className="space-y-2.5">
                  {group.items.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 text-sm text-nd-text-secondary"
                    >
                      <span className="w-1 h-1 rounded-full bg-nd-text-disabled mt-2 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section id="tech" className="py-24 md:py-32 border-b border-nd-border">
        <div className="container px-4 mx-auto max-w-5xl">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            03 / Technical Details
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-nd-text-display tracking-[-0.02em] mb-12">
            How it&apos;s built
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {techStack.map((tech) => (
              <div
                key={tech.name}
                className="bg-nd-surface border border-nd-border p-6"
              >
                <span className="font-mono text-[11px] tracking-[0.06em] uppercase text-nd-text-display block mb-2">
                  {tech.name}
                </span>
                <p className="text-sm text-nd-text-secondary">{tech.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-nd-surface border border-nd-border p-6">
            <h3 className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-display mb-3">
              Verification path
            </h3>
            <p className="text-sm text-nd-text-secondary leading-relaxed">
              <code className="font-mono text-nd-text-display">objdump -p target/internal/XINPUT9_1_0.dll | rg &apos;d3d|dxgi|dwmapi&apos;</code>{" "}
              should return nothing — the DLL must not eagerly import any graphics runtime. Run{" "}
              <code className="font-mono text-nd-text-display">make internal-test</code> for the focused C helper
              tests and <code className="font-mono text-nd-text-display">cargo test --workspace</code> for the Rust
              crate suite. Both must pass before installing the DLL next to the game.
            </p>
          </div>
        </div>
      </section>

      {/* Controls */}
      <section id="controls" className="py-24 md:py-32 border-b border-nd-border">
        <div className="container px-4 mx-auto max-w-5xl">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            04 / Controls
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-nd-text-display tracking-[-0.02em] mb-12">
            Default binds
          </h2>

          <div className="space-y-8">
            {(
              [
                {
                  category: "Default binds",
                  binds: [
                    { key: "Insert", action: "Toggle menu open / close" },
                    { key: "aim_master", action: "Hold — master aim enable" },
                    { key: "esp_zombies", action: "Always — ESP on zombies" },
                  ],
                },
                {
                  category: "Config",
                  binds: [
                    { key: "~/.config/perkaholic/config.toml", action: "Shared config — overlay TOML schema" },
                    { key: "menu = \"toggle\"", action: "Plain string bind mode (current)" },
                  ],
                },
              ] satisfies { category: string; binds: { key: string; action: string }[] }[]
            ).map((group) => (
              <div key={group.category}>
                <div className="flex items-center gap-4 mb-3">
                  <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-nd-text-disabled">
                    {group.category}
                  </span>
                  <div className="flex-1 h-px bg-nd-border" />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  {group.binds.map((bind) => (
                    <div
                      key={bind.key}
                      className="flex items-center gap-4 bg-nd-surface border border-nd-border p-4"
                    >
                      <kbd className="font-mono text-[11px] text-nd-text-display bg-nd-black border border-nd-border-visible px-3 py-1.5 min-w-[80px] text-center shrink-0">
                        {bind.key}
                      </kbd>
                      <span className="text-sm text-nd-text-secondary">{bind.action}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="font-mono text-[11px] tracking-[0.06em] text-nd-text-disabled mt-6">
            Both plain string mode (<code className="font-mono">menu = &quot;toggle&quot;</code>) and legacy table form
            (<code className="font-mono">menu = &#123; key = &quot;INSERT&quot;, mode = &quot;toggle&quot; &#125;</code>) are accepted.
            Config lives at <code className="font-mono">~/.config/perkaholic/config.toml</code>.
          </p>
        </div>
      </section>

      {/* Setup */}
      <section id="setup" className="py-24 md:py-32 border-b border-nd-border">
        <div className="container px-4 mx-auto max-w-5xl">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            05 / Setup
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-nd-text-display tracking-[-0.02em] mb-12">
            Installation
          </h2>

          <div className="space-y-6">
            {[
              {
                step: "01",
                title: "Build the overlay",
                content:
                  "Run cargo build --release in the repo root. The perkaholic binary lands in target/release/ and is the process you run alongside BO3.",
              },
              {
                step: "02",
                title: "Build and install the DLL",
                content:
                  "Run make internal to cross-compile the proxy DLL with MinGW, then make internal-install to copy XINPUT9_1_0.dll next to BlackOps3.exe. Verify with objdump -p target/internal/XINPUT9_1_0.dll | rg 'd3d|dxgi|dwmapi' — output should be empty.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex gap-6 items-start"
              >
                <span className="font-display text-3xl font-bold text-nd-text-disabled shrink-0 w-12">
                  {item.step}
                </span>
                <div>
                  <h3 className="font-body text-lg font-bold text-nd-text-display mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-nd-text-secondary leading-relaxed">
                    {item.content}
                  </p>
                </div>
              </div>
            ))}

            <div className="flex gap-6 items-start">
              <span className="font-display text-3xl font-bold text-nd-text-disabled shrink-0 w-12">
                03
              </span>
              <div>
                <h3 className="font-body text-lg font-bold text-nd-text-display mb-2">
                  Launch BO3 with the proxy override
                </h3>
                <p className="text-sm text-nd-text-secondary leading-relaxed">
                  Set the Steam launch options to:{" "}
                  <code className="font-mono text-nd-text-display">
                    PERKAHOLIC_INTERNAL_VERBOSE=1 WINEDLLOVERRIDES=xinput9_1_0=n,b gamescope -f -r 144 -w 1920 -h 1080 -- %command%
                  </code>
                </p>
              </div>
            </div>

            {[
              {
                step: "04",
                title: "Run the overlay",
                content:
                  "Start perkaholic in a terminal alongside BO3. The overlay creates the Wayland layer-shell surface immediately and begins polling the IPC file. After any rebuild, restart both the perkaholic process and BO3 so each half loads the new binaries.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex gap-6 items-start"
              >
                <span className="font-display text-3xl font-bold text-nd-text-disabled shrink-0 w-12">
                  {item.step}
                </span>
                <div>
                  <h3 className="font-body text-lg font-bold text-nd-text-display mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-nd-text-secondary leading-relaxed">
                    {item.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="download" className="py-24 md:py-32">
        <div className="container px-4 mx-auto max-w-5xl text-center">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-nd-text-display tracking-[-0.02em] mb-4">
            Get the trainer
          </h2>
          <p className="text-nd-text-secondary text-base max-w-lg mx-auto mb-10">
            Open source. Grab a release build or pull the source and build both
            halves with <code className="font-mono text-nd-text-display">cargo build --release</code>{" "}
            and <code className="font-mono text-nd-text-display">make internal</code>.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://github.com/luinbytes/perkaholic/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-nd-text-display text-nd-black font-mono text-[13px] font-bold tracking-[0.06em] uppercase rounded-full nd-transition hover:opacity-80 min-h-[44px]"
            >
              <Download className="w-4 h-4" />
              Latest Release
            </a>
            <a
              href="https://github.com/luinbytes/perkaholic"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-transparent border border-nd-border-visible text-nd-text-primary font-mono text-[13px] font-bold tracking-[0.06em] uppercase rounded-full nd-transition hover:border-nd-text-secondary min-h-[44px]"
            >
              <Github className="w-4 h-4" />
              View on GitHub
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

export default PerkaholicPage;
