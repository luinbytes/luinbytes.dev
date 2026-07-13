"use client";

import Link from "next/link";
import {
  CasePageShell,
  SectionRail,
  useActiveSection,
} from "@/components/case-page-parts";

type Section = {
  id: string;
  title: string;
  body: React.ReactNode;
};

const SECTIONS: Section[] = [
  {
    id: "data-we-collect",
    title: "// DATA_WE_COLLECT",
    body: (
      <>
        <p>
          Meteor stores your tasks, habits, completions, and preferences locally on your device using
          Android <span className="font-mono text-nd-text-display">Room</span> and{" "}
          <span className="font-mono text-nd-text-display">DataStore</span>. This data never leaves
          your device under normal operation.
        </p>
        <p className="text-nd-text-secondary">
          Meteor does <span className="text-nd-text-primary">not</span> collect personal information,
          usage analytics, advertising IDs, location data, contacts, camera, or microphone access.
        </p>
      </>
    ),
  },
  {
    id: "crash-reporting",
    title: "// CRASH_REPORTING",
    body: (
      <>
        <p>
          Release builds include <span className="font-mono text-nd-text-display">Sentry</span> for
          anonymised crash reports. A crash report contains the stack trace, your device model,
          Android version, and the Meteor app version.
        </p>
        <p className="text-nd-text-secondary">
          Crash reports do not include personal data, account identifiers, or the contents of your
          tasks and habits. Sentry is operated by Functional Software, Inc.
        </p>
      </>
    ),
  },
  {
    id: "purchases-and-billing",
    title: "// PURCHASES_AND_BILLING",
    body: (
      <>
        <p>
          Meteor Pro subscriptions are processed entirely by Google Play. We never see or store
          payment information.
        </p>
        <p className="text-nd-text-secondary">
          Google&apos;s privacy policy applies to all billing data and is available at
          policies.google.com.
        </p>
      </>
    ),
  },
  {
    id: "data-export",
    title: "// DATA_EXPORT",
    body: (
      <>
        <p>
          You can export all of your Meteor data as a JSON file at any time from{" "}
          <span className="font-mono text-nd-text-display">Settings → Export data</span>.
        </p>
        <p className="text-nd-text-secondary">
          Exports are stored locally on your device and only shared if you explicitly choose to
          share them.
        </p>
      </>
    ),
  },
  {
    id: "retention-and-deletion",
    title: "// RETENTION_AND_DELETION",
    body: (
      <>
        <p>
          All Meteor data is local. Uninstalling the app removes everything Meteor has stored on
          your device.
        </p>
        <p className="text-nd-text-secondary">
          There is nothing for us to delete on our end — we never receive a copy of your tasks,
          habits, or preferences.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "// CHILDREN",
    body: (
      <p>
        Meteor is not directed at children under 13. We do not knowingly collect data from
        children.
      </p>
    ),
  },
  {
    id: "changes",
    title: "// CHANGES",
    body: (
      <>
        <p>
          Updates to this policy will be posted at this URL with a revised date at the top of the
          page.
        </p>
        <p className="text-nd-text-secondary">
          Significant changes will additionally be noted in the Play Store release notes for the
          version that introduces them.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "// CONTACT",
    body: (
      <p>
        Questions about this policy can be sent to{" "}
        <a
          href="mailto:0x6c75@protonmail.com"
          className="font-mono text-nd-accent underline-offset-4 hover:underline"
        >
          0x6c75@protonmail.com
        </a>
        .
      </p>
    ),
  },
];

const SECTION_NAV = SECTIONS.map(({ id, title }) => ({
  id,
  label: title.replaceAll("_", " ").replace("// ", ""),
}));

export function MeteorPrivacyPage() {
  const activeSection = useActiveSection(SECTION_NAV);

  return (
    <CasePageShell variant="privacy">
      <SectionRail sections={SECTION_NAV} activeSection={activeSection} />
      <article className="mx-auto w-full max-w-[680px] px-6 py-20 sm:py-28">
        <Link
          href="/meteor"
          className="font-mono text-sm text-nd-text-secondary transition-colors hover:text-nd-accent"
        >
          ← Back
        </Link>

        <header className="mt-12">
          <p className="font-mono text-sm uppercase tracking-[0.2em] text-nd-accent">METEOR</p>
          <h1 className="mt-4 font-display text-5xl leading-tight text-nd-text-display sm:text-6xl">
            Privacy Policy
          </h1>
          <p className="mt-6 font-mono text-sm text-nd-text-secondary">
            Last updated: April 2026
          </p>
        </header>

        <hr className="mt-12 border-t border-nd-border" />

        <section className="mt-12 space-y-4 leading-relaxed">
          <p>
            Meteor is a task and habit tracking app for Android. This policy describes what data
            the app collects (very little), where it stays (on your device), and what we share
            (nothing).
          </p>
        </section>

        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="mt-14 scroll-mt-24">
            <hr className="mb-12 border-t border-nd-border" />
            <h2 className="font-mono text-sm uppercase tracking-[0.2em] text-nd-accent">
              {section.title}
            </h2>
            <div className="mt-6 space-y-4 leading-relaxed">{section.body}</div>
          </section>
        ))}

        <hr className="mt-16 border-t border-nd-border" />

        <footer className="mt-10 font-mono text-xs uppercase tracking-[0.2em] text-nd-text-disabled">
          luinbytes / meteor / privacy
        </footer>
      </article>
    </CasePageShell>
  );
}
