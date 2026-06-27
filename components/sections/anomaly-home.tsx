"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
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
  workbenchItems,
} from "@/lib/homepage";
import { cn } from "@/lib/utils";
import { CommandShortcut } from "@/components/os-shortcut";

const allFilter = { label: "All", value: "all", icon: Filter };
const filters = [allFilter, ...commandFilters];

export function AnomalyHome() {
  const prefersReducedMotion = useReducedMotion();
  const [activeFilter, setActiveFilter] = useState("all");
  const [selectedId, setSelectedId] = useState(problemBuilds[0].id);
  const [query, setQuery] = useState("");
  const [intensity, setIntensity] = useState(62);
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
    document.getElementById("active-case")?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "center",
    });
    cueActiveCase(prefersReducedMotion ? 0 : 520);
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
      <div className="anomaly-backdrop" aria-hidden="true" />
      <main className="relative z-10">
        <section
          id="home"
          data-journey-section="home"
          className="relative overflow-hidden border-b border-nd-border px-4 py-6 sm:py-8"
        >
          <div className="mx-auto grid max-w-[92rem] gap-8 lg:grid-cols-[minmax(0,1.04fr)_minmax(390px,0.96fr)] lg:items-center">
            <div className="pt-6 md:pt-8">
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <span className="anomaly-chip">
                  Precision Anomaly
                </span>
                <button
                  type="button"
                  onClick={openCommandMenu}
                  className="anomaly-chip nd-focus hover:border-nd-accent hover:text-nd-text-display"
                >
                  <Command className="h-3.5 w-3.5" />
                  <CommandShortcut />
                </button>
              </div>

              <h1 className="max-w-5xl text-balance font-display text-[clamp(2.85rem,6.55vw,6.6rem)] font-black leading-[0.84] tracking-normal text-nd-text-display">
                I get annoyed,
                <span className="block text-nd-accent">then I build</span>
                the missing thing.
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-relaxed text-nd-text-secondary md:text-lg">
                Android apps, Linux audio systems, reverse-engineering and game
                tooling, automation, CLI utilities, and tiny tools that stay out
                of the way.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
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

            <motion.div
              id="active-case"
              className={cn(
                "anomaly-lens min-h-[390px] p-4 sm:p-5",
                surprise && "anomaly-lens-pulse",
                attention && "anomaly-lens-attention"
              )}
              style={{ "--anomaly-intensity": `${intensity}%` } as CSSProperties}
              animate={
                prefersReducedMotion
                  ? undefined
                  : { y: [0, -8, 0], rotate: [0, 0.35, 0] }
              }
              transition={
                prefersReducedMotion
                  ? undefined
                  : { duration: 7, repeat: Infinity, ease: "easeInOut" }
              }
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-label text-nd-accent">
                    Active Case
                  </p>
                  <h2 className="mt-2 text-3xl font-bold leading-none text-nd-text-display sm:text-4xl">
                    {selected.buildName}
                  </h2>
                </div>
                <SelectedIcon className="h-8 w-8 text-nd-accent" strokeWidth={1.5} />
              </div>

              <div className="anomaly-orbit" aria-hidden="true">
                {problemBuilds.slice(0, 6).map((build, index) => {
                  const Icon = build.icon;
                  return (
                    <button
                      key={build.id}
                      type="button"
                      onClick={() => selectBuild(build.id)}
                      className={cn(
                        "anomaly-node nd-focus",
                        selected.id === build.id && "is-active"
                      )}
                      style={{ "--node-index": index } as CSSProperties}
                      aria-label={`Inspect ${build.buildName}`}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  );
                })}
              </div>

              <div className="mt-8 grid gap-4 rounded-[28px] border border-nd-border bg-nd-black/45 p-4 backdrop-blur">
                <p className="text-lg leading-relaxed text-nd-text-primary">
                  {selected.summary}
                </p>
                <p className="text-sm leading-relaxed text-nd-text-secondary">
                  {selected.outcome}
                </p>
                <div className="flex flex-wrap gap-2">
                  {selected.tech.map((tech) => (
                    <span key={tech} className="anomaly-tag">
                      {tech}
                    </span>
                  ))}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
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

              <label className="mt-5 block font-mono text-[10px] uppercase tracking-label text-nd-text-disabled">
                Interface intensity
                <input
                  value={intensity}
                  min={20}
                  max={100}
                  type="range"
                  onChange={(event) => setIntensity(Number(event.target.value))}
                  className="mt-3 w-full accent-[var(--color-nd-accent)]"
                />
              </label>
            </motion.div>
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

              <div className="grid gap-3" role="listbox" aria-label="Build cases">
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
