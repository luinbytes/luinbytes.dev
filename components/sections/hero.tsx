"use client";

import Link from "next/link";
import { ArrowDown, ArrowRight } from "lucide-react";
import { workbenchItems } from "@/lib/homepage";
import { ScrollReveal } from "@/components/animations/scroll-reveal";
import { AtlasField } from "@/components/animations/atlas-field";
import { CommandShortcut } from "@/components/os-shortcut";

export function Hero() {
  const openCommandMenu = () => {
    window.dispatchEvent(new CustomEvent("lu:open-command-menu"));
  };

  return (
    <section
      id="home"
      data-journey-section="home"
      className="theme-hero-section relative flex min-h-[calc(100svh-5rem)] items-center overflow-hidden border-b border-nd-border"
    >
      <div className="theme-hero-grid absolute inset-0 dot-grid-subtle opacity-70" />
      <div className="theme-accent-bar absolute left-0 top-0 h-full w-2 bg-nd-accent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-nd-border-visible" />
      <AtlasField />

      <div className="container relative z-10 mx-auto grid max-w-7xl gap-10 px-4 py-12 md:py-16 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
        <ScrollReveal>
          <div className="theme-hero-note print-shadow-sm mb-7 inline-flex items-center gap-3 border border-nd-border-visible bg-nd-surface px-3 py-2 font-mono text-[10px] uppercase tracking-label-tight text-nd-text-secondary">
            <span className="h-2 w-2 bg-nd-accent" />
            <span>Field note 00 / working reflex</span>
          </div>
          <h1 className="theme-hero-title max-w-5xl font-display text-5xl font-bold leading-[0.9] tracking-normal text-nd-text-display md:text-7xl lg:text-[5.9rem]">
            I get annoyed,
            <br />
            then I build the
            <br />
            <span className="relative inline-block text-nd-accent">
              missing thing.
              <span className="absolute -bottom-2 left-0 h-2 w-full bg-nd-interactive/25" />
            </span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-nd-text-secondary md:text-xl">
            Android apps, Linux systems, reverse-engineering tools, automation,
            and small utilities from the edge cases normal software leaves
            behind.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="#builds"
              className="atlas-scanline atlas-hover-lift print-shadow-md inline-flex min-h-[48px] items-center justify-center gap-2 border-2 border-nd-text-display bg-nd-text-display px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-label-tight text-nd-black"
            >
              Explore Problems
              <ArrowRight className="atlas-arrow h-4 w-4 nd-transition" />
            </Link>
            <button
              type="button"
              onClick={openCommandMenu}
              className="atlas-hover-lift print-shadow-md inline-flex min-h-[48px] items-center justify-center gap-2 border-2 border-nd-border-visible bg-nd-surface px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-label-tight text-nd-text-primary"
            >
              <span className="font-mono text-[13px] leading-none">
                <CommandShortcut />
              </span>
              Open Command Menu
            </button>
          </div>
        </ScrollReveal>

        <ScrollReveal
          delay={0.08}
          className="theme-workbench-card atlas-mark atlas-paper print-shadow-lg border-2 border-nd-border-visible bg-nd-surface p-5 md:p-6"
        >
          <div className="theme-workbench-heading mb-6 flex items-center justify-between border-b-2 border-nd-border-visible pb-4 font-mono text-[10px] uppercase tracking-label text-nd-text-secondary">
            <span>Readout</span>
            <span>May 2026</span>
          </div>
          <dl className="space-y-0">
            {workbenchItems.map((item) => (
              <div
                key={item.label}
                className="grid grid-cols-[7rem_1fr] gap-4 border-b border-nd-border py-4 last:border-b-0"
              >
                <dt className="font-mono text-[10px] uppercase tracking-label text-nd-accent">
                  {item.label}
                </dt>
                <dd className="text-sm leading-relaxed text-nd-text-primary">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </ScrollReveal>

        <a
          href="#builds"
          className="absolute bottom-6 left-4 hidden items-center gap-3 font-mono text-[11px] uppercase tracking-label text-nd-text-secondary nd-transition hover:text-nd-text-primary md:flex"
        >
          <span>{"// next"}</span>
          <ArrowDown className="h-4 w-4 text-nd-accent" />
        </a>

        <a
          href="#builds"
          className="absolute bottom-6 right-4 hidden border border-nd-border-visible bg-nd-surface px-3 py-2 font-mono text-[10px] uppercase tracking-label text-nd-text-secondary nd-transition hover:-translate-y-0.5 hover:text-nd-text-primary lg:block"
        >
          scroll the build loop
        </a>
      </div>
    </section>
  );
}
