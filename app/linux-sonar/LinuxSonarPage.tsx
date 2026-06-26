"use client";

import Link from "next/link";
import { SectionRail, SegmentedStats, useActiveSection } from "@/components/case-page-parts";
import {
  Github,
  Sliders,
  Mic,
  Volume2,
  Headphones,
  Layers,
  Monitor,
  Cpu,
  Radio,
  GitBranch,
} from "lucide-react";

const SECTION_NAV = [
  { id: "overview", label: "Overview" },
  { id: "channels", label: "Channels" },
  { id: "features", label: "Features" },
  { id: "mic-chain", label: "Mic Chain" },
  { id: "tech", label: "Tech" },
  { id: "setup", label: "Setup" },
  { id: "source", label: "Source" },
] as const;

const channels = [
  {
    icon: Headphones,
    name: "Game",
    description:
      "Default destination for game processes. Routed by daemon polling against per-app rules so launches and respawns don't escape the channel.",
  },
  {
    icon: Radio,
    name: "Chat",
    description:
      "Voice clients (Discord, Equibop, TeamSpeak) routed here. ChatMix slider balances this against the Game channel against the headset.",
  },
  {
    icon: Volume2,
    name: "Media",
    description:
      "Browsers, music players, video. Anything that's not a game and not a voice client lands here by default.",
  },
  {
    icon: Sliders,
    name: "Aux",
    description:
      "Free slot — bind it to whatever you want. Useful for OBS monitoring, secondary mixes, or apps you want isolated from the rest.",
  },
  {
    icon: Mic,
    name: "Mic",
    description:
      "Output of the mic effects chain. RNNoise → gate → 8-band EQ → compressor → limiter, all running as a PipeWire filter-chain subprocess.",
  },
] as const;

const features = [
  {
    icon: Layers,
    title: "Per-app routing",
    description:
      "Five virtual sinks pinned to your headset via target.object. A small daemon polls wpctl/pactl every 1.5s and enforces per-app routing rules, so apps stay where they belong even after relaunches.",
    details: [
      "libpipewire-module-filter-chain virtual sinks, one per channel",
      "WirePlumber persists app→channel mappings across reboots",
      "Daemon catches sink-input regressions inside ~1.5s",
    ],
  },
  {
    icon: Sliders,
    title: "ChatMix",
    description:
      "Software slider rebalances Game against Chat in real time. Hardware ChatMix wheel works too — read straight off the device over USB-HID, no SteelSeries software in the loop.",
    details: [
      "Slider driven from the GTK4 GUI or your waybar module",
      "Hardware wheel via USB-HID — direct read from the headset",
      "Game and Chat volumes scale inversely from a single input",
    ],
  },
  {
    icon: Mic,
    title: "Mic effects chain",
    description:
      "RNNoise, noise gate, 8-band EQ, compressor, and limiter, in that order. Runs as an isolated pipewire filter-chain subprocess so a bad config can't take the whole graph with it.",
    details: [
      "Static-stereo capture.props avoids RnNoiseStereo SEGV on mic swap",
      "Service-restart swap pattern — no live-relink edge cases",
      "Each stage tuneable independently in the GUI",
    ],
  },
  {
    icon: Monitor,
    title: "GTK4 GUI + waybar",
    description:
      "libadwaita panel for live tuning of every channel and the mic chain. Optional waybar module exposes ChatMix and per-channel volumes on the bar — no GUI needed for hot-path adjustments.",
    details: [
      "Native GTK4 / libadwaita — fits Hyprland and other Wayland setups",
      "Waybar module ships per-channel volumes + ChatMix",
      "GUI stays optional; daemon and CLI work standalone",
    ],
  },
] as const;

const techStack = [
  { name: "Python", description: "Daemon, GUI, and tooling" },
  {
    name: "PipeWire",
    description: "filter-chain modules for the five virtual sinks and the mic chain",
  },
  {
    name: "WirePlumber",
    description: "Persists per-app routing decisions across reboots",
  },
  { name: "GTK4 / libadwaita", description: "Native Wayland-friendly GUI" },
  { name: "RNNoise", description: "ML-based noise suppression as a PipeWire filter" },
  { name: "USB-HID", description: "Direct read of hardware ChatMix wheel" },
] as const;

const micStages = [
  {
    name: "RNNoise",
    role: "ML-based noise suppression — strips fan, keyboard, and ambient noise",
  },
  {
    name: "Gate",
    role: "Closes when below threshold so room tone never makes it onto the wire",
  },
  {
    name: "8-band EQ",
    role: "Per-band shelf and peak filters — clean up the mic curve to taste",
  },
  {
    name: "Compressor",
    role: "Even out levels between quiet and loud delivery without losing dynamics",
  },
  {
    name: "Limiter",
    role: "Hard ceiling so the chain can't overshoot and clip downstream",
  },
] as const;

export function LinuxSonarPage() {
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
                  CLI Tool
                </span>
                <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-success border border-nd-success/30 px-2 py-1 rounded-full">
                  Open Source
                </span>
                <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-accent border border-nd-accent/30 px-2 py-1 rounded-full">
                  Linux
                </span>
              </div>

              <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-nd-text-display leading-[1.0] tracking-[-0.03em] mb-6">
                linux-sonar<span className="text-nd-accent">.</span>
              </h1>

              <p className="text-nd-text-secondary text-base md:text-lg max-w-2xl leading-relaxed mb-6">
                SteelSeries Sonar doesn&apos;t exist on Linux. So I built it.
              </p>

              <p className="text-nd-text-secondary text-base md:text-lg max-w-2xl leading-relaxed mb-10">
                Five virtual audio channels, per-app routing enforced by a daemon,
                a ChatMix slider with hardware wheel support, and a full mic
                effects chain (RNNoise, gate, EQ, compressor, limiter) running as
                an isolated PipeWire filter-chain. GTK4 GUI, waybar integration,
                no proprietary software anywhere in the path.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="https://github.com/luinbytes/linux-sonar"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-nd-text-display text-nd-black font-mono text-[13px] font-bold tracking-[0.06em] uppercase rounded-full nd-transition hover:opacity-80 min-h-[44px]"
                >
                  <Github className="w-4 h-4" />
                  View on GitHub
                </a>
              </div>
            </div>

            {/* Right column — channel topology */}
            <div className="hidden lg:block relative">
              <div className="absolute inset-0 dot-grid-subtle opacity-20 pointer-events-none" />
              <div className="relative">
                <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-nd-text-disabled mb-6">
                  CHANNEL.TOPOLOGY
                </p>

                <div className="flex flex-col items-stretch">
                  <div className="bg-nd-surface border border-nd-border px-5 py-4 rounded-sm">
                    <p className="font-mono text-[10px] tracking-[0.08em] uppercase text-nd-text-disabled">
                      LAYER 01 / APPS
                    </p>
                    <p className="font-mono text-sm text-nd-text-display mt-1">
                      Game · Chat · Media · Aux · Mic
                    </p>
                    <p className="font-mono text-[10px] tracking-[0.04em] text-nd-text-disabled mt-1">
                      Sources resolved by per-app rules
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
                      LAYER 02 / VIRTUAL SINKS
                    </p>
                    <p className="font-mono text-sm text-nd-text-display mt-1">
                      5× filter-chain modules
                    </p>
                    <p className="font-mono text-[10px] tracking-[0.04em] text-nd-text-disabled mt-1">
                      target.object pinned to headset
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
                      LAYER 03 / DAEMON + GUI
                    </p>
                    <p className="font-mono text-sm text-nd-text-display mt-1">
                      Routing daemon · ChatMix · GTK4
                    </p>
                    <p className="font-mono text-[10px] tracking-[0.04em] text-nd-text-disabled mt-1">
                      WirePlumber persists across reboot
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
                      Headset · Mic out
                    </p>
                    <p className="font-mono text-[10px] tracking-[0.04em] text-nd-text-disabled mt-1">
                      Any PipeWire stereo sink works
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 pt-10 border-t border-nd-border">
            <SegmentedStats stats={[
                {
                  label: "Channels",
                  value: "5",
                  total: 5,
                  filled: 5,
                  accentFrom: -1,
                },
                {
                  label: "Mic stages",
                  value: "5",
                  total: 5,
                  filled: 5,
                  accentFrom: -1,
                },
                {
                  label: "Daemon poll",
                  value: "1.5s",
                  total: 6,
                  filled: 4,
                  accentFrom: -1,
                },
                {
                  label: "License",
                  value: "FOSS",
                  total: 4,
                  filled: 4,
                  accentFrom: 0,
                },
              ] as const
            } />
          </div>
        </div>
      </section>

      {/* Channels */}
      <section
        id="channels"
        className="py-24 md:py-32 border-b border-nd-border"
      >
        <div className="container px-4 mx-auto max-w-5xl">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            01 / Channels
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-nd-text-display tracking-[-0.02em] mb-6">
            Five sinks. One headset.
          </h2>
          <p className="text-nd-text-secondary text-base max-w-2xl mb-12 leading-relaxed">
            Each channel is its own PipeWire virtual sink, pinned to the headset
            via <code className="font-mono text-nd-text-display">target.object</code>.
            Apps are routed in by name; the daemon enforces routing every 1.5s
            so launches, restarts, and streaming sessions don&apos;t leak across
            channels.
          </p>

          <div className="bg-nd-surface border border-nd-border overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-nd-border">
                  <th className="text-left font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled py-4 px-6 font-normal w-40">
                    Channel
                  </th>
                  <th className="text-left font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled py-4 px-6 font-normal">
                    What lands here
                  </th>
                </tr>
              </thead>
              <tbody>
                {channels.map((channel, i) => {
                  const Icon = channel.icon;
                  return (
                    <tr
                      key={channel.name}
                      className={
                        i < channels.length - 1
                          ? "border-b border-nd-border"
                          : ""
                      }
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <Icon className="w-4 h-4 text-nd-accent shrink-0" />
                          <span className="font-mono text-sm text-nd-text-display">
                            {channel.name}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-nd-text-secondary leading-relaxed">
                        {channel.description}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="py-24 md:py-32 border-b border-nd-border"
      >
        <div className="container px-4 mx-auto max-w-5xl">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            02 / Features
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-nd-text-display tracking-[-0.02em] mb-6">
            What it actually does
          </h2>
          <p className="text-nd-text-secondary text-base max-w-xl mb-16">
            Sonar feature parity, no proprietary software, no kernel modules,
            stock PipeWire on Arch.
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

      {/* Mic chain */}
      <section
        id="mic-chain"
        className="py-24 md:py-32 border-b border-nd-border"
      >
        <div className="container px-4 mx-auto max-w-5xl">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            03 / Mic Chain
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-nd-text-display tracking-[-0.02em] mb-6">
            <Mic className="inline-block w-6 h-6 mr-2 text-nd-accent align-baseline" />
            Five stages, one filter-chain subprocess
          </h2>
          <p className="text-nd-text-secondary text-base max-w-2xl mb-12 leading-relaxed">
            The mic effects pipeline runs as an isolated{" "}
            <code className="font-mono text-nd-text-display">
              libpipewire-module-filter-chain
            </code>{" "}
            subprocess. Each stage is independently tuneable. Live re-link on
            mono ↔ stereo audioconvert renegotiation used to SEGV the RnNoise
            stage — fixed by static-stereo capture props and a service-restart
            swap pattern instead of in-place relinks.
          </p>

          <div className="space-y-3">
            {micStages.map((stage, i) => (
              <div
                key={stage.name}
                className="bg-nd-surface border border-nd-border p-5 flex items-start gap-6"
              >
                <span className="font-display text-2xl font-bold text-nd-text-disabled shrink-0 w-10">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-sm text-nd-text-display">
                      {stage.name}
                    </span>
                    {i < micStages.length - 1 && (
                      <span className="font-mono text-[10px] text-nd-text-disabled">
                        →
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-nd-text-secondary leading-relaxed">
                    {stage.role}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tech */}
      <section id="tech" className="py-24 md:py-32 border-b border-nd-border">
        <div className="container px-4 mx-auto max-w-5xl">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            04 / Tech
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
                <p className="text-sm text-nd-text-secondary">
                  {tech.description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-nd-surface border border-nd-border p-6">
            <h3 className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-display mb-3 flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5 text-nd-accent" />
              Routing daemon
            </h3>
            <p className="text-sm text-nd-text-secondary leading-relaxed">
              A small Python daemon polls{" "}
              <code className="font-mono text-nd-text-display">wpctl</code> and{" "}
              <code className="font-mono text-nd-text-display">pactl</code> on a
              ~1.5s cadence. When a sink-input doesn&apos;t match its expected
              channel (because the app just launched, restarted, or spawned a
              child stream), the daemon moves it. WirePlumber persists those
              moves so they survive reboots without rerunning setup.
            </p>
          </div>

          <div className="mt-4 bg-nd-surface border border-nd-border p-6">
            <h3 className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-display mb-3 flex items-center gap-2">
              <GitBranch className="w-3.5 h-3.5 text-nd-accent" />
              Compatibility
            </h3>
            <p className="text-sm text-nd-text-secondary leading-relaxed">
              Tested on Arch with stock PipeWire and WirePlumber. Works with any
              stereo output sink — analog headphone jack, USB headset, HDMI
              audio, Bluetooth A2DP. EasyEffects&apos; output pipeline must be
              disabled for per-channel routing to take effect (its global
              capture sits in front of the per-app sinks).
            </p>
          </div>
        </div>
      </section>

      {/* Setup */}
      <section id="setup" className="py-24 md:py-32 border-b border-nd-border">
        <div className="container px-4 mx-auto max-w-5xl">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            05 / Setup
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-nd-text-display tracking-[-0.02em] mb-12">
            Getting it running
          </h2>

          <div className="space-y-6">
            {[
              {
                step: "01",
                title: "Install dependencies",
                content:
                  "PipeWire, WirePlumber, GTK4, libadwaita, and Python 3.11+. On Arch: pacman -S pipewire wireplumber gtk4 libadwaita python.",
              },
              {
                step: "02",
                title: "Clone and run setup",
                content:
                  "Clone the repo, run the install script. It drops the filter-chain configs into ~/.config/pipewire/pipewire.conf.d/ and seeds the routing daemon's app→channel rules.",
              },
              {
                step: "03",
                title: "Disable EasyEffects output",
                content:
                  "If you run EasyEffects, turn off its output pipeline — it captures everything before the per-channel sinks can route it. The mic side is fine; only the output stage conflicts.",
              },
              {
                step: "04",
                title: "Launch the GUI",
                content:
                  "Open the GTK4 panel to verify all five sinks show up and to tune the mic chain. Add the waybar module if you want ChatMix and per-channel volumes on your bar.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-6 items-start">
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

      {/* Source */}
      <section id="source" className="py-24 md:py-32">
        <div className="container px-4 mx-auto max-w-5xl text-center">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            06 / Source
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-nd-text-display tracking-[-0.02em] mb-4">
            Get linux-sonar
          </h2>
          <p className="text-nd-text-secondary text-base max-w-lg mx-auto mb-10">
            FOSS under GPL-3.0. Clone, hack, and route. Issues and PRs welcome.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href="https://github.com/luinbytes/linux-sonar"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-nd-text-display text-nd-black font-mono text-[13px] font-bold tracking-[0.06em] uppercase rounded-full nd-transition hover:opacity-80 min-h-[44px]"
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

export default LinuxSonarPage;
