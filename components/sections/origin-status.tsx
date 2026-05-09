import { originLines, workbenchItems } from "@/lib/homepage";
import { ScrollReveal } from "@/components/animations/scroll-reveal";

export function OriginStatus() {
  return (
    <>
      <section
        id="about"
        data-journey-section="about"
        className="border-b border-nd-border py-20 md:py-28"
      >
        <div className="container mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-[0.85fr_1.15fr]">
          <ScrollReveal>
            <span className="mb-4 block font-mono text-[11px] uppercase tracking-label text-nd-accent">
              03 / Origin
            </span>
            <h2 className="font-body text-3xl font-bold leading-tight tracking-normal text-nd-text-display md:text-5xl">
              Started on a PS3. Stayed for the systems.
            </h2>
          </ScrollReveal>
          <div className="space-y-5 border-l border-nd-border-visible pl-6">
            {originLines.map((line, index) => (
              <ScrollReveal key={line} delay={index * 0.05} distance={12}>
                <p className="text-base leading-relaxed text-nd-text-secondary md:text-lg">
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
        className="border-b border-nd-border py-12"
      >
        <div className="container mx-auto max-w-7xl px-4">
          <ScrollReveal className="mb-4 block font-mono text-[11px] uppercase tracking-label text-nd-accent">
            04 / Current Status
          </ScrollReveal>
          <dl className="grid border border-nd-border-visible md:grid-cols-4">
            {workbenchItems.map((item, index) => (
              <ScrollReveal
                key={item.label}
                delay={index * 0.035}
                distance={10}
                className="border-b border-nd-border p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"
              >
                <dt className="mb-2 font-mono text-[10px] uppercase tracking-label text-nd-text-disabled">
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
