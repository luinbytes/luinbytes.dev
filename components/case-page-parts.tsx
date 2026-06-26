"use client";

import { useEffect, useState } from "react";

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
              className={`w-1.5 h-1.5 rounded-full nd-transition ${
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
