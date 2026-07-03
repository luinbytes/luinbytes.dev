"use client";

import Link from "next/link";
import { CaseProofLoop, SectionRail, SegmentedStats, useActiveSection } from "@/components/case-page-parts";
import {
  Download,
  Shield,
  Flame,
  RefreshCw,
  PauseCircle,
  Smartphone,
  ArrowUpCircle,
  ListTodo,
  CheckCircle,
  Tag,
  CalendarDays,
  CheckSquare,
  Layout,
  Lock,
} from "lucide-react";

const SECTION_NAV = [
  { id: "overview", label: "Overview" },
  { id: "habits", label: "Habits" },
  { id: "tasks", label: "Tasks" },
  { id: "free-vs-pro", label: "Free vs Pro" },
  { id: "privacy", label: "Privacy" },
  { id: "get-the-app", label: "Get the app" },
] as const;

const habitFeatures = [
  {
    icon: Flame,
    title: "Streaks & Heatmap",
    description:
      "Track your consistency with a daily streak counter and a full calendar heatmap. See your history at a glance.",
    details: [
      "Track your longest streak and today's progress",
      "Calendar heatmap shows your full completion history",
      "Free: 30-day history · Pro: all time",
    ],
  },
  {
    icon: RefreshCw,
    title: "Flexible Cadences",
    description:
      "Set habits to repeat daily, on specific weekdays, X times per week, or every N days.",
    details: [
      "Daily, specific days of the week, X times per week, or every N days",
      "Set a daily target: tick once, or track multiple completions",
      "Per-habit reminder notifications",
    ],
  },
  {
    icon: PauseCircle,
    title: "Pause Without Penalty",
    description:
      "Life happens. Pause a habit temporarily — your streak stays intact.",
    details: [
      "Taking a break? Pause the habit so your streak survives",
      "Resume any time from the Today screen",
      "Works for holidays, illness, or just needing a rest",
    ],
  },
  {
    icon: Smartphone,
    title: "Home Screen Widget",
    description:
      "Quick-tap habit completions without opening the app.",
    details: [
      "Add Meteor to your home screen for one-tap habit tracking",
      "See today's habits and their completion state at a glance",
      "Tap any habit to complete it — no app launch needed",
    ],
  },
];

const taskFeatures = [
  {
    icon: ArrowUpCircle,
    title: "Three Priority Levels",
    description:
      "High, medium, and low priority. Tasks sort by priority within each due-date group.",
    details: [
      "Flag tasks as high, medium, or low priority",
      "High-priority and overdue tasks surface at the top",
      "Quick visual indicator on every task row",
    ],
  },
  {
    icon: ListTodo,
    title: "Subtasks & Notes",
    description:
      "Break tasks down and add context without leaving the edit screen.",
    details: [
      "Break big tasks into smaller steps with subtasks",
      "Add a note to any task for extra context",
      "Subtasks check off independently",
    ],
  },
  {
    icon: CheckCircle,
    title: "Swipe to Complete",
    description:
      "Swipe right to complete, swipe left to delete. Fast.",
    details: [
      "Swipe right on any task to mark it done",
      "Swipe left to delete",
      "Gentle haptic feedback on every action",
    ],
  },
  {
    icon: Tag,
    title: "Tags & Search",
    description:
      "Tag tasks for quick filtering. Search across everything.",
    details: [
      "Label tasks with tags to group related work",
      "Search across task titles, notes, and tags",
      "Filter the list by any tag",
    ],
  },
];

const insideFeatures = [
  { icon: CalendarDays, label: "Habit streaks & heatmap" },
  { icon: CheckSquare, label: "Task list with priorities" },
  { icon: Layout, label: "Unified today view" },
  { icon: Smartphone, label: "Home screen widget" },
  { icon: Lock, label: "Your data stays on your phone" },
];

const privacyCards = [
  {
    title: "Stays on your phone",
    body: "Tasks, habits, and completions are stored locally on your device. Nothing is sent to the cloud. Nothing is shared with third parties.",
  },
  {
    title: "No account required",
    body: "Download and start. No sign-up, no email, no password. Your data is tied to your device, not a server.",
  },
  {
    title: "Export any time",
    body: "Settings → Export data saves a full JSON backup you can keep, share, or import into anything you build.",
  },
  {
    title: "Crash reports only",
    body: "The release app sends anonymous crash reports to Sentry if it crashes (device model, app version, stack trace — no personal data, no task or habit content).",
  },
];

type ComparisonRow = {
  label: string;
  free: string;
  pro: string;
};

const comparisonRows: ComparisonRow[] = [
  { label: "Unlimited tasks", free: "yes", pro: "yes" },
  { label: "Up to 3 habits", free: "yes", pro: "unlimited" },
  { label: "Streak history (30 days)", free: "yes", pro: "yes" },
  { label: "Full heatmap history", free: "no", pro: "yes" },
  { label: "Home-screen widget", free: "yes", pro: "yes" },
  { label: "Multiple widget styles", free: "no", pro: "yes" },
  { label: "Tags, search, subtasks", free: "yes", pro: "yes" },
  { label: "Custom accent themes", free: "no", pro: "yes" },
  { label: "Brutalist monospace theme", free: "no", pro: "yes" },
  { label: "Data export (JSON)", free: "yes", pro: "yes" },
  { label: "No account required", free: "yes", pro: "yes" },
  { label: "No ads", free: "yes", pro: "yes" },
];

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.luinbytes.meteor";

function ComparisonCell({ value }: { value: string }) {
  if (value === "yes") {
    return <span className="text-nd-success font-mono text-sm">✓</span>;
  }
  if (value === "no") {
    return (
      <span className="text-nd-text-disabled font-mono text-sm">—</span>
    );
  }
  if (value === "unlimited") {
    return (
      <span className="text-nd-text-display font-mono text-sm">
        ✓ (unlimited)
      </span>
    );
  }
  return <span className="text-nd-text-secondary font-mono text-sm">{value}</span>;
}

export function MeteorPage() {
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
                  Android App
                </span>
                <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-success border border-nd-success/30 px-2 py-1 rounded-full">
                  Freemium
                </span>
              </div>

              <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold text-nd-text-display leading-[1.0] tracking-[-0.03em] mb-6">
                Meteor<span className="text-nd-accent">.</span>
              </h1>

              <p className="text-nd-text-secondary text-base md:text-lg max-w-2xl leading-relaxed mb-10">
                Tasks and habits, unified. A clean daily surface for what you need
                to do and the routines you want to keep — without switching apps.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <a
                  href={PLAY_STORE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-nd-text-display text-nd-black font-mono text-[13px] font-bold tracking-[0.06em] uppercase rounded-full nd-transition hover:opacity-80 min-h-[44px]"
                >
                  <Download className="w-4 h-4" />
                  Get on Google Play
                </a>
                <Link
                  href="/meteor/privacy"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-transparent border border-nd-border-visible text-nd-text-primary font-mono text-[13px] font-bold tracking-[0.06em] uppercase rounded-full nd-transition hover:border-nd-text-secondary min-h-[44px]"
                >
                  <Shield className="w-4 h-4" />
                  Privacy Policy
                </Link>
              </div>
            </div>

            {/* Right column — what's inside */}
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
                      No account. No cloud. No ads.
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
                  label: "Platform",
                  value: "Android",
                  total: 1,
                  filled: 1,
                  accentFrom: -1,
                },
                {
                  label: "Themes",
                  value: "2",
                  total: 2,
                  filled: 2,
                  accentFrom: -1,
                },
                {
                  label: "Free habits",
                  value: "3",
                  total: 3,
                  filled: 3,
                  accentFrom: -1,
                },
                {
                  label: "Local-first",
                  value: "100%",
                  total: 10,
                  filled: 10,
                  accentFrom: 0,
                },
              ] as const
            } />
          </div>
        </div>
      </section>

      <CaseProofLoop
        steps={[
          { label: "Problem", value: "Tasks and habits split the daily view." },
          { label: "Build", value: "One Android surface for tasks, habits, widgets, and reminders." },
          { label: "Verify", value: "Room, WorkManager, and privacy sections document the local path." },
          { label: "Ship", value: "Play Store app with no account requirement." },
        ]}
      />

      {/* Habits */}
      <section id="habits" className="py-24 md:py-32 border-b border-nd-border">
        <div className="container px-4 mx-auto max-w-5xl">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            01 / Habits
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-nd-text-display tracking-[-0.02em] mb-6">
            Build routines that actually stick.
          </h2>
          <p className="text-nd-text-secondary text-base max-w-xl mb-16">
            Habits in Meteor are first-class, not glorified recurring tasks.
          </p>

          <div className="space-y-16">
            {habitFeatures.map((feature) => {
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

      {/* Tasks */}
      <section id="tasks" className="py-24 md:py-32 border-b border-nd-border">
        <div className="container px-4 mx-auto max-w-5xl">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            02 / Tasks
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-nd-text-display tracking-[-0.02em] mb-6">
            A task list that doesn&apos;t get in your way.
          </h2>
          <p className="text-nd-text-secondary text-base max-w-xl mb-16">
            Unlimited tasks, always free. Priority, subtasks, notes, and due
            dates — everything that matters, free.
          </p>

          <div className="space-y-16">
            {taskFeatures.map((feature) => {
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

      {/* Free vs Pro */}
      <section
        id="free-vs-pro"
        className="py-24 md:py-32 border-b border-nd-border"
      >
        <div className="container px-4 mx-auto max-w-5xl">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            03 / Free vs Pro
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-nd-text-display tracking-[-0.02em] mb-6">
            One paywall. No dark patterns.
          </h2>
          <p className="text-nd-text-secondary text-base max-w-2xl mb-12 leading-relaxed">
            The only limit on free is 3 habits. Everything else — unlimited
            tasks, search, subtasks, tags, widget, data export — is fully
            unlocked with no account required.
          </p>

          <div className="bg-nd-surface border border-nd-border overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-nd-border">
                  <th className="text-left font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled py-4 px-6 font-normal">
                    Feature
                  </th>
                  <th className="text-center font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-display py-4 px-6 font-normal w-32">
                    Free
                  </th>
                  <th className="text-center font-mono text-[11px] tracking-[0.08em] uppercase text-nd-accent py-4 px-6 font-normal w-32">
                    Pro
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr
                    key={row.label}
                    className={
                      i < comparisonRows.length - 1
                        ? "border-b border-nd-border"
                        : ""
                    }
                  >
                    <td className="text-sm text-nd-text-secondary py-3 px-6">
                      {row.label}
                    </td>
                    <td className="text-center py-3 px-6">
                      <ComparisonCell value={row.free} />
                    </td>
                    <td className="text-center py-3 px-6">
                      <ComparisonCell value={row.pro} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="font-mono text-nd-text-disabled text-[11px] mt-4">
            Meteor Pro: $2.99 / month or $19.99 / year.
          </p>
        </div>
      </section>

      {/* Privacy */}
      <section id="privacy" className="py-24 md:py-32 border-b border-nd-border">
        <div className="container px-4 mx-auto max-w-5xl">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            04 / Privacy
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-nd-text-display tracking-[-0.02em] mb-6">
            Your data is yours.
          </h2>
          <p className="text-nd-text-secondary text-base max-w-2xl mb-12 leading-relaxed">
            Meteor is local-first. Everything you add stays on your device — we
            have no servers to breach and no accounts to lose.
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

      {/* Get the app */}
      <section id="get-the-app" className="py-24 md:py-32">
        <div className="container px-4 mx-auto max-w-5xl text-center">
          <span className="font-mono text-[11px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-4">
            05 / Download
          </span>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-nd-text-display tracking-[-0.02em] mb-4">
            Get Meteor.
          </h2>
          <p className="text-nd-text-secondary text-base max-w-lg mx-auto mb-10">
            Available on Google Play. Free to start — unlimited tasks and 3
            habits included. Upgrade to Pro for unlimited habits, full heatmap
            history, and custom themes.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-nd-text-display text-nd-black font-mono text-[13px] font-bold tracking-[0.06em] uppercase rounded-full nd-transition hover:opacity-80 min-h-[44px]"
            >
              <Download className="w-4 h-4" />
              Get on Google Play
            </a>
            <Link
              href="/meteor/privacy"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-transparent border border-nd-border-visible text-nd-text-primary font-mono text-[13px] font-bold tracking-[0.06em] uppercase rounded-full nd-transition hover:border-nd-text-secondary min-h-[44px]"
            >
              <Shield className="w-4 h-4" />
              Privacy Policy
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default MeteorPage;
