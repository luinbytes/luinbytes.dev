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
      className="border-b border-nd-border py-20 md:py-28"
    >
      <div className="container mx-auto max-w-7xl px-4">
        <ScrollReveal className="mb-4 block font-mono text-[11px] uppercase tracking-label text-nd-accent">
          05 / Contact
        </ScrollReveal>
        <div className="grid gap-10 md:grid-cols-[1fr_auto] md:items-end">
          <ScrollReveal>
            <h2 className="max-w-3xl font-body text-4xl font-bold leading-tight tracking-normal text-nd-text-display md:text-6xl">
              Open to interesting projects and unsolicited bug reports.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-nd-text-secondary">
              Send the weird workflow, the broken tool, or the idea that keeps
              getting stuck in your head.
            </p>
          </ScrollReveal>

          <div className="grid min-w-[260px] gap-3">
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
                    className="group inline-flex min-h-[48px] w-full items-center justify-between gap-4 border border-nd-border-visible px-5 py-3 font-mono text-[12px] font-bold uppercase tracking-label-tight text-nd-text-primary nd-focus nd-transition hover:border-nd-text-secondary hover:bg-nd-surface"
                  >
                    <span className="inline-flex items-center gap-3">
                      <Icon className="h-4 w-4" strokeWidth={1.5} />
                      {link.label}
                    </span>
                    <ArrowRight className="h-4 w-4 text-nd-accent nd-transition group-hover:translate-x-1" />
                  </a>
                </ScrollReveal>
              );
            })}
          </div>
        </div>

        <ScrollReveal
          distance={10}
          className="mt-20 flex flex-col gap-4 border-t border-nd-border pt-6 font-mono text-[11px] uppercase tracking-label text-nd-text-disabled md:flex-row md:items-center md:justify-between"
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
