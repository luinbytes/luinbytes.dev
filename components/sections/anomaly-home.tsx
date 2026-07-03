"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Command,
  ExternalLink,
  Filter,
  Mail,
  Shuffle,
} from "lucide-react";
import {
  commandFilters,
  contactLinks,
  originLines,
  problemBuilds,
  proofLoopSteps,
  workbenchItems,
} from "@/lib/homepage";
import { cn } from "@/lib/utils";
import { CommandShortcut } from "@/components/os-shortcut";
import { HomeCommandChoreography } from "@/components/animations/home-command-choreography";

const allFilter = { label: "All", value: "all", icon: Filter };
const filters = [allFilter, ...commandFilters];

export function AnomalyHome() {
  const prefersReducedMotion = useReducedMotion();
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(problemBuilds[0].id);
  const [query, setQuery] = useState("");
  const [activeProofStep, setActiveProofStep] = useState(0);
  const [surprise, setSurprise] = useState(false);
  const [attention, setAttention] = useState(false);
  const attentionTimeoutRef = useRef<number | null>(null);
  const attentionResetRef = useRef<number | null>(null);

  const visibleBuilds = useMemo(() => {
    const search = query.trim().toLowerCase();

    return problemBuilds.filter((build) => {
      const filterMatches =
        activeFilter === "all" || build.filters.includes(activeFilter);
      const searchMatches =
        !search ||
        [
          build.problem,
          build.buildName,
          build.shortName,
          build.summary,
          build.outcome,
          ...build.tech,
          ...build.filters,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search);

      return filterMatches && searchMatches;
    });
  }, [activeFilter, query]);

  const selected =
    visibleBuilds.find((build) => build.id === selectedId) ??
    visibleBuilds[0] ??
    problemBuilds[0];
  const SelectedIcon = selected.icon;
  const selectedProofLoop = [
    { ...proofLoopSteps[0], value: selected.problem },
    { ...proofLoopSteps[1], value: selected.shortName },
    { ...proofLoopSteps[2], value: selected.sourceHref ? "Source linked" : "Case documented" },
    { ...proofLoopSteps[3], value: "Open case" },
  ];

  const openCommandMenu = () => {
    window.dispatchEvent(new CustomEvent("lu:open-command-menu"));
  };

  const cueActiveCase = (delay = 0) => {
    if (attentionTimeoutRef.current) {
      window.clearTimeout(attentionTimeoutRef.current);
    }
    if (attentionResetRef.current) {
      window.clearTimeout(attentionResetRef.current);
    }

    attentionTimeoutRef.current = window.setTimeout(() => {
      setAttention(true);
      attentionResetRef.current = window.setTimeout(() => {
        setAttention(false);
        attentionResetRef.current = null;
      }, 1200);
    }, delay);
  };

  const selectRandom = () => {
    const pool = visibleBuilds.length > 0 ? visibleBuilds : problemBuilds;
    const currentIndex = pool.findIndex((build) => build.id === selected.id);
    const next = pool[(currentIndex + 1) % pool.length];
    setSelectedId(next.id);
    setSurprise(true);
    cueActiveCase(120);
    window.setTimeout(() => setSurprise(false), 900);
  };

  const selectBuild = (id: string) => {
    setSelectedId(id);
    setActiveProofStep(0);
    document.getElementById("active-case")?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "center",
    });
    cueActiveCase(prefersReducedMotion ? 0 : 520);
  };

  const moveSelection = (direction: 1 | -1) => {
    const pool = visibleBuilds.length > 0 ? visibleBuilds : problemBuilds;
    const currentIndex = Math.max(
      0,
      pool.findIndex((build) => build.id === selected.id)
    );
    const next = pool[(currentIndex + direction + pool.length) % pool.length];
    setSelectedId(next.id);
    cueActiveCase(0);
  };

  useEffect(() => {
    return () => {
      if (attentionTimeoutRef.current) {
        window.clearTimeout(attentionTimeoutRef.current);
      }
      if (attentionResetRef.current) {
        window.clearTimeout(attentionResetRef.current);
      }
    };
  }, []);

  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-nd-black text-nd-text-primary">
      <HomeCommandChoreography />
      <div className="anomaly-backdrop" aria-hidden="true" />
      <main className="relative z-10">
        <section
          id="home"
          data-journey-section="home"
          className="relative overflow-hidden border-b border-nd-border px-4 py-6 sm:py-8"
        >
          <div className="mx-auto grid max-w-[92rem] gap-8 lg:grid-cols-[minmax(0,1.04fr)_minmax(390px,0.96fr)] lg:items-center">
            <div className="pt-6 md:pt-8">
              <div className="mb-6 flex flex-wrap items-center gap-3" data-command-intro>
                <span className="anomaly-chip">Verified shipped work</span>
                <button
                  type="button"
                  onClick={openCommandMenu}
                  className="anomaly-chip nd-focus hover:border-nd-accent hover:text-nd-text-display"
                >
                  <Command className="h-3.5 w-3.5" />
                  <CommandShortcut />
                </button>
              </div>

              <h1
                className="max-w-5xl text-balance font-display text-[clamp(2.85rem,6.55vw,6.6rem)] font-black leading-[0.84] tracking-normal text-nd-text-display"
                data-command-intro
              >
                I get annoyed,
                <span className="block text-nd-accent">then I build</span>
                the missing thing.
              </h1>

              <p
                className="mt-6 max-w-2xl text-base leading-relaxed text-nd-text-secondary md:text-lg"
                data-command-intro
              >
                AI-assisted execution across Android apps, Linux systems,
                reverse-engineering tools, automation, and utilities, turning
                messy technical work into verified shipped outcomes.
              </p>

              <div
                className="mt-7 rounded-[30px] border border-nd-border-visible/45 bg-nd-surface/72 p-3 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-2xl"
                data-primary-surface
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <label className="sr-only" htmlFor="hero-command-search">
                    Search shipped work
                  </label>
                  <input
                    id="hero-command-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search proof loop, stack, annoyance..."
                    className="min-h-[48px] flex-1 rounded-full border border-nd-border bg-nd-black/52 px-5 font-mono text-sm text-nd-text-display outline-none placeholder:text-nd-text-disabled focus:border-nd-accent"
                  />
                  <button
                    type="button"
                    onClick={openCommandMenu}
                    className="anomaly-button anomaly-button-secondary min-h-[48px] shrink-0"
                  >
                    Command
                    <Command className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-3 grid gap-2">
                  {(visibleBuilds.length > 0 ? visibleBuilds : problemBuilds)
                    .slice(0, 3)
                    .map((build, index) => {
                      const active = build.id === selected.id;
                      return (
                        <button
                          key={build.id}
                          type="button"
                          onClick={() => selectBuild(build.id)}
                          className={cn(
                            "grid min-h-[54px] grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-2xl border px-3 text-left nd-focus nd-transition",
                            active
                              ? "border-nd-accent/70 bg-nd-accent-subtle text-nd-text-display"
                              : "border-nd-border bg-nd-black/32 text-nd-text-secondary hover:border-nd-border-visible hover:text-nd-text-display"
                          )}
                        >
                          <span className="font-mono text-[10px] text-nd-text-disabled">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold">
                              {build.buildName}
                            </span>
                            <span className="mt-1 block truncate font-mono text-[10px] uppercase tracking-label-tight text-nd-accent">
                              {build.shortName}
                            </span>
                          </span>
                          <ArrowRight className="h-4 w-4 text-nd-accent" />
                        </button>
                      );
                    })}
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  {proofLoopSteps.map((step, index) => (
                    <div
                      key={step.label}
                      className="rounded-2xl border border-nd-border bg-nd-black/36 p-3"
                    >
                      <p className="font-mono text-[10px] uppercase tracking-label-tight text-nd-accent">
                        {String(index + 1).padStart(2, "0")} {step.label}
                      </p>
                      <p className="mt-2 text-xs leading-snug text-nd-text-secondary">
                        {step.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row" data-command-intro>
                <Link
                  href="#builds"
                  className="anomaly-button anomaly-button-primary"
                >
                  Inspect builds
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <button
                  type="button"
                  onClick={selectRandom}
                  className="anomaly-button anomaly-button-secondary"
                >
                  Surprise me
                  <Shuffle className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div
              id="active-case"
              data-active-case
              className={cn(
                "anomaly-lens min-h-[390px] p-4 sm:p-5",
                surprise && "anomaly-lens-pulse",
                attention && "anomaly-lens-attention"
              )}
            >
              <div className="mb-4 flex items-start justify-between gap-4 border-b border-nd-border pb-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-label text-nd-accent">
                    Active Case / Proof Loop
                  </p>
                  <h2 className="mt-2 text-3xl font-bold leading-none text-nd-text-display sm:text-4xl">
                    {selected.buildName}
                  </h2>
                  <p className="mt-2 max-w-xl font-mono text-[10px] uppercase tracking-label-tight text-nd-text-secondary">
                    {selected.shortName} / {selected.tech.slice(0, 3).join(" / ")}
                  </p>
                </div>
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-nd-border-visible/70 bg-nd-accent text-nd-black shadow-[0_18px_45px_rgba(255,131,183,0.24)]">
                  <SelectedIcon className="h-5 w-5" strokeWidth={1.8} />
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Case switchboard">
                {problemBuilds.slice(0, 6).map((build) => {
                  const Icon = build.icon;
                  return (
                    <button
                      key={build.id}
                      type="button"
                      onClick={() => selectBuild(build.id)}
                      className={cn(
                        "grid min-h-[66px] place-items-center gap-1 rounded-2xl border px-2 font-mono text-[9px] uppercase tracking-label-tight nd-focus nd-transition",
                        selected.id === build.id
                          ? "border-nd-accent bg-nd-accent text-nd-black"
                          : "border-nd-border bg-nd-black/38 text-nd-text-secondary hover:border-nd-border-visible hover:text-nd-text-display"
                      )}
                      aria-label={`Inspect ${build.buildName}`}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.6} />
                      <span className="max-w-full truncate">{build.index}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 grid gap-4 rounded-[28px] border border-nd-border bg-nd-black/58 p-4 backdrop-blur">
                <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-start">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-label-tight text-nd-accent">
                      Selected artifact
                    </p>
                    <p className="mt-2 text-xl font-bold leading-tight text-nd-text-display">
                      {selected.shortName}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-nd-text-secondary">
                      {selected.problem}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 lg:max-w-[13rem] lg:justify-end">
                    {selected.tech.map((tech) => (
                      <span key={tech} className="anomaly-tag">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-4 hidden grid-cols-2 gap-2 md:grid">
                {selectedProofLoop.map((step, index) => (
                  <div
                    key={step.label}
                    data-proof-signal
                    className="min-h-[86px] rounded-3xl border border-nd-border bg-nd-black/36 p-4"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-label-tight text-nd-accent">
                      {String(index + 1).padStart(2, "0")} {step.label}
                    </p>
                    <p className="mt-3 text-sm font-bold leading-tight text-nd-text-display">
                      {step.value}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-4 md:hidden">
                <div
                  className="grid grid-cols-4 gap-1 rounded-full border border-nd-border bg-nd-black/36 p-1"
                  role="tablist"
                  aria-label={`${selected.buildName} proof loop`}
                >
                  {selectedProofLoop.map((step, index) => (
                    <button
                      key={step.label}
                      type="button"
                      role="tab"
                      aria-selected={activeProofStep === index}
                      onClick={() => setActiveProofStep(index)}
                      className={cn(
                        "min-h-[36px] rounded-full px-2 font-mono text-[9px] uppercase tracking-label-tight nd-focus nd-transition",
                        activeProofStep === index
                          ? "bg-nd-accent text-nd-black"
                          : "text-nd-text-secondary hover:text-nd-text-display"
                      )}
                    >
                      {step.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3 rounded-3xl border border-nd-border bg-nd-black/42 p-4">
                  <p className="font-mono text-[10px] uppercase tracking-label-tight text-nd-accent">
                    {selectedProofLoop[activeProofStep].label}
                  </p>
                  <p className="mt-3 text-sm font-bold leading-tight text-nd-text-display">
                    {selectedProofLoop[activeProofStep].value}
                  </p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Link href={selected.href} className="anomaly-button anomaly-button-primary">
                  Open case
                  <ArrowRight className="h-4 w-4" />
                </Link>
                {selected.sourceHref && (
                  <a
                    href={selected.sourceHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="anomaly-button anomaly-button-secondary"
                  >
                    Source
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
          <a
            href="#builds"
            className="mx-auto mt-8 hidden w-max rounded-full border border-nd-border bg-nd-surface/64 px-3 py-2 font-mono text-[10px] uppercase tracking-label text-nd-text-disabled backdrop-blur nd-focus nd-transition hover:border-nd-accent hover:text-nd-text-display md:flex"
          >
            next: problem selector
          </a>
        </section>

        <section
          id="builds"
          data-journey-section="builds"
          data-command-section
          className="border-b border-nd-border px-4 py-16 md:py-24"
        >
          <div className="mx-auto max-w-[92rem]">
            <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
              <div className="lg:sticky lg:top-24 lg:self-start">
                <p className="font-mono text-[11px] uppercase tracking-label text-nd-accent">
                  Problem selector
                </p>
                <h2 className="mt-4 max-w-xl text-4xl font-black leading-[0.92] text-nd-text-display md:text-6xl">
                  Pick the failure surface.
                </h2>
                <p className="mt-5 max-w-md text-base leading-relaxed text-nd-text-secondary">
                  Filter the work by system type, then inspect what broke, what
                  I built, and where the case opens.
                </p>

                <div className="mt-7 grid gap-3">
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search projects, stacks, problems..."
                    className="min-h-[52px] rounded-full border border-nd-border bg-nd-surface/68 px-5 font-mono text-sm text-nd-text-display outline-none backdrop-blur placeholder:text-nd-text-disabled focus:border-nd-accent"
                  />
                  <div className="flex flex-wrap gap-2">
                    {filters.map((filter) => {
                      const Icon = filter.icon;
                      const active = activeFilter === filter.value;
                      return (
                        <button
                          key={filter.value}
                          type="button"
                          onClick={() => setActiveFilter(filter.value)}
                          className={cn(
                            "inline-flex min-h-[42px] items-center gap-2 rounded-full border px-4 font-mono text-[11px] uppercase tracking-label-tight nd-focus nd-transition",
                            active
                              ? "border-nd-accent bg-nd-accent text-nd-black"
                              : "border-nd-border bg-nd-surface/62 text-nd-text-secondary hover:border-nd-text-display hover:text-nd-text-display"
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {filter.label.replace("/", "")}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div
                className="grid gap-3"
                role="listbox"
                aria-label="Build cases"
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown" || event.key === "ArrowRight") {
                    event.preventDefault();
                    moveSelection(1);
                  }
                  if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
                    event.preventDefault();
                    moveSelection(-1);
                  }
                }}
              >
                {visibleBuilds.map((build, index) => {
                  const Icon = build.icon;
                  const active = build.id === selected.id;
                  return (
                    <button
                      key={build.id}
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => selectBuild(build.id)}
                      className={cn(
                        "anomaly-row group grid gap-4 rounded-[28px] border p-4 text-left nd-focus md:grid-cols-[4.8rem_1fr_auto] md:items-center md:p-5",
                        active
                          ? "border-nd-accent/70 bg-nd-surface/82 text-nd-text-display"
                          : "border-nd-border bg-nd-surface/45 text-nd-text-secondary hover:border-nd-border-visible hover:bg-nd-surface/70"
                      )}
                    >
                      <span className="flex items-center gap-3 md:block">
                        <span className="font-mono text-[10px] uppercase tracking-label text-nd-text-disabled">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="mt-0 flex h-11 w-11 items-center justify-center rounded-2xl border border-nd-border bg-nd-black/55 text-nd-accent md:mt-3">
                          <Icon className="h-5 w-5" strokeWidth={1.5} />
                        </span>
                      </span>
                      <span>
                        <span className="block text-xl font-bold leading-tight text-nd-text-display">
                          {build.problem}
                        </span>
                        <span className="mt-2 block max-w-2xl text-sm leading-relaxed text-nd-text-secondary">
                          {build.summary}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-label-tight text-nd-accent">
                        {build.shortName}
                        <ArrowRight className="h-4 w-4 nd-transition group-hover:translate-x-1" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section
          id="about"
          data-journey-section="about"
          data-command-section
          className="border-b border-nd-border px-4 py-16 md:py-24"
        >
          <div className="mx-auto grid max-w-[92rem] gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-label text-nd-accent">
                Origin signal
              </p>
              <h2 className="mt-4 text-4xl font-black leading-[0.92] text-nd-text-display md:text-6xl">
                Curiosity, then pressure, then a tool.
              </h2>
            </div>
            <div className="grid gap-3">
              {originLines.map((line, index) => (
                <div
                  key={line}
                  className="rounded-[28px] border border-nd-border bg-nd-surface/56 p-5 backdrop-blur"
                >
                  <span className="font-mono text-[10px] uppercase tracking-label text-nd-text-disabled">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="mt-3 text-lg leading-relaxed text-nd-text-primary">
                    {line}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="status"
          data-journey-section="status"
          data-command-section
          className="border-b border-nd-border px-4 py-16 md:py-24"
        >
          <div className="mx-auto max-w-[92rem]">
            <div className="grid gap-4 md:grid-cols-4">
              {workbenchItems.map((item) => (
                <div
                  key={item.label}
                  className="min-h-[150px] rounded-[28px] border border-nd-border bg-nd-surface/54 p-5 backdrop-blur"
                >
                  <p className="font-mono text-[10px] uppercase tracking-label text-nd-accent">
                    {item.label}
                  </p>
                  <p className="mt-5 text-xl font-bold leading-tight text-nd-text-display">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="contact"
          data-journey-section="contact"
          data-command-section
          className="px-4 py-16 md:py-24"
        >
          <div className="mx-auto grid max-w-[92rem] gap-8 rounded-[36px] border border-nd-border-visible/45 bg-nd-surface/68 p-6 backdrop-blur-2xl md:p-10 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-label text-nd-accent">
                Contact
              </p>
              <h2 className="mt-4 max-w-3xl text-4xl font-black leading-[0.92] text-nd-text-display md:text-6xl">
                Send me a weird workflow.
              </h2>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-nd-text-secondary">
                If something is annoying enough to deserve a tool, I probably
                want to hear about it.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              {contactLinks.map((link) => {
                const external = link.external || link.href.startsWith("http");
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener noreferrer" : undefined}
                    className="anomaly-button anomaly-button-secondary justify-between"
                  >
                    {link.label}
                    {link.href.startsWith("mailto") ? (
                      <Mail className="h-4 w-4" />
                    ) : (
                      <ExternalLink className="h-4 w-4" />
                    )}
                  </a>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
