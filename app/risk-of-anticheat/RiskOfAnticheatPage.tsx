"use client";

import Link from "next/link";
import { CaseProofLoop, SectionRail, SegmentedStats, useActiveSection } from "@/components/case-page-parts";
import {
  Github,
  Download,
  Shield,
  Crosshair,
  Eye,
  Zap,
  Target,
  Settings,
  PackageOpen,
} from "lucide-react";

const SECTION_NAV = [
  { id: "overview", label: "Overview" },
  { id: "features", label: "Features" },
  { id: "aim", label: "Aim" },
  { id: "tech", label: "Tech" },
  { id: "controls", label: "Controls" },
  { id: "setup", label: "Setup" },
  { id: "download", label: "Download" },
] as const;

const features = [
  {
    icon: Eye,
    title: "ESP Overlay",
    description:
      "Null-safe boxes and labels on every interactable, enemy, and pickup. Replaces Aerolt's 2,692-NRE-per-session chest reveal with a clean provider pipeline.",
    details: [
      "Five providers: Chest, Teleporter, Enemy, Pickup, Interactable",
      "Host-only chest-content reveal (server-authoritative data path)",
      "Enemy boxes: 2D / cornered / 3D with health bar, distance, shadowed name",
      "Per-rarity pickup filter (white / green / red / lunar / boss / equipment)",
      "Dynamic culling with on-screen cap — stays fast at 50+ entities",
      "Per-category color config for enemy / elite / boss / rarity groups",
    ],
  },
  {
    icon: Crosshair,
    title: "Legitbot",
    description:
      "Camera-steer aim assist with FOV cone, per-axis smoothing, reaction delay, micro-jitter, and overshoot. Hold-to-aim gated by a configurable FOV ring.",
    details: [
      "Target selection: BestAngle / Distance / Weighted / LowestHP",
      "Hitbox picker: Main / Nearest / CritSpot / LargestVolume / Weakpoint",
      "Per-axis smoothing (X/Y decoupled) with reaction delay and overshoot",
      "Sticky lock, micro-jitter, and humanization pass",
      "Optional visible camera movement via CollectLookInputInternal postfix",
      "Driver coin priority + auto-rescue auto-shoot",
    ],
  },
  {
    icon: Zap,
    title: "Ragebot",
    description:
      "Snap-on-fire redirection via Harmony prefix on GenericSkill.ExecuteIfReady. Weighted target selection, sub-hitbox picker, and projectile-lead prediction.",
    details: [
      "Prefix on RoR2.GenericSkill.ExecuteIfReady — fires at the resolved target",
      "Projectile-lead prediction with live-learned ProjectileSpeedTable",
      "Weighted scoring across angle / distance / HP / visibility",
      "Sub-hitbox picker for consistent headshot-equivalent spots",
      "Auto-shoot mode for hands-free clearing",
      "Target lock indicator with on-screen status",
    ],
  },
  {
    icon: Target,
    title: "Prediction Engine",
    description:
      "Per-body velocity tracking via PrevPosTracker so projectile lead accurate on enemies, Driver coins, and remote players — all of which read zero Rigidbody.velocity on clients.",
    details: [
      "CharacterBody.onBodyStartGlobal registers every body with the tracker",
      "Driver coin bodies tracked separately — they bypass InstanceTracker",
      "ProjectileSpeedTable with tier-1 live-learning on FireProjectile",
      "Tier-2 reflection fallback when the live cache misses",
      "Instance-id keyed predictor with scene-swap invalidation",
    ],
  },
  {
    icon: PackageOpen,
    title: "Auto-Pickup & Cheats",
    description:
      "Host-only auto-pickup with per-rarity allowlist and radius. Plus bhop, god mode, infinite sprint, and an item spawner — the standard loadout, implemented cleanly.",
    details: [
      "Auto-pickup with Safe / Everything / Custom presets",
      "Radius-gated pickup scan, server-authoritative execution",
      "Bhop: FixedUpdate prefix skipping grounded-ness gate",
      "God mode: TakeDamage patch with explicit opt-in",
      "Infinite sprint: FixedUpdate postfix",
      "Item spawner with search + rarity filter",
    ],
  },
  {
    icon: Settings,
    title: "Custom IMGUI Menu",
    description:
      "860×560 menu with 8 tabs. Skeet/Neverlose-hybrid aesthetic — near-black surfaces, cyan accent, hollow-square checkboxes, keybind capture, color swatches.",
    details: [
      "Eight tabs: Rage, Legit, Players, World, Indicators, Misc, Spawner, Configs",
      "Independent Legit + Rage cards — peer-concurrent, not a radio",
      "Keybind capture widget with press-any-key + Escape to cancel",
      "Color swatch widget for ESP / indicator / hit-marker colors",
      "RiskOfOptions integration for pause-menu settings screen",
      "Config profiles with save / load / last-used autoload",
    ],
  },
  {
    icon: Crosshair,
    title: "Indicators",
    description:
      "Custom crosshair, configurable FOV ring (dotted or smooth), hit markers with sound, skill-cooldown HUD, target-lock indicator, and a cheat-convention watermark.",
    details: [
      "Crosshair styles: Dot / Cross / Plus / T — tunable size / thickness / gap",
      "FOV ring with separate colors for legit vs rage states",
      "Hit-marker renderer with color, duration, and sound toggle",
      "Skill-cooldown HUD for the local player's loadout",
      "Watermark with corner placement + opacity",
    ],
  },
  {
    icon: Shield,
    title: "Panic Key & Safety",
    description:
      "Single-key master kill flips every gameplay toggle off — even while the menu is open. UI overlays survive so you keep control.",
    details: [
      "Edge-triggered on Cfg.PanicKey — default End",
      "Disables rage, legit, auto-shoot, ESP, auto-pickup, hit markers, bhop, fly, god mode, infinite sprint",
      "Menu, hotkeys modal, crosshair, skill-cooldown HUD survive",
      "Harmony VerifyPatches logs whether each hook actually applied",
    ],
  },
];

const techStack = [
  { name: "C#", description: "Core mod logic across 57 source files, ~14k lines" },
  { name: "BepInEx 5.4.21", description: "Mono mod loader for Risk of Rain 2's Unity 2021.3.33 runtime" },
  { name: "HarmonyX / Harmony 2", description: "Runtime method patching on RoR2 + UnityEngine types" },
  { name: "Unity IMGUI", description: "Custom 860×560 menu, ESP renderer, overlays, indicators" },
  { name: "RiskOfOptions 2.8.5", description: "Pause-menu settings screen integration (hard dep)" },
  { name: "MMHOOK.RoR2", description: "Typed hooks generated from RoR2 assemblies" },
];

export function RiskOfAnticheatPage() {
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
                  Game Mod
                </span>
                <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-success border border-nd-success/30 px-2 py-1 rounded-full">
                  Open Source
                </span>
              </div>

              <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-nd-text-display leading-[1.0] tracking-[-0.03em] mb-6">
                Risk of Anticheat<span className="text-nd-accent">.</span>
              </h1>

              <p className="text-nd-text-secondary text-base md:text-lg max-w-2xl leading-relaxed mb-10">
                BepInEx mod for Risk of Rain 2. ESP on every interactable, a first-class
                legitbot + ragebot pair with projectile-lead prediction, host-only
                auto-pickup, and a custom 8-tab IMGUI menu. Personal singleplayer /
                co-op replacement for the abandoned Aerolt mod.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="https://github.com/luinbytes/risk-of-anticheat/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-nd-text-display text-nd-black font-mono text-[13px] font-bold tracking-[0.06em] uppercase rounded-full nd-transition hover:opacity-80 min-h-[44px]"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
                <a
                  href="https://github.com/luinbytes/risk-of-anticheat"
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
                      BepInEx 5.4.21
                    </p>
                    <p className="font-mono text-[10px] tracking-[0.04em] text-nd-text-disabled mt-1">
                      Mono runtime + plugin host
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
                      LAYER 02 / PATCHES
                    </p>
                    <p className="font-mono text-sm text-nd-text-display mt-1">
                      Harmony runtime hooks
                    </p>
                    <p className="font-mono text-[10px] tracking-[0.04em] text-nd-text-disabled mt-1">
                      MMHOOK.RoR2 typed hooks
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
                      Risk of Rain 2
                    </p>
                    <p className="font-mono text-[10px] tracking-[0.04em] text-nd-text-disabled mt-1">
                      Unity 2021.3.33 · RoR2.dll
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
                      ESP · Legit · Rage · Cheats
                    </p>
                    <p className="font-mono text-[10px] tracking-[0.04em] text-nd-text-disabled mt-1">
                      8 tabs · 57 files · 5 ESP providers
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 pt-10 border-t border-nd-border">
            <SegmentedStats stats={[
                { label: "Source files", value: "57", total: 20, filled: 20, accentFrom: 18 },
                { label: "Lines of C#", value: "~14k", total: 20, filled: 20, accentFrom: 18 },
                { label: "Menu tabs", value: "8", total: 8, filled: 8, accentFrom: -1 },
                { label: "ESP providers", value: "5", total: 5, filled: 5, accentFrom: -1 },
              ] as const
            } />
          </div>
        </div>
      </section>

      <CaseProofLoop
        steps={[
          { label: "Problem", value: "Risk of Rain 2 mod feedback is hard to inspect mid-run." },
          { label: "Build", value: "Overlay, hooks, config, and packaged release flow." },
          { label: "Verify", value: "GitHub releases and source expose the mod path." },
          { label: "Ship", value: "Open-source singleplayer/co-op tool." },
        ]}
      />

      {/* Features */}
      <section id="features" className="py-24 md:py-32 border-b border-nd-border">
        <div className="container px-4 mx-auto max-w-5xl">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            01 / Features
          </span>
          <p className="text-nd-text-secondary text-base max-w-xl mb-16">
            Harmony-patched on top of BepInEx. Clean provider architecture, null-safe
            ESP, verified-at-load patches — none of the Aerolt-style NRE spam.
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

      {/* Aim pipeline */}
      <section id="aim" className="py-24 md:py-32 border-b border-nd-border">
        <div className="container px-4 mx-auto max-w-5xl">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            02 / Aim Pipeline
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-nd-text-display tracking-[-0.02em] mb-6">
            Legit and rage, running side-by-side
          </h2>
          <p className="text-nd-text-secondary text-base max-w-2xl leading-relaxed mb-12">
            The Legit and Rage cards are peer-concurrent — not a radio. Legit steers
            the camera through a CollectLookInputInternal postfix; rage prefixes
            GenericSkill.ExecuteIfReady to redirect the shot at resolved target time.
            Both share the same target selector, hitbox picker, and prediction stack.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: "Target Selection",
                items: [
                  "TargetSelector scores every CharacterBody each frame",
                  "Modes: BestAngle / Distance / Weighted / LowestHP",
                  "EnemyTeamFilter — EnemiesOnly, EnemiesAndNeutral, All",
                  "Optional visibility linecast and FOV cone check",
                  "Driver-coin priority + rescue auto-shoot branch",
                ],
              },
              {
                title: "Hitbox Picker",
                items: [
                  "Modes: Main / Nearest / CritSpot / LargestVolume / Weakpoint",
                  "SkinnedMeshRenderer → Collider bounds cascade",
                  "Sub-hitbox targeting for consistent weak-spot hits",
                  "Per-body caching — rebuilt on body-start",
                ],
              },
              {
                title: "Prediction",
                items: [
                  "PrevPosTracker derives velocities every FixedUpdate",
                  "ProjectileSpeedTable — tier-1 live-learned, tier-2 reflection",
                  "Lead-solved target point passed to rage + legit alike",
                  "Instance-id keyed, invalidated on scene change + respawn",
                ],
              },
              {
                title: "Humanization",
                items: [
                  "Per-axis smoothing (X/Y decoupled)",
                  "Reaction delay + micro-jitter + overshoot",
                  "Sticky lock with release-on-out-of-FOV",
                  "Visible camera movement toggle for legit mode",
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
              Build & Deploy
            </h3>
            <p className="text-sm text-nd-text-secondary leading-relaxed">
              MSBuild auto-bumps <code className="font-mono text-nd-text-display">version.build</code> each
              compile, generates a <code className="font-mono text-nd-text-display">VersionInfo.g.cs</code> const,
              and repackages a Thunderstore-ready zip. The DLL deploys straight into the active
              r2modman profile plus any legacy folders — re-import the zip to refresh the
              in-launcher version string.
            </p>
          </div>

          <div className="mt-4 bg-nd-surface border border-nd-border p-6">
            <h3 className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-display mb-3">
              Load-time Patch Verification
            </h3>
            <p className="text-sm text-nd-text-secondary leading-relaxed">
              <code className="font-mono text-nd-text-display">VerifyPatches()</code> enumerates every
              Harmony-patched method on boot and logs whether Ragebot, LegitAimHook, BhopHook, InfSprintHook,
              and GodModeHook actually bound — silent patch failures are impossible to miss.
            </p>
          </div>
        </div>
      </section>

      {/* Default Hotkeys */}
      <section id="controls" className="py-24 md:py-32 border-b border-nd-border">
        <div className="container px-4 mx-auto max-w-5xl">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            04 / Controls
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-nd-text-display tracking-[-0.02em] mb-12">
            Default hotkeys
          </h2>

          <div className="space-y-8">
            {(
              [
                {
                  category: "UI",
                  binds: [
                    { key: "Insert", action: "Open / close main menu" },
                    { key: "F4", action: "Hold — hotkeys reference overlay" },
                    { key: "End", action: "Panic — disable every feature" },
                  ],
                },
                {
                  category: "Aim",
                  binds: [
                    { key: "Mouse1 (RMB)", action: "Legit hold key (default)" },
                  ],
                },
                {
                  category: "Rebinding",
                  binds: [
                    { key: "Click bind", action: "Press any key to capture" },
                    { key: "Escape", action: "Cancel capture" },
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
                      <kbd className="font-mono text-[13px] text-nd-text-display bg-nd-black border border-nd-border-visible px-3 py-1.5 min-w-[80px] text-center">
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
            Every bind is remappable from the Configs tab or via the RiskOfOptions pause-menu
            panel. Persisted into the BepInEx config file per r2modman profile.
          </p>
        </div>
      </section>

      {/* Installation */}
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
                title: "Install BepInEx",
                content:
                  "Use r2modmanPlus — create a Risk of Rain 2 profile and it installs bbepis-BepInExPack 5.4.2121 for you. Easier than the manual route; launcher-managed profiles are the recommended path.",
              },
              {
                step: "02",
                title: "Add RiskOfOptions",
                content:
                  "Risk of Anticheat has a hard dependency on Rune580-Risk_Of_Options 2.8.5 for the pause-menu settings screen. Install it from Thunderstore / r2modman before the mod zip.",
              },
              {
                step: "03",
                title: "Install the mod",
                content:
                  "Drop the latest release zip onto r2modmanPlus (or extract luinbytes-RiskOfAnticheat/ into your profile's BepInEx/plugins/ folder). Zip ships with the manifest + icon for launcher recognition.",
              },
              {
                step: "04",
                title: "Launch & configure",
                content:
                  "Boot the game via r2modman. Press Insert in-game to open the menu, hold F4 for the hotkey overlay. Rebinds persist per-profile; End is the panic key if anything misbehaves.",
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
            Get the mod
          </h2>
          <p className="text-nd-text-secondary text-base max-w-lg mx-auto mb-10">
            Personal singleplayer / co-op tool. Open source. Thunderstore-packaged zips
            for easy r2modman install, or grab the DLL directly.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://github.com/luinbytes/risk-of-anticheat/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-nd-text-display text-nd-black font-mono text-[13px] font-bold tracking-[0.06em] uppercase rounded-full nd-transition hover:opacity-80 min-h-[44px]"
            >
              <Download className="w-4 h-4" />
              Latest Release
            </a>
            <a
              href="https://github.com/luinbytes/risk-of-anticheat"
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

export default RiskOfAnticheatPage;
