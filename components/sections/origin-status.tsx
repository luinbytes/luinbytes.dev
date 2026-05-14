import { originLines, workbenchItems } from "@/lib/homepage";
import { ScrollReveal } from "@/components/animations/scroll-reveal";

export function OriginStatus() {
  return (
    <>
      <section
        id="about"
        data-journey-section="about"
        className="relative overflow-hidden border-b border-nd-border py-20 md:py-28"
      >
        <div className="absolute bottom-0 left-0 h-1/2 w-full bg-[linear-gradient(135deg,rgba(217,77,47,0.08),transparent_45%,rgba(20,127,148,0.1))]" />
        <div className="container mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-[0.85fr_1.15fr]">
          <ScrollReveal>
            <span className="mb-4 block font-mono text-[11px] uppercase tracking-label text-nd-accent">
              03 / Origin
            </span>
            <h2 className="font-display text-4xl font-bold leading-[0.95] tracking-normal text-nd-text-display md:text-6xl">
              Started on a PS3. Stayed for the systems.
            </h2>
          </ScrollReveal>
          <div className="atlas-paper space-y-5 border-l-4 border-nd-accent bg-nd-surface/70 p-6 shadow-[10px_10px_0_rgba(20,16,10,0.08)]">
            {originLines.map((line, index) => (
              <ScrollReveal key={line} delay={index * 0.05} distance={12}>
                <p className="text-lg leading-relaxed text-nd-text-secondary md:text-xl">
                  {line}
                </p>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section
        id="status"
        data-journey-section="status"
        className="border-b border-nd-border bg-nd-black py-12 text-nd-text-primary"
      >
        <div className="container mx-auto max-w-7xl px-4 min-[1000px]:pl-[280px] xl:pl-[300px] 2xl:px-4">
          <ScrollReveal className="mb-4 block font-mono text-[11px] uppercase tracking-label text-nd-accent">
            04 / Current Status
          </ScrollReveal>
          <dl className="grid border-2 border-nd-border-visible bg-nd-surface md:grid-cols-4">
            {workbenchItems.map((item, index) => (
              <ScrollReveal
                key={item.label}
                delay={index * 0.035}
                distance={10}
                className="atlas-scanline border-b border-nd-border-visible p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
              >
                <dt className="mb-2 font-mono text-[10px] uppercase tracking-label text-nd-accent">
                  {item.label}
                </dt>
                <dd className="text-sm leading-relaxed text-nd-text-primary">
                  {item.value}
                </dd>
              </ScrollReveal>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}
