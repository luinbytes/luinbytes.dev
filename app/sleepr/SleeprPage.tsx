"use client";

import Link from "next/link";
import { CasePageShell, CaseProofLoop, SectionRail, SegmentedStats, useActiveSection } from "@/components/case-page-parts";
import {
  AlarmClock,
  Bell,
  Brain,
  CalendarClock,
  Clock3,
  Download,
  Moon,
  Shield,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
} from "lucide-react";

const SECTION_NAV = [
  { id: "overview", label: "Overview" },
  { id: "wake-windows", label: "Wake Windows" },
  { id: "ticker", label: "Ticker" },
  { id: "learning", label: "Learning" },
  { id: "privacy", label: "Privacy" },
  { id: "tech", label: "Build" },
  { id: "get-the-app", label: "Get the app" },
] as const;

const insideFeatures = [
  { icon: Clock3, label: "Cycle-aware wake windows" },
  { icon: Bell, label: "Optional live notification ticker" },
  { icon: Brain, label: "On-device schedule learning" },
  { icon: SlidersHorizontal, label: "Personal cycle tuning" },
  { icon: Shield, label: "No account, no cloud requirement" },
];

const wakeFeatures = [
  {
    icon: Moon,
    title: "Plan from bedtime",
    description:
      "Open Sleepr when you are about to sleep and get wake windows that land at cleaner cycle boundaries.",
    details: [
      "Wake suggestions based on sleep-cycle timing",
      "Designed for quick decisions at night",
      "Keeps the app focused on the next useful choice",
    ],
  },
  {
    icon: AlarmClock,
    title: "Work around alarms",
    description:
      "Use the next alarm as a real constraint instead of treating every night like a blank spreadsheet.",
    details: [
      "Surfaces guidance around the wake time you already picked",
      "Helps explain when a morning may feel rough",
      "Keeps the calculation understandable, not mystical",
    ],
  },
  {
    icon: CalendarClock,
    title: "Adapt to real mornings",
    description:
      "Rate mornings as rested or groggy so Sleepr can tune its cycle estimate to your lived pattern.",
    details: [
      "Morning feedback feeds personal cycle tuning",
      "Gentle rating actions from notifications",
      "Built for gradual learning instead of noisy daily micromanagement",
    ],
  },
];

const privacyCards = [
  {
    title: "Local-first by default",
    body: "Sleepr's sleep profile, ratings, and learning signals are stored on your device. The core sleep model does not need an account or server.",
  },
  {
    title: "Usage access is optional",
    body: "Schedule learning can use Android's special usage-access permission to infer likely sleep and wake windows from screen activity. It is opt-in.",
  },
  {
    title: "Notifications stay under your control",
    body: "The live ticker is an explicit setting. If enabled, Sleepr can restore it after reboot; if disabled, it stays out of the way.",
  },
  {
    title: "Built for quiet guidance",
    body: "Sleepr avoids social feeds, leaderboards, cloud dashboards, and anxiety charts. The goal is a better next wake window.",
  },
];

const techStack = [
  { name: "Kotlin", description: "Native Android application code" },
  { name: "Jetpack Compose", description: "Calm, responsive app UI" },
  { name: "Room", description: "Local database for sleep learning state" },
  { name: "DataStore", description: "Settings and onboarding preferences" },
  { name: "WorkManager", description: "Background scheduling and reminders" },
  { name: "Hilt", description: "Dependency injection across app services" },
];

export default function SleeprPage() {
  const activeSection = useActiveSection(SECTION_NAV);

  return (
    <CasePageShell variant="sleepr">
      <SectionRail sections={SECTION_NAV} activeSection={activeSection} />

      <section id="overview" className="relative border-b border-nd-border">
        <div className="absolute inset-0 dot-grid-subtle opacity-30 pointer-events-none" />
        <div className="container px-4 mx-auto max-w-5xl relative z-10 py-24 md:py-40">
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-12 items-center">
            <div>
              <Link
                href="/#builds"
                className="inline-flex items-center gap-2 font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled hover:text-nd-text-display nd-transition mb-12"
              >
                {"<-"} Back to projects
              </Link>

              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled border border-nd-border px-2 py-1 rounded-full">
                  Android App
                </span>
                <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-success border border-nd-success/30 px-2 py-1 rounded-full">
                  Local-first
                </span>
              </div>

              <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-nd-text-display leading-[1.0] tracking-[-0.03em] mb-6">
                Sleepr<span className="text-nd-accent">.</span>
              </h1>

              <p className="text-nd-text-secondary text-base md:text-lg max-w-2xl leading-relaxed mb-10">
                A quiet sleep companion for cycle-aware wake windows, optional
                live notifications, and private rhythm learning that stays on
                your phone.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href="#get-the-app"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-nd-text-display text-nd-black font-mono text-[13px] font-bold tracking-[0.06em] uppercase rounded-full nd-transition hover:opacity-80 min-h-[44px]"
                >
                  <Download className="w-4 h-4" />
                  Get Sleepr
                </a>
                <a
                  href="#privacy"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-transparent border border-nd-border-visible text-nd-text-primary font-mono text-[13px] font-bold tracking-[0.06em] uppercase rounded-full nd-transition hover:border-nd-text-secondary min-h-[44px]"
                >
                  <Shield className="w-4 h-4" />
                  Privacy
                </a>
              </div>
            </div>

            <div className="hidden lg:block relative">
              <div className="absolute inset-0 dot-grid-subtle opacity-20 pointer-events-none" />
              <div className="relative">
                <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-nd-text-disabled mb-6">
                  WHAT&apos;S INSIDE
                </p>

                <div className="bg-nd-surface border border-nd-border p-6">
                  <div className="space-y-4">
                    {insideFeatures.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div
                          key={item.label}
                          className="flex items-center gap-3"
                        >
                          <Icon className="w-4 h-4 text-nd-text-secondary shrink-0" />
                          <span className="font-mono text-sm text-nd-text-display">
                            {item.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="border-t border-nd-border mt-6 pt-4">
                    <p className="font-mono text-[10px] text-nd-text-disabled">
                      Calm guidance. No account required.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 pt-10 border-t border-nd-border">
            <SegmentedStats stats={[
                { label: "Platform", value: "Android", total: 1, filled: 1 },
                { label: "Cycle base", value: "90m", total: 6, filled: 6 },
                { label: "Cloud need", value: "0", total: 5, filled: 0 },
                { label: "Mode", value: "Quiet", total: 4, filled: 4 },
              ] as const
            } />
          </div>
        </div>
      </section>

      <CaseProofLoop
        steps={[
          { label: "Problem", value: "Sleep apps turn bedtime into another dashboard." },
          { label: "Build", value: "Cycle windows, local history, widgets, and morning feedback." },
          { label: "Verify", value: "Room, WorkManager, and on-device model sections cover the flow." },
          { label: "Ship", value: "Private Android sleep companion." },
        ]}
      />

      <section
        id="wake-windows"
        className="py-24 md:py-32 border-b border-nd-border"
      >
        <div className="container px-4 mx-auto max-w-5xl">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            01 / Wake Windows
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-nd-text-display tracking-[-0.02em] mb-6">
            Better mornings start the night before.
          </h2>
          <p className="text-nd-text-secondary text-base max-w-xl mb-16">
            Sleepr focuses on the handful of bedtime decisions where sleep-cycle
            guidance is actually useful.
          </p>

          <div className="space-y-16">
            {wakeFeatures.map((feature) => {
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

      <section id="ticker" className="py-24 md:py-32 border-b border-nd-border">
        <div className="container px-4 mx-auto max-w-5xl">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            02 / Ticker
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-nd-text-display tracking-[-0.02em] mb-6">
            A live hint when you want it.
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Opt-in",
                body: "The ongoing notification only appears when you enable it.",
              },
              {
                title: "Minute-aware",
                body: "Wake hints update with the clock instead of going stale in the shade.",
              },
              {
                title: "Reboot-aware",
                body: "If you opted in, Sleepr can restore the ticker after the phone restarts.",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="bg-nd-surface border border-nd-border p-6"
              >
                <h3 className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-display mb-3">
                  {card.title}
                </h3>
                <p className="text-sm text-nd-text-secondary leading-relaxed">
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="learning"
        className="py-24 md:py-32 border-b border-nd-border"
      >
        <div className="container px-4 mx-auto max-w-5xl">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            03 / Learning
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-nd-text-display tracking-[-0.02em] mb-6">
            Learns the quiet way.
          </h2>
          <p className="text-nd-text-secondary text-base max-w-2xl mb-12 leading-relaxed">
            Sleepr can learn from rough sleep and wake signals without turning
            your night into a logging chore. Screen-off, screen-on, and morning
            ratings become gentle evidence for better guidance.
          </p>

          <div className="bg-nd-surface border border-nd-border p-6 md:p-8">
            <div className="grid gap-8 md:grid-cols-[0.85fr_1fr]">
              <div>
                <Sparkles className="mb-5 h-7 w-7 text-nd-accent" />
                <h3 className="font-body text-xl font-bold text-nd-text-display mb-3">
                  Personal cycle estimate
                </h3>
                <p className="text-sm text-nd-text-secondary leading-relaxed">
                  The default 90-minute cycle is a starting point. Sleepr is
                  built to move toward your actual mornings as it gathers enough
                  local evidence.
                </p>
              </div>
              <div className="grid gap-3">
                {[
                  "Screen usage learning is opt-in through Android settings",
                  "Morning ratings keep the feedback loop simple",
                  "Cycle tuning improves slowly instead of overfitting one bad night",
                ].map((item) => (
                  <div
                    key={item}
                    className="border border-nd-border-visible px-4 py-3 font-mono text-[12px] text-nd-text-secondary"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="privacy" className="py-24 md:py-32 border-b border-nd-border">
        <div className="container px-4 mx-auto max-w-5xl">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            04 / Privacy
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-nd-text-display tracking-[-0.02em] mb-6">
            Sleep data should not become another account.
          </h2>
          <p className="text-nd-text-secondary text-base max-w-2xl mb-12 leading-relaxed">
            Sleepr is shaped around local guidance. The parts that know your
            schedule live on the phone.
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {privacyCards.map((card) => (
              <div
                key={card.title}
                className="bg-nd-surface border border-nd-border p-6"
              >
                <h3 className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-display mb-3">
                  {card.title}
                </h3>
                <p className="text-sm text-nd-text-secondary leading-relaxed">
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="tech" className="py-24 md:py-32 border-b border-nd-border">
        <div className="container px-4 mx-auto max-w-5xl">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            05 / Build
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-nd-text-display tracking-[-0.02em] mb-10">
            Native Android, built for the phone.
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {techStack.map((item) => (
              <div
                key={item.name}
                className="border border-nd-border bg-nd-surface p-5"
              >
                <h3 className="font-mono text-[12px] uppercase tracking-label text-nd-text-display mb-2">
                  {item.name}
                </h3>
                <p className="text-sm text-nd-text-secondary leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="get-the-app" className="py-24 md:py-32">
        <div className="container px-4 mx-auto max-w-5xl text-center">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            06 / Android
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-nd-text-display tracking-[-0.02em] mb-4">
            Sleepr is coming to Android.
          </h2>
          <p className="text-nd-text-secondary text-base max-w-lg mx-auto mb-10">
            Built as a quiet local-first app for bedtime planning, wake-window
            guidance, and personal cycle learning.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <span className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-nd-text-display text-nd-black font-mono text-[13px] font-bold tracking-[0.06em] uppercase rounded-full min-h-[44px]">
              <Smartphone className="w-4 h-4" />
              Android app
            </span>
            <span className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-transparent border border-nd-border-visible text-nd-text-primary font-mono text-[13px] font-bold tracking-[0.06em] uppercase rounded-full min-h-[44px]">
              Launch page in progress
            </span>
          </div>
        </div>
      </section>
    </CasePageShell>
  );
}
