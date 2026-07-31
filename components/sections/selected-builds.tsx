import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { problemBuilds } from "@/lib/homepage";
import { ScrollReveal } from "@/components/animations/scroll-reveal";

export function SelectedBuilds() {
  return (
    <section
      id="selected-builds"
      data-journey-section="selected-builds"
      className="relative overflow-hidden border-b border-nd-border bg-nd-surface/35 py-20 md:py-28"
    >
      <div className="absolute right-8 top-10 hidden h-24 w-24 border border-dashed border-nd-interactive/35 opacity-70 [animation:atlas-drift_9s_ease-in-out_infinite] lg:block" />
      <div className="container mx-auto max-w-7xl px-4">
        <ScrollReveal className="mb-8 flex items-end justify-between gap-6">
          <div>
            <span className="mb-4 block font-mono text-[11px] uppercase tracking-label text-nd-accent">
              02 / Selected Builds
            </span>
            <h2 className="font-display text-4xl font-bold leading-[0.95] tracking-normal text-nd-text-display md:text-6xl">
              Shipped artifacts, pinned like field samples.
            </h2>
          </div>
          <a
            href="https://github.com/luinbytes"
            target="_blank"
            rel="noopener noreferrer"
            className="print-shadow-xs hidden border border-nd-border-visible bg-nd-surface px-3 py-2 font-mono text-[11px] uppercase tracking-label text-nd-accent nd-transition hover:-translate-y-0.5 hover:text-nd-text-display md:inline-flex"
          >
            View all builds -&gt;
          </a>
        </ScrollReveal>

        <div className="grid gap-4">
          {problemBuilds.map((build) => {
            const Icon = build.icon;
            const isExternal = build.href.startsWith("http");
            const rowClassName =
              "atlas-scanline atlas-hover-lift print-shadow-md group grid gap-4 border-2 border-nd-border-visible bg-nd-surface p-5 nd-focus md:grid-cols-[72px_1fr_auto_32px] md:items-center md:p-6";
            const rowContent = (
              <>
                <span className="atlas-icon flex h-12 w-12 items-center justify-center border-2 border-nd-border-visible bg-nd-black text-nd-text-primary nd-transition group-hover:bg-nd-accent group-hover:text-nd-surface">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </span>
                <span>
                  <span className="mb-1 block font-mono text-[10px] uppercase tracking-label-tight text-nd-accent">
                    Artifact {build.index} / {build.shortName}
                  </span>
                  <span className="block font-body text-xl font-bold text-nd-text-display">
                    {build.buildName}
                  </span>
                  <span className="mt-1 block max-w-2xl text-sm leading-relaxed text-nd-text-secondary">
                    {build.summary}
                  </span>
                </span>
                <span className="flex flex-wrap gap-2">
                  {build.tech.slice(0, 4).map((tech) => (
                    <span
                      key={tech}
                      className="border border-nd-border bg-nd-black/50 px-2 py-1 font-mono text-[10px] uppercase tracking-label-tight text-nd-text-secondary"
                    >
                      {tech}
                    </span>
                  ))}
                </span>
                <ArrowRight className="atlas-arrow h-4 w-4 text-nd-accent nd-transition" />
              </>
            );

            if (isExternal) {
              return (
                <ScrollReveal
                  key={build.id}
                  delay={Number(build.index) * 0.025}
                  distance={12}
                >
                  <a
                    href={build.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={rowClassName}
                  >
                    {rowContent}
                  </a>
                </ScrollReveal>
              );
            }

            return (
              <ScrollReveal
                key={build.id}
                delay={Number(build.index) * 0.025}
                distance={12}
              >
                <Link href={build.href} className={rowClassName}>
                  {rowContent}
                </Link>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
