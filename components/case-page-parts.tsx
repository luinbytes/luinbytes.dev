"use client";

import { useEffect, useState } from "react";
import styles from "./case-page.module.css";

type SectionItem = {
  id: string;
  label: string;
};

type SegmentedStat = {
  label: string;
  value: string;
  total: number;
  filled: number;
  accentFrom?: number;
};

export type CaseProofLoopStep = {
  label: "Problem" | "Build" | "Verify" | "Ship";
  value: string;
};

export type CasePageVariant =
  | "meteor"
  | "sleepr"
  | "linux"
  | "risk"
  | "brc"
  | "dagger"
  | "golf"
  | "privacy";

export function CasePageShell({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: CasePageVariant;
}) {
  return (
    <div className={styles.casePage} data-case-variant={variant}>
      {children}
    </div>
  );
}

export function useActiveSection(sections: readonly SectionItem[]) {
  const [activeSection, setActiveSection] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);

        if (visible[0]) setActiveSection(visible[0].target.id);
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  return activeSection;
}

export function SectionRail({
  sections,
  activeSection,
}: {
  sections: readonly SectionItem[];
  activeSection: string;
}) {
  return (
    <nav
      aria-label="Page sections"
      className="hidden lg:flex fixed left-6 top-1/2 -translate-y-1/2 z-40 flex-col gap-5"
    >
      {sections.map((item) => {
        const isActive = activeSection === item.id;
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="group flex items-center gap-3 nd-transition"
            aria-current={isActive ? "true" : undefined}
          >
            <span
              className={`h-2 w-2 border border-dark-brown nd-transition ${
                isActive ? "bg-nd-accent" : "bg-nd-border-visible"
              }`}
            />
            <span
              className={`font-mono text-[10px] tracking-[0.08em] uppercase nd-transition ${
                isActive
                  ? "text-nd-text-display opacity-100"
                  : "text-nd-text-disabled opacity-0 group-hover:opacity-100"
              }`}
            >
              {item.label}
            </span>
          </a>
        );
      })}
    </nav>
  );
}

export function SegmentedStats({ stats }: { stats: readonly SegmentedStat[] }) {
  return (
    <>
      {stats.map((stat) => (
        <div key={stat.label}>
          <span className="font-mono text-[10px] tracking-[0.08em] uppercase text-nd-text-disabled block mb-2">
            {stat.label}
          </span>
          <span className="font-display text-3xl md:text-4xl font-bold text-nd-text-display block mb-3">
            {stat.value}
          </span>
          <div className="nd-segmented-bar h-1.5 w-full">
            {Array.from({ length: stat.total }).map((_, i) => {
              const isFilled = i < stat.filled;
              const accentFrom = stat.accentFrom ?? -1;
              const isAccent = accentFrom >= 0 && i >= accentFrom;
              const classes = ["segment", "flex-1"];
              if (isFilled && !isAccent) classes.push("filled");
              if (isAccent) classes.push("accent");
              return <span key={i} className={classes.join(" ")} />;
            })}
          </div>
        </div>
      ))}
    </>
  );
}

export function CaseProofLoop({
  title = "Proof loop",
  steps,
}: {
  title?: string;
  steps: readonly CaseProofLoopStep[];
}) {
  return (
    <section
      className="border-b border-nd-border px-4 pb-28 pt-12 md:py-12"
      aria-labelledby="case-proof-title"
    >
      <div className="mx-auto max-w-5xl xl:ml-28 xl:mr-[22rem] xl:max-w-[52rem]">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-label text-nd-accent">
              Case proof
            </p>
            <h2
              id="case-proof-title"
              className="mt-2 font-display text-2xl font-bold leading-tight text-nd-text-display md:text-3xl"
            >
              {title}
            </h2>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {steps.map((step, index) => (
            <article
              key={step.label}
              className="border border-nd-border bg-nd-surface/72 p-4"
            >
              <p className="font-mono text-[10px] uppercase tracking-label-tight text-nd-accent">
                {String(index + 1).padStart(2, "0")} {step.label}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-nd-text-primary">
                {step.value}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
