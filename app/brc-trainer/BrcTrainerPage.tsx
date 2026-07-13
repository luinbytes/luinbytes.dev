"use client";

import Link from "next/link";
import { CasePageShell, CaseProofLoop, SectionRail, SegmentedStats, useActiveSection } from "@/components/case-page-parts";
import {
  Github,
  Download,
  Shield,
  Zap,
  Gauge,
  Coins,
  Clock,
  Type,
  Gamepad2,
  Rocket,
} from "lucide-react";

const SECTION_NAV = [
  { id: "overview", label: "Overview" },
  { id: "features", label: "Features" },
  { id: "fonts", label: "Fonts" },
  { id: "tech", label: "Tech" },
  { id: "controls", label: "Controls" },
  { id: "setup", label: "Setup" },
  { id: "download", label: "Download" },
] as const;

const features = [
  {
    icon: Rocket,
    title: "Infinite Boost",
    description:
      "Harmony postfix on UseBoostChargeForBoost refunds the spend the same frame, then a per-frame keepalive pins boostCharge to maxBoostCharge so you never drop out of rocket mode.",
    details: [
      "Postfix on Player.UseBoostChargeForBoost — instant refund",
      "Per-frame InfiniteBoostKeepalive MonoBehaviour backs up the refund",
      "Safe to toggle mid-session; refunds stop when disabled",
    ],
  },
  {
    icon: Gauge,
    title: "Speed Multiplier",
    description:
      "SpeedTweaker writes Player.runSpeedModifier every frame. Grind and skate math already respect the modifier, so the value passes through to every traversal state cleanly.",
    details: [
      "Per-frame write from MonoBehaviour attached to the local Player",
      "Live slider — changes apply the next frame, no menu reopen",
      "Zero-friction revert when disabled (writes 1.0 once)",
    ],
  },
  {
    icon: Zap,
    title: "Fly / Noclip",
    description:
      "FlyController disables the MovementMotor and drives player transform directly. WASD + space/ctrl for vertical — full 6-DoF movement that ignores gravity, collision, and grind surfaces.",
    details: [
      "Motor disabled while active; restored on toggle-off",
      "Direct Transform.position writes, camera-relative input",
      "Survives scene transitions — reattaches on respawn",
    ],
  },
  {
    icon: Shield,
    title: "God Mode & No Bail",
    description:
      "Prefix hooks on Player.GetHit and ChangeHP skip damage and cancel the bail ability entirely. Cops hit you, cars hit you, nothing sticks.",
    details: [
      "Harmony prefix on Player.GetHit(...) short-circuits incoming damage",
      "Positive ChangeHP still processed so pickups still heal",
      "NoBailHook cancels Player.ActivateAbility(dieAbility) calls",
    ],
  },
  {
    icon: Shield,
    title: "No Heat & One-Shot Cops",
    description:
      "Postfix on WantedManager.WantedStars pins the result to 0, so the heat gauge never climbs. One-Shot Cops prefixes BasicEnemy.GetHit to force CurHP = 1 before damage resolves.",
    details: [
      "Postfix on WantedManager.WantedStars getter — pinned to 0",
      "Prefix on BasicEnemy.GetHit sets CurHP = 1 pre-damage",
      "Heat naturally decays when pinned; no artifact state",
    ],
  },
  {
    icon: Coins,
    title: "REP Editor",
    description:
      "Stepped ±100 buttons (or ±1000 with Shift-click) write StageProgress.reputation directly and trigger a save. The pause-menu REP counter reflects instantly.",
    details: [
      "Reads + writes StageProgress.reputation via SaveManager",
      "Shift-click bumps the step to ±1000",
      "Save triggered synchronously — survives quitting mid-session",
    ],
  },
  {
    icon: Clock,
    title: "Time Scale & World",
    description:
      "Time.timeScale driven straight from config each frame. Pause menus can still override; the trainer re-asserts next tick. Plus Instant Graffiti and Unlock All On Load.",
    details: [
      "Time.timeScale pinned every Update — slow-mo or fast-forward",
      "Instant Graffiti prefix skips the mini-game and calls End()",
      "UnlockAllOnLoad iterates Characters + Dances enums via SaveSlotData",
    ],
  },
  {
    icon: Gamepad2,
    title: "Gamepad Navigation",
    description:
      "Full controller support — L3 + R3 chord opens the menu (no collision with skating, BRC doesn&apos;t use stick-clicks). D-pad drives tabs and widgets under Proton-safe input sampling.",
    details: [
      "L3 + R3 open combo — collision-free with gameplay bindings",
      "GamepadNav samples inputs in Update, not inside IMGUI&apos;s event loop",
      "Under Proton, Input.GetKeyDown for joystick buttons misfires inside OnGUI — this sidesteps it",
      "F2 still works for keyboard users",
    ],
  },
];

const techStack = [
  { name: "C#", description: "Trainer logic across 27 source files, ~3.3k lines" },
  { name: "BepInEx 5 Mono", description: "Mono x64 pack (winhttp.dll), NOT IL2CPP — BRC ships as Mono" },
  { name: "HarmonyLib", description: "Runtime method patching on Reptile namespace types" },
  { name: "Unity IMGUI", description: "380px sidebar Quickbar, custom skin, private-registered fonts" },
  { name: ".NET Standard 2.1", description: "Build target matching BRC's Unity runtime" },
  { name: "Harmony Reflection", description: "Internals not public — reflection + cached MethodInfo for every hook" },
];

export function BrcTrainerPage() {
  const activeSection = useActiveSection(SECTION_NAV);

  return (
    <CasePageShell variant="brc">
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
                BrcTrainer<span className="text-nd-accent">.</span>
              </h1>

              <p className="text-nd-text-secondary text-base md:text-lg max-w-2xl leading-relaxed mb-10">
                Internal trainer for Bomb Rush Cyberfunk. BepInEx 5 Mono plugin with a
                380px IMGUI sidebar — infinite boost, speed multiplier, fly / noclip,
                god mode, no heat, REP editor, time scale. Proton-safe input sampling
                and a GDI-private dynamic-font pipeline so menu text actually renders
                under Wine.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="https://github.com/luinbytes/brc-trainer/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-nd-text-display text-nd-black font-mono text-[13px] font-bold tracking-[0.06em] uppercase rounded-full nd-transition hover:opacity-80 min-h-[44px]"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
                <a
                  href="https://github.com/luinbytes/brc-trainer"
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
                      BepInEx 5 Mono x64
                    </p>
                    <p className="font-mono text-[10px] tracking-[0.04em] text-nd-text-disabled mt-1">
                      winhttp.dll injection
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
                      HarmonyLib hooks
                    </p>
                    <p className="font-mono text-[10px] tracking-[0.04em] text-nd-text-disabled mt-1">
                      Player / WantedManager / BasicEnemy / GraffitiGame
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
                      Bomb Rush Cyberfunk
                    </p>
                    <p className="font-mono text-[10px] tracking-[0.04em] text-nd-text-disabled mt-1">
                      Unity Mono · Reptile namespace
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
                      Move · Health · Cops · Econ · World
                    </p>
                    <p className="font-mono text-[10px] tracking-[0.04em] text-nd-text-disabled mt-1">
                      5 tabs · 27 files · F2 toggle
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 pt-10 border-t border-nd-border">
            <SegmentedStats stats={[
                { label: "Source files", value: "27", total: 27, filled: 27, accentFrom: -1 },
                { label: "Lines of C#", value: "~3.3k", total: 20, filled: 17, accentFrom: -1 },
                { label: "Menu tabs", value: "5", total: 5, filled: 5, accentFrom: -1 },
                { label: "Harmony targets", value: "5", total: 5, filled: 5, accentFrom: -1 },
              ] as const
            } />
          </div>
        </div>
      </section>

      <CaseProofLoop
        steps={[
          { label: "Problem", value: "Trainer UI needs fast in-game control." },
          { label: "Build", value: "Harmony hooks and a five-tab overlay." },
          { label: "Verify", value: "Case sections list hook targets and feature paths." },
          { label: "Ship", value: "BepInEx mod with focused controls." },
        ]}
      />

      {/* Features */}
      <section id="features" className="py-24 md:py-32 border-b border-nd-border">
        <div className="container px-4 mx-auto max-w-5xl">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            01 / Features
          </span>
          <p className="text-nd-text-secondary text-base max-w-xl mb-16">
            Five tabs, one sidebar. Every hook is a Harmony prefix or postfix on a
            specific Reptile type — no memory scans, no DLL injection beyond the loader.
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

      {/* Font Pipeline */}
      <section id="fonts" className="py-24 md:py-32 border-b border-nd-border">
        <div className="container px-4 mx-auto max-w-5xl">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            02 / Font Pipeline
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-nd-text-display tracking-[-0.02em] mb-6">
            <Type className="inline-block w-6 h-6 mr-2 text-nd-accent align-baseline" />
            Getting embedded fonts to render under Proton
          </h2>
          <p className="text-nd-text-secondary text-base max-w-2xl leading-relaxed mb-12">
            Two traps stack up under Proton. First,{" "}
            <code className="font-mono text-nd-text-display">new Font(path)</code> in Unity
            returns a <em>static</em> font — GUIStyle.fontSize silently no-ops and Unity logs
            <em> &quot;font size and style overrides are only supported for dynamic fonts&quot;</em> every
            draw. Second, even with the only size-mutable API{" "}
            (<code className="font-mono text-nd-text-display">Font.CreateDynamicFontFromOSFont</code>),
            Wine silently falls back to Arial if the family isn&apos;t visible to the host font system.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                title: "Problem",
                items: [
                  "Unity static fonts ignore GUIStyle.fontSize overrides",
                  "Under Proton, Wine silently falls back to Arial for missing families",
                  "AddFontResourceExW(FR_PRIVATE) works on native Windows but Wine ignores process-private registrations",
                  "Result: menu text invisible or rendered in the wrong font under Proton",
                ],
              },
              {
                title: "Solution",
                items: [
                  "Extract each embedded TTF to the Windows/Wine system Fonts directory",
                  "P/Invoke plain AddFontResourceW on gdi32.dll (process-wide, not FR_PRIVATE)",
                  "Broadcast WM_FONTCHANGE so GDI's font cache refreshes immediately",
                  "Ask Unity for Font.CreateDynamicFontFromOSFont(familyName, size)",
                ],
              },
              {
                title: "Font set",
                items: [
                  "Doto-{Regular, Medium}.ttf — display face",
                  "SpaceGrotesk-{Regular, Medium, Bold}.ttf — UI body",
                  "SpaceMono-{Regular, Bold}.ttf — monospace labels",
                  "All embedded into the DLL as EmbeddedResource",
                ],
              },
              {
                title: "Cross-compat",
                items: [
                  "Works on Windows native AND under Proton / Wine",
                  "No admin rights needed — Wine prefix's windows/Fonts dir is writeable",
                  "Tested end-to-end on the machine — no residual Arial fallback",
                  "No manual reboot — WM_FONTCHANGE broadcast rebuilds the cache inline",
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
              Reference-only game assemblies
            </h3>
            <p className="text-sm text-nd-text-secondary leading-relaxed">
              <code className="font-mono text-nd-text-display">Assembly-CSharp.dll</code>,{" "}
              <code className="font-mono text-nd-text-display">Assembly-CSharp-firstpass.dll</code>, and{" "}
              <code className="font-mono text-nd-text-display">Rewired_Core.dll</code> are referenced at
              build time only (not redistributed). Hooks resolve Reptile types by reflection with cached
              MethodInfo, so trainer builds tolerate minor game updates without rebuilds.
            </p>
          </div>

          <div className="mt-4 bg-nd-surface border border-nd-border p-6">
            <h3 className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-display mb-3">
              Patch verification
            </h3>
            <p className="text-sm text-nd-text-secondary leading-relaxed">
              <code className="font-mono text-nd-text-display">VerifyPatches()</code> enumerates every
              Harmony-patched method across the types the trainer targets
              (<code className="font-mono text-nd-text-display">Reptile.Player</code>,{" "}
              <code className="font-mono text-nd-text-display">WantedManager</code>,{" "}
              <code className="font-mono text-nd-text-display">BasicEnemy</code>,{" "}
              <code className="font-mono text-nd-text-display">GraffitiGame</code>,{" "}
              <code className="font-mono text-nd-text-display">GameInput</code>) and logs each binding —
              silent Harmony failures are impossible to miss.
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
                  category: "Keyboard",
                  binds: [
                    { key: "F2", action: "Open / close sidebar menu" },
                    { key: "H", action: "Hold — hotkeys reference overlay" },
                    { key: "End", action: "Panic — disable every feature" },
                  ],
                },
                {
                  category: "Gamepad",
                  binds: [
                    { key: "L3 + R3", action: "Open / close sidebar (combo)" },
                    { key: "D-Pad", action: "Tab + widget navigation" },
                  ],
                },
                {
                  category: "Menu interaction",
                  binds: [
                    { key: "Shift + Click", action: "±1000 step on REP buttons" },
                    { key: "Left Click", action: "±100 step on REP buttons" },
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
            OpenMenuKey / PanicKey / OpenHotkeysKey are rebindable through the BepInEx config
            file. Start is intentionally reserved — BRC uses it for its own pause menu.
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
                title: "Install BepInEx 5 Mono x64",
                content:
                  "Grab BepInEx_x64_5.4.*.zip from the BepInEx releases — NOT the IL2CPP variant. BRC ships as Mono. Extract it into the game directory so winhttp.dll sits next to 'Bomb Rush Cyberfunk.exe'.",
              },
              {
                step: "02",
                title: "Run once to seed folders",
                content:
                  "Launch the game and immediately quit. BepInEx writes its folder skeleton on first boot — you should now see BepInEx/plugins/ in the install directory.",
              },
              {
                step: "03",
                title: "Install the trainer",
                content:
                  "Drop BrcTrainer.dll into BepInEx/plugins/. Or use r2modmanPlus — it has BRC support, auto-installs BepInEx per profile, and accepts the zipped plugin.",
              },
              {
                step: "04",
                title: "Play",
                content:
                  "Launch the game. Press F2 (or L3 + R3 on gamepad) to open the sidebar. End key is the panic kill if anything misbehaves.",
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
            Open source. Grab the latest DLL directly or pull the whole source and build
            it with <code className="font-mono text-nd-text-display">dotnet build -c Release</code>.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://github.com/luinbytes/brc-trainer/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-nd-text-display text-nd-black font-mono text-[13px] font-bold tracking-[0.06em] uppercase rounded-full nd-transition hover:opacity-80 min-h-[44px]"
            >
              <Download className="w-4 h-4" />
              Latest Release
            </a>
            <a
              href="https://github.com/luinbytes/brc-trainer"
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
    </CasePageShell>
  );
}

export default BrcTrainerPage;
