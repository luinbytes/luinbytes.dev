import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { selectedBuilds } from "@/lib/homepage";
import { ScrollReveal } from "@/components/animations/scroll-reveal";

export function SelectedBuilds() {
  return (
    <section
      id="selected-builds"
      data-journey-section="selected-builds"
      className="border-b border-nd-border py-20 md:py-28"
    >
      <div className="container mx-auto max-w-7xl px-4">
        <ScrollReveal className="mb-8 flex items-end justify-between gap-6">
          <div>
            <span className="mb-4 block font-mono text-[11px] uppercase tracking-label text-nd-accent">
              02 / Selected Builds
            </span>
            <h2 className="font-body text-3xl font-bold tracking-normal text-nd-text-display md:text-5xl">
              Fewer entries, stronger signal.
            </h2>
          </div>
          <a
            href="https://github.com/luinbytes"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden font-mono text-[11px] uppercase tracking-label text-nd-accent nd-transition hover:text-nd-text-display md:inline-flex"
          >
            View all builds -&gt;
          </a>
        </ScrollReveal>

        <div className="border border-nd-border-visible">
          {selectedBuilds.map((build) => {
            const Icon = build.icon;
            const isExternal = build.href.startsWith("http");
            const rowClassName =
              "group grid gap-4 border-b border-nd-border p-5 nd-focus nd-transition last:border-b-0 hover:bg-nd-surface md:grid-cols-[72px_1fr_auto_32px] md:items-center md:p-6";
            const rowContent = (
              <>
                <span className="flex h-12 w-12 items-center justify-center border border-nd-border-visible text-nd-text-primary group-hover:border-nd-accent group-hover:text-nd-accent">
                  <Icon className="h-5 w-5" strokeWidth={1.5} />
                </span>
                <span>
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
                      className="border border-nd-border-visible px-2 py-1 font-mono text-[10px] uppercase tracking-label-tight text-nd-text-disabled"
                    >
                      {tech}
                    </span>
                  ))}
                </span>
                <ArrowRight className="h-4 w-4 text-nd-accent nd-transition group-hover:translate-x-1" />
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
