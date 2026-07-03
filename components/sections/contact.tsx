import { ArrowRight, Coffee, Github, Mail, Twitter } from "lucide-react";
import { contactLinks } from "@/lib/homepage";
import { ScrollReveal } from "@/components/animations/scroll-reveal";

function getContactIcon(label: string) {
  switch (label) {
    case "Email":
      return Mail;
    case "GitHub":
      return Github;
    case "X / Twitter":
      return Twitter;
    default:
      return Mail;
  }
}

export function Contact() {
  return (
    <section
      id="contact"
      data-journey-section="contact"
      className="relative overflow-hidden border-b border-nd-border py-16 md:py-24"
    >
      <div className="absolute inset-x-0 top-0 h-px bg-nd-border-visible" />
      <div className="absolute -bottom-20 right-16 hidden h-32 w-32 rotate-12 border-2 border-nd-accent/25 xl:block" />
      <div className="container mx-auto max-w-7xl px-4 min-[1536px]:pl-[300px] 2xl:px-4">
        <ScrollReveal className="mb-4 block font-mono text-[11px] uppercase tracking-label text-nd-accent">
          05 / Contact
        </ScrollReveal>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(260px,360px)] lg:items-end">
          <ScrollReveal className="min-w-0">
            <h2 className="max-w-5xl text-wrap font-display text-5xl font-bold leading-[0.92] tracking-normal text-nd-text-display md:text-6xl xl:text-7xl">
              Open to interesting projects and unsolicited bug reports.
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-nd-text-secondary">
              Send the weird workflow, the broken tool, or the idea that keeps
              getting stuck in your head.
            </p>
          </ScrollReveal>

          <div className="grid min-w-0 gap-3">
            {contactLinks.map((link, index) => {
              const Icon = getContactIcon(link.label);
              return (
                <ScrollReveal
                  key={link.label}
                  delay={index * 0.04}
                  distance={10}
                >
                  <a
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className="atlas-scanline atlas-hover-lift group inline-flex min-h-[52px] w-full items-center justify-between gap-4 border-2 border-nd-border-visible bg-nd-surface px-5 py-3 font-mono text-[12px] font-bold uppercase tracking-label-tight text-nd-text-primary shadow-[6px_6px_0_rgba(255,131,183,0.1)] nd-focus"
                  >
                    <span className="inline-flex items-center gap-3">
                      <Icon className="h-4 w-4" strokeWidth={1.5} />
                      {link.label}
                    </span>
                    <ArrowRight className="atlas-arrow h-4 w-4 text-nd-accent nd-transition" />
                  </a>
                </ScrollReveal>
              );
            })}
          </div>
        </div>

        <ScrollReveal
          distance={10}
          className="mt-14 flex flex-col gap-4 border-t border-nd-border pt-6 font-mono text-[11px] uppercase tracking-label text-nd-text-disabled md:flex-row md:items-center md:justify-between"
        >
          <span>© {new Date().getFullYear()} luinbytes.dev</span>
          <a
            href="https://buymeacoffee.com/luinbytes"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 nd-focus nd-transition hover:text-nd-text-primary"
          >
            <Coffee className="h-3.5 w-3.5" />
            Buy Me a Coffee
          </a>
        </ScrollReveal>
      </div>
    </section>
  );
}
