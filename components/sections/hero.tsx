"use client";

import Link from "next/link";
import { ArrowDown, ArrowRight, Command } from "lucide-react";
import { workbenchItems } from "@/lib/homepage";
import { ScrollReveal } from "@/components/animations/scroll-reveal";

export function Hero() {
  const openCommandMenu = () => {
    window.dispatchEvent(new CustomEvent("lu:open-command-menu"));
  };

  return (
    <section
      id="home"
      data-journey-section="home"
      className="relative flex min-h-[calc(100svh-12rem)] items-center overflow-hidden border-b border-nd-border"
    >
      <div className="absolute inset-0 dot-grid-subtle opacity-30" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-nd-border-visible" />

      <div className="container relative z-10 mx-auto grid max-w-7xl gap-12 px-4 py-16 md:py-20 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
        <ScrollReveal>
          <h1 className="max-w-4xl font-body text-5xl font-bold leading-[0.95] tracking-normal text-nd-text-display md:text-6xl lg:text-7xl">
            I get annoyed,
            <br />
            then I build the
            <br />
            <span className="text-nd-accent">missing thing.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-base leading-relaxed text-nd-text-secondary md:text-lg">
            Android apps, Linux systems, reverse-engineering tools, automation,
            and small utilities from the edge cases normal software leaves
            behind.
          </p>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link
              href="#builds"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 border border-nd-text-display bg-nd-text-display px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-label-tight text-nd-black nd-transition hover:opacity-80"
            >
              Explore Problems
              <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              type="button"
              onClick={openCommandMenu}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 border border-nd-border-visible px-6 py-3 font-mono text-[12px] font-bold uppercase tracking-label-tight text-nd-text-primary nd-transition hover:border-nd-text-secondary"
            >
              <Command className="h-4 w-4" />
              Open Command Menu
            </button>
          </div>
        </ScrollReveal>

        <ScrollReveal
          delay={0.08}
          className="border border-nd-border-visible bg-nd-black/80 p-5 md:p-6"
        >
          <div className="mb-6 flex items-center justify-between border-b border-nd-border pb-4 font-mono text-[10px] uppercase tracking-label text-nd-text-disabled">
            <span>Workbench</span>
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
          className="absolute bottom-6 left-4 hidden items-center gap-3 font-mono text-[11px] uppercase tracking-label text-nd-text-disabled nd-transition hover:text-nd-text-primary md:flex"
        >
          <span>{"// next"}</span>
          <ArrowDown className="h-4 w-4 text-nd-accent" />
        </a>

        <a
          href="#builds"
          className="absolute bottom-6 right-4 hidden font-mono text-[10px] uppercase tracking-label text-nd-text-disabled nd-transition hover:text-nd-text-primary lg:block"
        >
          scroll the build loop
        </a>
      </div>
    </section>
  );
}
