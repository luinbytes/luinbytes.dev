"use client";

import Link from "next/link";
import { CaseProofLoop, SectionRail, SegmentedStats, useActiveSection } from "@/components/case-page-parts";
import {
  Github,
  Download,
  Zap,
  Wind,
  Target,
  Crosshair,
  Activity,
  Navigation,
} from "lucide-react";

const SECTION_NAV = [
  { id: "overview", label: "Overview" },
  { id: "features", label: "Features" },
  { id: "physics", label: "Physics" },
  { id: "tech", label: "Tech" },
  { id: "controls", label: "Controls" },
  { id: "setup", label: "Setup" },
  { id: "download", label: "Download" },
] as const;

const features = [
  {
    icon: Zap,
    title: "Auto-Bhop",
    description:
      "Holds the jump at the exact tick it becomes available every cycle. 500Hz polling loop via process_vm_readv — reads the grounded state and fires a writev on the frame it flips.",
    details: [
      "process_vm_readv/writev — no ptrace, no injection overhead",
      "500Hz poll cadence — 2ms between reads",
      "Hold space, trainer handles the rest",
      "Composes with --strafe for combined air control",
    ],
  },
  {
    icon: Wind,
    title: "Strafe / Air Control",
    description:
      "Full 3D air control layered on top of bhop. Instant direction changes mid-air, speed preserved through falls, gravity reduced near the ground for longer hang time.",
    details: [
      "Direct velocity writes via process_vm_writev each tick",
      "Gravity reduction below configurable altitude threshold",
      "5-parameter model: accel, max speed, friction, boost zone, boost friction",
      "All parameters live-tunable via config file — no rebuild",
      "Hard altitude cap to prevent trajectory abuse",
    ],
  },
  {
    icon: Target,
    title: "Dagger Prediction Overlay",
    description:
      "Click-through GTK3 overlay that projects every dagger's floor intersection in real time. Reads the game's dagger pool each frame and simulates trajectory accounting for gravity, initial velocity, and player velocity inheritance.",
    details: [
      "GTK3 + gtk-layer-shell — works on Wayland compositors (wlroots, Hyprland)",
      "Cairo rendering with input-region masking for click-through",
      "Reads entire live dagger pool, not just the last shot",
      "Trajectory math: initial_up, gravity, speed scalar, velocity inheritance",
      "Read-only mode — zero memory writes",
    ],
  },
  {
    icon: Crosshair,
    title: "Aim Assist",
    description:
      "Sticky targeting with lead prediction. Estimates enemy velocity from delta-position across 16ms ticks, leads the aim point ahead, and locks softly with per-axis smoothing.",
    details: [
      "Velocity estimated from Δpos over 16ms — no Rigidbody access needed",
      "Sticky lock: prefers previous frame's target if still valid — no jitter",
      "FOV cone search with dot-product culling",
      "Squid gem positioning: picks the correct gem variant based on facing angle",
      "Height safety filter — never leads below floor or enemy Y",
      "LMB-gated: only active while holding left mouse button",
    ],
  },
  {
    icon: Activity,
    title: "Live Diagnostics",
    description:
      "Real-time overlay showing position, velocity components, horizontal speed, player state, and active physics parameters. Useful for tuning your config values.",
    details: [
      "16ms readout cadence (GTK timer, 62.5Hz)",
      "Displays: X/Y/Z position, velocity components, horizontal speed",
      "Player state: ground / air / fall / dead",
      "Shows active accel, friction, and speed params from your config",
    ],
  },
  {
    icon: Navigation,
    title: "Teleportation",
    description:
      "Instantly relocates the hero to any XZ coordinate via a single writev on the position struct. Y is preserved — you land at arena floor height.",
    details: [
      "Pass --teleport X Z on the command line",
      "Single writev on hero position offsets",
      "Y coordinate preserved — no falling through floor",
      "Useful for getting to specific arena positions quickly",
    ],
  },
];

const techStack = [
  { name: "C / GNU99", description: "Single-file implementation, ~1.2k lines" },
  { name: "process_vm_readv/writev", description: "Linux-native cross-process memory access — no ptrace overhead, no injection" },
  { name: "GTK3 + gtk-layer-shell", description: "Click-through overlay window, Wayland compositor compatible" },
  { name: "Cairo", description: "2D rendering for the prediction overlay and diagnostics" },
  { name: "Xlib", description: "Keyboard input (space detection) on an independent X11 display connection" },
  { name: ".conf config system", description: "Key-value plaintext config: pointer chain offsets, struct offsets, physics constants. Searched next to binary, cwd, then ~/.config/" },
];

export function DaggerFallPage() {
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
                href="/#builds"
                className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled hover:text-nd-text-display nd-transition mb-12"
              >
                ← Back to projects
              </Link>

              <div className="flex items-center gap-3 mb-6">
                <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled border border-nd-border px-2 py-1 rounded-full">
                  Game Trainer
                </span>
                <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-success border border-nd-success/30 px-2 py-1 rounded-full">
                  Open Source
                </span>
              </div>

              <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-nd-text-display leading-[1.0] tracking-[-0.03em] mb-6">
                DaggerFall<span className="text-nd-accent">.</span>
              </h1>

              <p className="text-nd-text-secondary text-base md:text-lg max-w-2xl leading-relaxed mb-10">
                External Linux trainer for Devil Daggers. Pure process_vm_readv/writev — no
                injection, no driver. Auto-bhop, full air control, a click-through Wayland overlay
                showing where your daggers land, and a sticky aim assist with lead prediction
                backed by per-tick velocity estimation.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="https://github.com/luinbytes/dagger-fall/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-nd-text-display text-nd-black font-mono text-[13px] font-bold tracking-[0.06em] uppercase rounded-full nd-transition hover:opacity-80 min-h-[44px]"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
                <a
                  href="https://github.com/luinbytes/dagger-fall"
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
                      LAYER 01 / EXTERNAL
                    </p>
                    <p className="font-mono text-sm text-nd-text-display mt-1">
                      process_vm_readv / writev
                    </p>
                    <p className="font-mono text-[10px] tracking-[0.04em] text-nd-text-disabled mt-1">
                      no injection · no driver
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
                      LAYER 02 / CONFIG
                    </p>
                    <p className="font-mono text-sm text-nd-text-display mt-1">
                      Pointer chain resolution
                    </p>
                    <p className="font-mono text-[10px] tracking-[0.04em] text-nd-text-disabled mt-1">
                      live .conf reload · 40+ params
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
                      LAYER 03 / TARGET
                    </p>
                    <p className="font-mono text-sm text-nd-text-display mt-1">
                      Devil Daggers
                    </p>
                    <p className="font-mono text-[10px] tracking-[0.04em] text-nd-text-disabled mt-1">
                      Linux x86-64 native · Steam
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
                      LAYER 04 / OUTPUT
                    </p>
                    <p className="font-mono text-sm text-nd-accent mt-1">
                      Bhop · Air Control · Overlay · Aim
                    </p>
                    <p className="font-mono text-[10px] tracking-[0.04em] text-nd-text-disabled mt-1">
                      5 modes · GTK3/Cairo overlay · 500Hz poll
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 pt-10 border-t border-nd-border">
            <SegmentedStats stats={[
                { label: "Lines of C", value: "~1.2k", total: 20, filled: 12, accentFrom: -1 },
                { label: "Source file", value: "1", total: 5, filled: 1, accentFrom: -1 },
                { label: "Modes", value: "5", total: 5, filled: 5, accentFrom: 3 },
                { label: "Bhop poll", value: "500Hz", total: 10, filled: 10, accentFrom: 8 },
              ] as const
            } />
          </div>
        </div>
      </section>

      <CaseProofLoop
        steps={[
          { label: "Problem", value: "Classic game tooling needs readable runtime controls." },
          { label: "Build", value: "Trainer surface with focused game-state actions." },
          { label: "Verify", value: "Case sections document hooks, controls, and shipped behavior." },
          { label: "Ship", value: "Usable mod page with source path." },
        ]}
      />

      {/* Features */}
      <section id="features" className="py-24 md:py-32 border-b border-nd-border">
        <div className="container px-4 mx-auto max-w-5xl">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            01 / Features
          </span>
          <p className="text-nd-text-secondary text-base max-w-xl mb-16">
            All read/write via process_vm_readv and process_vm_writev. No ptrace, no
            injection — pure external memory access from an unprivileged process.
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

      {/* Physics */}
      <section id="physics" className="py-24 md:py-32 border-b border-nd-border">
        <div className="container px-4 mx-auto max-w-5xl">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            02 / Physics Models
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-nd-text-display tracking-[-0.02em] mb-6">
            Trajectory math, movement tuning, and lead prediction
          </h2>
          <p className="text-nd-text-secondary text-base max-w-2xl leading-relaxed mb-12">
            The overlay and aim assist both depend on reading live game state and running
            predictive math. None of this uses hardcoded constants — all physics params come
            from your config so they stay accurate across game updates.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: "Bhop Timing",
                items: [
                  "Reads the grounded flag each tick via process_vm_readv",
                  "Fires writev on the frame the flag flips — exact jump timing",
                  "500Hz loop keeps the write within 2ms of the transition",
                  "Composes cleanly with strafe mode — shared tick loop",
                ],
              },
              {
                title: "Air Control Model",
                items: [
                  "Reads hero velocity, applies accel vector toward WASD input direction",
                  "Speed clamped at max_speed param per tick",
                  "Gravity reduced below h_boost_alt threshold — longer hang time",
                  "Separate boost_friction vs ground_friction for skill expression",
                  "All 5 params live-tuneable in config — no recompile",
                ],
              },
              {
                title: "Dagger Trajectory Simulation",
                items: [
                  "Reads full dagger pool from game memory each overlay frame",
                  "Per-dagger: initial position, velocity, up component, speed scalar",
                  "Applies gravity constant each simulated tick forward",
                  "Player velocity inheritance scalar applied at fire-time",
                  "Floor intersection computed and projected to screen space via Cairo",
                ],
              },
              {
                title: "Aim Lead Prediction",
                items: [
                  "Enemy velocity estimated as Δpos / Δt across 16ms ticks",
                  "Lead point: enemy_pos + velocity × (distance / projectile_speed)",
                  "Sticky lock: previous frame&apos;s target preferred if still in FOV cone",
                  "Squid variants: gem offset computed from body facing angle",
                  "Height clamp: lead point never placed below floor or enemy Y",
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
              Pointer chain resolution
            </h3>
            <p className="text-sm text-nd-text-secondary leading-relaxed">
              Hero state sits behind a 3-level pointer chain: a global base address → arena
              struct → hero struct. Each hop is null-checked before the next read — if any
              pointer is unmapped (e.g. mid-load, dead state), the chain returns a sentinel and
              the tick loop skips that cycle rather than crashing.
            </p>
          </div>

          <div className="mt-4 bg-nd-surface border border-nd-border p-6">
            <h3 className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-display mb-3">
              Offset discovery
            </h3>
            <p className="text-sm text-nd-text-secondary leading-relaxed">
              Offsets are not distributed with the binary — you&apos;ll need to find them for your
              build of the game using static analysis (Ghidra) or a memory scanner. The config
              file accepts hex values prefixed with{" "}
              <code className="font-mono text-nd-text-display">0x</code>, so you can plug in
              whatever you find without recompiling. See{" "}
              <code className="font-mono text-nd-text-display">example.conf</code> for the
              full list of required keys per mode.
            </p>
          </div>
        </div>
      </section>

      {/* Controls / CLI */}
      <section id="controls" className="py-24 md:py-32 border-b border-nd-border">
        <div className="container px-4 mx-auto max-w-5xl">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            04 / Controls
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-nd-text-display tracking-[-0.02em] mb-12">
            CLI flags
          </h2>

          <div className="space-y-8">
            {(
              [
                {
                  category: "Movement",
                  binds: [
                    { key: "(no flag)", action: "Auto-bhop only — hold space" },
                    { key: "--strafe", action: "Bhop + full air control (hold space + WASD)" },
                  ],
                },
                {
                  category: "Overlay",
                  binds: [
                    { key: "--aim", action: "Dagger landing prediction + aim assist overlay" },
                    { key: "--diag", action: "Live diagnostics readout (pos, vel, state)" },
                  ],
                },
                {
                  category: "Utility",
                  binds: [
                    { key: "--teleport X Z", action: "Instantly move hero to XZ coordinates" },
                  ],
                },
                {
                  category: "Composition",
                  binds: [
                    { key: "--strafe --aim", action: "Air control + overlay simultaneously" },
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
                      <kbd className="font-mono text-[12px] text-nd-text-display bg-nd-black border border-nd-border-visible px-3 py-1.5 min-w-[100px] text-center whitespace-nowrap">
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
            No in-game keybinds — DaggerFall is fully external. All modes are launched from
            the terminal. The --aim and --strafe flags can be combined for simultaneous overlay
            and movement control.
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
                title: "Install dependencies",
                content:
                  "You need libx11-dev, GTK3 development headers, and gtk-layer-shell. On Arch: pacman -S libx11 gtk3 gtk-layer-shell. On Debian/Ubuntu: apt install libx11-dev libgtk-3-dev libgtk-layer-shell-dev.",
              },
              {
                step: "02",
                title: "Clone and build",
                content:
                  "git clone https://github.com/luinbytes/dagger-fall && cd dagger-fall && gcc -O2 -o daggerfall daggerfall.c -lX11 -lm $(pkg-config --cflags --libs gtk+-3.0 gtk-layer-shell-0). The binary is a single self-contained executable.",
              },
              {
                step: "03",
                title: "Find your offsets",
                content:
                  "Copy example.conf to daggerfall.conf. You need to find the pointer chain and hero struct layout yourself using Ghidra or a memory scanner — offsets are not provided. The config file documents which keys are required for each mode.",
              },
              {
                step: "04",
                title: "Launch Devil Daggers first, then run",
                content:
                  "Start the game via Steam, then run ./daggerfall (or with flags) from a terminal. The trainer reads the process PID and memory base on startup. Press Ctrl-C to stop.",
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
            Get the source
          </h2>
          <p className="text-nd-text-secondary text-base max-w-lg mx-auto mb-10">
            Open source. Build it yourself with a single gcc command. Offsets not
            included — you&apos;ll need to find those for your game build.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://github.com/luinbytes/dagger-fall/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-nd-text-display text-nd-black font-mono text-[13px] font-bold tracking-[0.06em] uppercase rounded-full nd-transition hover:opacity-80 min-h-[44px]"
            >
              <Download className="w-4 h-4" />
              Latest Release
            </a>
            <a
              href="https://github.com/luinbytes/dagger-fall"
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

export default DaggerFallPage;
