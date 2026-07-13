"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { journeyChapters, problemBuilds } from "@/lib/homepage";
import { cn } from "@/lib/utils";

type ScrollJourneyProps = {
  children: ReactNode;
};

type JourneyProblemEvent = CustomEvent<string>;

const chapterIds = journeyChapters.map((chapter) => chapter.id);

function isJourneyProblemEvent(event: Event): event is JourneyProblemEvent {
  return "detail" in event && typeof (event as JourneyProblemEvent).detail === "string";
}

export function ScrollJourney({ children }: ScrollJourneyProps) {
  const prefersReducedMotion = useReducedMotion();
  const [activeChapterId, setActiveChapterId] = useState(journeyChapters[0].id);
  const [activeProblemId, setActiveProblemId] = useState(problemBuilds[0]?.id ?? "");
  const [scrollProgress, setScrollProgress] = useState(0);

  const activeChapter =
    journeyChapters.find((chapter) => chapter.id === activeChapterId) ??
    journeyChapters[0];
  const activeProblem = problemBuilds.find((problem) => problem.id === activeProblemId);

  const readout = useMemo(() => {
    if (activeChapter.id === "builds" && activeProblem) {
      return {
        mode: activeChapter.mode,
        surface: activeProblem.filters.slice(0, 2).join("/"),
        active: activeProblem.buildName,
        signal: "problem -> build -> outcome",
      };
    }

    return {
      mode: activeChapter.mode,
      surface: activeChapter.surface,
      active: activeChapter.active,
      signal: activeChapter.signal,
    };
  }, [activeChapter, activeProblem]);

  useEffect(() => {
    const updateProgress = () => {
      const scrollableHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (scrollableHeight <= 0) {
        setScrollProgress(0);
        return;
      }

      setScrollProgress(
        Math.min(1, Math.max(0, window.scrollY / scrollableHeight))
      );
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  useEffect(() => {
    const sections = chapterIds
      .map((id) => document.querySelector(`[data-journey-section="${id}"]`))
      .filter((section): section is Element => Boolean(section));

    if (sections.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        const nextId = visible?.target.getAttribute("data-journey-section");
        if (nextId && chapterIds.includes(nextId as (typeof chapterIds)[number])) {
          setActiveChapterId(nextId as (typeof chapterIds)[number]);
        }
      },
      {
        root: null,
        rootMargin: "-30% 0px -45% 0px",
        threshold: [0.1, 0.25, 0.5, 0.75],
      }
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const handleProblemChange = (event: Event) => {
      if (!isJourneyProblemEvent(event)) {
        return;
      }

      if (problemBuilds.some((problem) => problem.id === event.detail)) {
        setActiveProblemId(event.detail);
      }
    };

    window.addEventListener("lu:journey-problem-change", handleProblemChange);
    return () =>
      window.removeEventListener("lu:journey-problem-change", handleProblemChange);
  }, []);

  const scrollToChapter = (id: string) => {
    document.querySelector(`[data-journey-section="${id}"]`)?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  };

  return (
    <>
      {children}
      <aside
        aria-label="Homepage journey"
        className="atlas-paper print-shadow-lg !fixed left-4 top-24 z-40 hidden w-[218px] border-2 border-nd-border-visible bg-nd-surface p-3 nd-transition min-[1536px]:block 2xl:left-8"
      >
        <div className="mb-3 flex items-center justify-between border-b-2 border-nd-border-visible pb-3 font-mono text-[10px] uppercase tracking-label text-nd-text-secondary">
          <span>Field Route</span>
          <span>{Math.round(scrollProgress * 100).toString().padStart(2, "0")}%</span>
        </div>

        <div className="mb-4 h-2 border border-nd-border-visible bg-nd-black">
          <div
            className="h-full bg-nd-accent nd-transition"
            style={{ width: `${scrollProgress * 100}%` }}
          />
        </div>

        <nav className="space-y-1">
          {journeyChapters.map((chapter) => {
            const isActive = chapter.id === activeChapter.id;

            return (
              <button
                key={chapter.id}
                type="button"
                onClick={() => scrollToChapter(chapter.id)}
                className={cn(
                  "grid w-full grid-cols-[18px_1fr] items-center gap-2 border border-transparent px-2 py-2 text-left font-mono text-[10px] uppercase tracking-label-tight nd-focus nd-transition",
                  isActive
                    ? "print-shadow-xs border-nd-border-visible bg-nd-text-display text-nd-black"
                    : "text-nd-text-secondary hover:border-nd-border-visible hover:bg-nd-surface-raised hover:text-nd-text-primary"
                )}
                aria-current={isActive ? "location" : undefined}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 border border-current",
                    isActive ? "bg-nd-accent text-nd-accent" : "text-nd-border-visible"
                  )}
                />
                {chapter.label}
              </button>
            );
          })}
        </nav>

        <dl className="mt-4 border-t-2 border-nd-border-visible pt-3 font-mono text-[10px] uppercase tracking-label-tight">
          {[
            ["mode", readout.mode],
            ["surface", readout.surface],
            ["active", readout.active],
            ["signal", readout.signal],
          ].map(([label, value]) => (
            <div key={label} className="grid grid-cols-[4.4rem_1fr] gap-2 py-1.5">
              <dt className="text-nd-text-disabled">{label}</dt>
              <dd className="truncate text-nd-text-primary" title={value}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </aside>
    </>
  );
}
