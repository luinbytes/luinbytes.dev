"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";
import { problemBuilds } from "@/lib/homepage";
import { cn } from "@/lib/utils";
import { ScrollReveal } from "@/components/animations/scroll-reveal";

export function ProblemIndex() {
  const [selectedId, setSelectedId] = useState(problemBuilds[0]?.id ?? "");
  const rowRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedIndex = useMemo(
    () => Math.max(0, problemBuilds.findIndex((item) => item.id === selectedId)),
    [selectedId]
  );
  const selected = problemBuilds[selectedIndex] ?? problemBuilds[0];

  useEffect(() => {
    if (!selected) {
      return;
    }

    window.dispatchEvent(
      new CustomEvent("lu:journey-problem-change", { detail: selected.id })
    );
  }, [selected]);

  if (!selected) {
    return null;
  }

  const moveSelection = (direction: 1 | -1) => {
    const nextIndex =
      (selectedIndex + direction + problemBuilds.length) % problemBuilds.length;
    const next = problemBuilds[nextIndex];

    setSelectedId(next.id);
    rowRefs.current[nextIndex]?.focus();
  };

  return (
    <section
      id="builds"
      data-journey-section="builds"
      className="relative border-b border-nd-border py-20 md:py-28"
    >
      <div className="absolute inset-y-10 left-1/2 hidden w-px bg-nd-border md:block" />
      <div className="container mx-auto max-w-7xl px-4">
        <ScrollReveal className="mb-8 flex items-end justify-between gap-6">
          <div>
            <span className="mb-4 block font-mono text-[11px] uppercase tracking-label text-nd-accent">
              01 / Problems I Refused To Accept
            </span>
            <h2 className="max-w-3xl font-display text-4xl font-bold leading-[0.95] tracking-normal text-nd-text-display md:text-6xl">
              The annoying parts became the roadmap.
            </h2>
          </div>
          <p className="hidden max-w-sm text-sm leading-relaxed text-nd-text-secondary md:block">
            Select a problem to see the build, stack, and outcome. The range is
            the point: different surfaces, same reflex.
          </p>
        </ScrollReveal>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(420px,1fr)]">
          <ScrollReveal
            role="tablist"
            aria-label="Problems I refused to accept"
            aria-orientation="vertical"
            className="atlas-paper print-shadow-lg border-2 border-nd-border-visible bg-nd-surface"
          >
            {problemBuilds.map((item, index) => {
              const Icon = item.icon;
              const isSelected = item.id === selected.id;

              return (
                <button
                  id={`problem-tab-${item.id}`}
                  key={item.id}
                  ref={(node) => {
                    rowRefs.current[index] = node;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls={`problem-panel-${item.id}`}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => setSelectedId(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      moveSelection(1);
                    }

                    if (event.key === "ArrowUp") {
                      event.preventDefault();
                      moveSelection(-1);
                    }
                  }}
                  className={cn(
                    "atlas-scanline group grid w-full grid-cols-[52px_1fr_28px] items-center gap-4 border-b border-nd-border p-4 text-left nd-transition last:border-b-0 hover:pl-6 md:grid-cols-[72px_1fr_40px] md:p-5 md:hover:pl-7",
                    isSelected
                      ? "bg-nd-text-display text-nd-black"
                      : "bg-transparent text-nd-text-secondary hover:bg-nd-surface-raised hover:text-nd-text-primary"
                  )}
                >
                  <span
                    className={cn(
                      "atlas-icon flex aspect-square items-center justify-center border nd-transition",
                      isSelected
                        ? "border-nd-accent bg-nd-accent text-nd-surface"
                        : "border-nd-border-visible text-nd-text-disabled group-hover:text-nd-text-primary"
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.5} />
                  </span>
                  <span>
                    <span className="mb-1 block font-mono text-[10px] uppercase tracking-label text-nd-text-disabled">
                      {item.index} / Problem
                    </span>
                    <span className="block text-base font-medium leading-snug md:text-lg">
                      {item.problem}
                    </span>
                  </span>
                  <ArrowRight
                    className={cn(
                      "atlas-arrow h-4 w-4 nd-transition",
                      isSelected
                        ? "translate-x-0 text-nd-accent"
                        : "text-nd-text-disabled group-hover:translate-x-1 group-hover:text-nd-text-primary"
                    )}
                  />
                </button>
              );
            })}
          </ScrollReveal>

          <ScrollReveal
            delay={0.08}
            className="atlas-mark atlas-paper print-shadow-lg min-h-[420px] border-2 border-nd-border-visible bg-nd-surface"
          >
            {problemBuilds.map((item) => {
              const DetailIcon = item.icon;
              const isSelected = item.id === selected.id;

              return (
                <article
                  id={`problem-panel-${item.id}`}
                  key={item.id}
                  role="tabpanel"
                  aria-labelledby={`problem-tab-${item.id}`}
                  hidden={!isSelected}
                  tabIndex={isSelected ? 0 : -1}
                  className="p-6 md:p-8"
                >
                  <div className="mb-8 flex items-start justify-between gap-6">
                    <div>
                      <span className="mb-3 block font-mono text-[11px] uppercase tracking-label text-nd-text-disabled">
                        Selected build
                      </span>
                      <h3 className="font-body text-3xl font-bold leading-tight tracking-normal text-nd-text-display md:text-5xl">
                        {item.buildName}
                      </h3>
                    </div>
                    <span className="print-shadow-strong flex h-14 w-14 shrink-0 items-center justify-center border-2 border-nd-accent bg-nd-accent text-nd-surface">
                      <DetailIcon className="h-6 w-6" strokeWidth={1.5} />
                    </span>
                  </div>

                  <div className="grid gap-8 md:grid-cols-[1fr_0.85fr]">
                    <div>
                      <p className="text-base leading-relaxed text-nd-text-primary md:text-lg">
                        {item.summary}
                      </p>
                      <p className="mt-5 text-sm leading-relaxed text-nd-text-secondary">
                        {item.outcome}
                      </p>
                    </div>

                    <div>
                      <span className="mb-3 block font-mono text-[11px] uppercase tracking-label text-nd-text-disabled">
                        Stack
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {item.tech.map((tech) => (
                          <span
                            key={tech}
                            className="border border-nd-border-visible bg-nd-black/60 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-label-tight text-nd-text-secondary"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-10 flex flex-col gap-3 border-t border-nd-border pt-6 sm:flex-row">
                    <Link
                      href={item.href}
                      className="atlas-scanline print-shadow-sm inline-flex min-h-[44px] items-center justify-center gap-2 border-2 border-nd-text-display bg-nd-text-display px-5 py-3 font-mono text-[12px] font-bold uppercase tracking-label-tight text-nd-black nd-transition hover:-translate-y-0.5"
                    >
                      View build
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    {item.sourceHref && (
                      <a
                        href={item.sourceHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 border-2 border-nd-border-visible bg-nd-surface px-5 py-3 font-mono text-[12px] font-bold uppercase tracking-label-tight text-nd-text-primary nd-transition hover:-translate-y-0.5 hover:bg-nd-surface-raised"
                      >
                        Source
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
