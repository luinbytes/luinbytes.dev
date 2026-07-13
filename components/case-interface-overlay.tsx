"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Command, Crosshair, Focus, Layers3, MousePointer2 } from "lucide-react";
import { getCaseStudy } from "@/lib/case-studies";
import { cn } from "@/lib/utils";

type SectionInfo = {
  id: string;
  label: string;
};

function labelFromId(id: string) {
  return id
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function CaseInterfaceOverlay() {
  const pathname = usePathname();
  const study = getCaseStudy(pathname);
  const [sections, setSections] = useState<SectionInfo[]>([]);
  const [activeId, setActiveId] = useState("");
  const [progress, setProgress] = useState(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-scan-mode", "");
    return () => document.documentElement.removeAttribute("data-scan-mode");
  }, []);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-focus-mode", focusMode);
    return () => document.documentElement.removeAttribute("data-focus-mode");
  }, [focusMode]);

  useEffect(() => {
    if (!study) return;

    const readSections = () => {
      const found = Array.from(document.querySelectorAll<HTMLElement>("main section[id]"))
        .filter((section) => section.id !== "home")
        .map((section) => ({
          id: section.id,
          label:
            section.getAttribute("aria-label") ??
            section.querySelector("h1,h2")?.textContent?.trim().slice(0, 34) ??
            labelFromId(section.id),
        }));

      setSections(found);
      setActiveId((current) => current || found[0]?.id || "");
    };

    const frame = window.requestAnimationFrame(readSections);
    window.addEventListener("resize", readSections);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", readSections);
    };
  }, [pathname, study]);

  useEffect(() => {
    if (!study || sections.length === 0) return;

    const elements = sections
      .map((section) => document.getElementById(section.id))
      .filter((element): element is HTMLElement => Boolean(element));

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible?.target.id) setActiveId(visible.target.id);
      },
      { rootMargin: "-26% 0px -58% 0px", threshold: [0.1, 0.3, 0.55] }
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [sections, study]);

  useEffect(() => {
    if (!study) return;

    const updateProgress = () => {
      const height = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(height <= 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / height)));
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);

    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, [study]);

  const activeSection = sections.find((section) => section.id === activeId);
  const tags = useMemo(() => study?.tags.slice(0, 5) ?? [], [study]);

  if (!study) return null;

  const jumpTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
    setPanelOpen(false);
  };

  const openCommandMenu = () => {
    window.dispatchEvent(new CustomEvent("lu:open-command-menu"));
    setPanelOpen(false);
  };

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-16 z-40 h-px bg-[linear-gradient(90deg,transparent,var(--color-nd-accent),transparent)] opacity-70" />

      <aside
        aria-label={`${study.title} case interface`}
        className="registration-plate print-dither print-shadow-md case-hud fixed right-4 top-32 z-40 hidden w-[270px] border-2 border-paper bg-dark-brown p-3 text-nd-text-primary xl:block"
      >
        <div className="border border-nd-border/70 bg-nd-black/46 p-4">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-label text-nd-accent">
                Case Interface
              </p>
              <h2 className="mt-2 text-lg font-bold leading-tight text-nd-text-display">
                {study.title}
              </h2>
            </div>
            <span className="grid h-9 w-9 place-items-center border border-nd-accent/60 bg-nd-accent/12 text-nd-accent">
              <Crosshair className="h-4 w-4" />
            </span>
          </div>

          <p className="text-xs leading-relaxed text-nd-text-secondary">
            {study.summary}
          </p>

          <div className="mt-4 h-1.5 overflow-hidden bg-nd-border/70">
            <div
              className="h-full bg-nd-accent"
              style={{ width: `${progress * 100}%` }}
            />
          </div>

          <dl className="mt-4 grid gap-2 font-mono text-[10px] uppercase tracking-label-tight">
            <div className="grid grid-cols-[4.7rem_1fr] gap-2">
              <dt className="text-nd-text-disabled">surface</dt>
              <dd className="truncate text-nd-text-primary">{study.category}</dd>
            </div>
            <div className="grid grid-cols-[4.7rem_1fr] gap-2">
              <dt className="text-nd-text-disabled">signal</dt>
              <dd className="truncate text-nd-text-primary">{study.signal}</dd>
            </div>
            <div className="grid grid-cols-[4.7rem_1fr] gap-2">
              <dt className="text-nd-text-disabled">active</dt>
              <dd className="truncate text-nd-text-primary">
                {activeSection?.label ?? "Overview"}
              </dd>
            </div>
          </dl>
        </div>

        <nav className="mt-3 grid gap-1" aria-label="Case sections">
          {sections.map((section, index) => (
            <button
              key={section.id}
              type="button"
              onClick={() => jumpTo(section.id)}
              className={cn(
                "group grid min-h-[42px] grid-cols-[2rem_1fr] items-center border px-2 text-left font-mono text-[10px] uppercase tracking-label-tight nd-focus nd-transition",
                activeId === section.id
                  ? "border-nd-accent/60 bg-nd-accent/13 text-nd-text-display"
                  : "border-transparent text-nd-text-secondary hover:border-nd-border hover:bg-nd-surface-raised/70 hover:text-nd-text-primary"
              )}
            >
              <span className="text-nd-text-disabled">{String(index + 1).padStart(2, "0")}</span>
              <span className="truncate">{section.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setFocusMode((value) => !value)}
            aria-pressed={focusMode}
            className={cn(
              "grid min-h-[48px] place-items-center border nd-focus nd-transition",
              focusMode
                ? "border-nd-interactive bg-nd-interactive text-nd-black"
                : "border-nd-border bg-nd-black/35 text-nd-text-secondary hover:text-nd-text-display"
            )}
            title="Toggle focus mode"
          >
            <Focus className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={openCommandMenu}
            className="grid min-h-[48px] place-items-center border border-nd-border bg-nd-black/35 text-nd-text-secondary nd-focus nd-transition hover:text-nd-text-display"
            title="Open command menu"
          >
            <Command className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span
              key={tag}
              className="border border-nd-border bg-nd-black/35 px-2 py-1 font-mono text-[9px] uppercase tracking-label-tight text-nd-text-disabled"
            >
              {tag}
            </span>
          ))}
        </div>
      </aside>

      <button
        type="button"
        onClick={() => setPanelOpen((open) => !open)}
        aria-expanded={panelOpen}
        className="print-shadow-strong fixed bottom-4 left-4 z-[80] inline-flex min-h-[48px] items-center gap-2 border-2 border-paper bg-dark-brown px-4 font-mono text-[11px] uppercase tracking-label text-nd-text-display nd-focus xl:hidden"
      >
        <MousePointer2 className="h-4 w-4 text-nd-accent" />
        Inspect
      </button>

      {panelOpen && (
        <div className="registration-plate print-dither print-shadow-md fixed inset-x-3 bottom-20 z-[80] border-2 border-paper bg-dark-brown p-4 xl:hidden">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-label text-nd-accent">
                {study.category}
              </p>
              <h2 className="text-xl font-bold text-nd-text-display">{study.title}</h2>
            </div>
            <Layers3 className="h-5 w-5 text-nd-text-secondary" />
          </div>
          <div className="grid max-h-[38vh] gap-2 overflow-y-auto pr-1">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => jumpTo(section.id)}
                className={cn(
                  "border px-3 py-3 text-left font-mono text-[11px] uppercase tracking-label-tight nd-focus",
                  activeId === section.id
                    ? "border-nd-accent bg-nd-accent/13 text-nd-text-display"
                    : "border-nd-border text-nd-text-secondary"
                )}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
