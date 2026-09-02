"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUpRight, AudioLines, Bot, Github, Globe2, Mail, MapPin, Sparkles } from "lucide-react";

import { portfolioIdentity, portfolioProjects, type PortfolioProject } from "@/lib/portfolio-content";
import { PondEnvironment } from "./pond-environment";
import { ProfileCard } from "./profile-card";
import projectStyles from "./project-explorer.module.css";
import styles from "./signal-desk.module.css";

const supportingWork = [
  { name: "Bongo Cat", note: "Cross-platform desktop companion", href: "https://github.com/luinbytes/bongocat" },
  { name: "file-deduplicator", note: "Safe parallel duplicate finder", href: "https://github.com/luinbytes/file-deduplicator" },
  { name: "cursor-barrier", note: "Linux input daemon in C", href: "https://github.com/luinbytes/cursor-barrier" },
  { name: "ByteBot", note: "Stateful Discord operations", href: "https://github.com/luinbytes/bytebot-definitive-edition" },
] as const;

const PROJECT_SIGNALS = {
  "rakazo-android": ["Delegated replies", "Android parity", "Scheduled group work", "Long-chat performance"],
  "linux-sonar": ["Per-app audio routing", "Hardware ChatMix", "Microphone effects", "systemd lifecycle"],
  homebot: ["Durable conversations", "Tools + routines", "Permissions + checkpoints", "Native desktop + Android"],
} as const;

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const HERO_SEQUENCE = {
  hidden: {},
  visible: { transition: { delayChildren: 0.08, staggerChildren: 0.085 } },
};
const HERO_REVEAL = {
  hidden: { opacity: 0, y: 22, clipPath: "inset(0 0 20% 0)" },
  visible: { opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)", transitionEnd: { clipPath: "none" } },
};
const HERO_HEADING_REVEAL = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0 },
};

function ProjectArtwork({ project }: { project: PortfolioProject }) {
  const signals = PROJECT_SIGNALS[project.id as keyof typeof PROJECT_SIGNALS];

  if (signals) {
    const isRakazo = project.id === "rakazo-android";
    return (
      <div className={`${projectStyles.projectMedia} ${projectStyles.mediarakazoandroid}`}>
        <div className={`${projectStyles.rakazoIdentity} ${isRakazo ? "" : projectStyles.compactIdentity}`}>
          {isRakazo && project.image ? (
            <Image src={project.image} alt={project.imageAlt ?? "Rakazo Android application icon"} width={104} height={104} />
          ) : (
            <span className={projectStyles.projectGlyph} aria-hidden="true">
              {project.id === "linux-sonar" ? <AudioLines /> : <Bot />}
            </span>
          )}
          <span><strong>{project.name}</strong><small>{project.category}</small></span>
        </div>
        <div className={projectStyles.rakazoSignals} aria-label={`${project.name} highlights`}>
          {signals.map((signal) => <span key={signal}>{signal}</span>)}
        </div>
        <span className={projectStyles.mediaCaption}>{project.category}</span>
      </div>
    );
  }

  const image = project.image;
  if (!image) return null;

  return (
    <div className={`${projectStyles.projectMedia} ${projectStyles[`media${project.id.replaceAll("-", "")}`]}`}>
      <Image
        src={image}
        alt={project.imageAlt ?? `${project.name} project artwork`}
        fill
        sizes="(max-width: 820px) 92vw, 48vw"
        priority={project.id === "orchid-android"}
      />
      <span className={projectStyles.mediaCaption}>{project.category}</span>
    </div>
  );
}

function ProjectExplorer({ reduced }: { reduced: boolean }) {
  const [activeId, setActiveId] = useState(portfolioProjects[0]?.id ?? "orchid-android");
  const activeIndex = Math.max(0, portfolioProjects.findIndex((project) => project.id === activeId));
  const activeProject = portfolioProjects[activeIndex] ?? portfolioProjects[0];

  if (!activeProject) return null;

  return (
    <section className={styles.workSection} id="work" aria-labelledby="work-title">
      <motion.div
        className={styles.sectionIntro}
        initial={{ opacity: 0, clipPath: "inset(0 0 18% 0)", y: 26 }}
        whileInView={{ opacity: 1, clipPath: "inset(0 0 0% 0)", y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: reduced ? 0 : 0.62, ease: EASE_OUT }}
      >
        <span className={styles.eyebrow}>Selected work / 2026</span>
        <h2 id="work-title">Built where the interesting problems live.</h2>
        <p>Native apps, agent infrastructure, Linux systems. Pick a project to inspect the work.</p>
      </motion.div>

      <motion.div
        className={projectStyles.projectExplorer}
        layout="size"
        initial={{ opacity: 0, scale: 0.985, y: 22 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={{ duration: reduced ? 0 : 0.56, ease: EASE_OUT, layout: { duration: reduced ? 0 : 0.42, ease: EASE_OUT } }}
      >
        <div className={projectStyles.projectNav} role="group" aria-label="Featured projects">
          {portfolioProjects.map((project, index) => {
            const active = project.id === activeProject.id;
            return (
              <motion.button
                type="button"
                key={project.id}
                onClick={() => setActiveId(project.id)}
                className={active ? projectStyles.activeProject : ""}
                aria-pressed={active}
                whileTap={reduced ? undefined : { scale: 0.985 }}
                transition={{ duration: 0.1 }}
              >
                {active && <motion.i className={projectStyles.projectMarker} layoutId="project-marker" transition={{ duration: reduced ? 0 : 0.24, ease: EASE_OUT }} />}
                <span>0{index + 1}</span>
                <strong>{project.name}</strong>
                <small>{project.category}</small>
              </motion.button>
            );
          })}
        </div>

        <motion.div
          className={projectStyles.projectStage}
          aria-live="polite"
          layout="size"
          transition={{ layout: { duration: reduced ? 0 : 0.42, ease: EASE_OUT } }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.article
              className={projectStyles.projectPanel}
              key={activeProject.id}
              initial={{ opacity: 0, y: reduced ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: reduced ? 0 : 0.28, ease: EASE_OUT }}
            >
              <motion.div
                className={projectStyles.projectVisual}
                initial={{ clipPath: "inset(0 8% 0 0)", scale: 1.02 }}
                animate={{ clipPath: "inset(0 0 0 0)", scale: 1 }}
                exit={reduced ? undefined : { opacity: 0, scale: 0.99 }}
                transition={{ duration: reduced ? 0 : 0.34, ease: EASE_OUT }}
              >
                <ProjectArtwork project={activeProject} />
              </motion.div>
              <motion.div
                className={projectStyles.projectCopy}
                initial={{ opacity: 0, x: reduced ? 0 : 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduced ? undefined : { opacity: 0, x: -8 }}
                transition={{ duration: reduced ? 0 : 0.3, delay: reduced ? 0 : 0.035, ease: EASE_OUT }}
              >
                <span className={projectStyles.projectEyebrow}>{activeProject.eyebrow}</span>
                <h3>{activeProject.name}</h3>
                <p className={projectStyles.projectSummary}>{activeProject.summary}</p>
                <p className={projectStyles.projectDetail}>{activeProject.detail}</p>
                <div className={projectStyles.proofRow}>
                  {activeProject.proof?.map((item) => <span key={item}>{item}</span>)}
                </div>
                <div className={projectStyles.projectActions}>
                  <a href={activeProject.href} target="_blank" rel="noreferrer">
                    View project <ArrowUpRight aria-hidden="true" />
                  </a>
                  {activeProject.secondaryHref && (
                    <a href={activeProject.secondaryHref} target="_blank" rel="noreferrer">
                      {activeProject.secondaryLabel} <ArrowUpRight aria-hidden="true" />
                    </a>
                  )}
                </div>
              </motion.div>
            </motion.article>
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </section>
  );
}

export function SignalDesk() {
  const [reducedMotion, setReducedMotion] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(preference.matches);
    sync();
    preference.addEventListener("change", sync);
    return () => preference.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    let current = window.scrollY > 36;
    const sync = () => {
      const next = window.scrollY > 36;
      if (next !== current) {
        current = next;
        setScrolled(next);
      }
    };
    window.addEventListener("scroll", sync, { passive: true });
    return () => window.removeEventListener("scroll", sync);
  }, []);

  return (
    <div className={styles.page} id="top">
      <PondEnvironment reduced={reducedMotion} />
      <p className={styles.srOnly}>The decorative pond responds to pointer movement. Right-click open water, or double-tap it on touch devices, to feed the fish.</p>

      <motion.header
        className={`${styles.header} ${scrolled ? styles.headerScrolled : ""}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.42, ease: EASE_OUT }}
      >
        <a className={styles.brand} href="#top" aria-label="Lu, back to top">
          <ProfileCard reducedMotion={reducedMotion} compact />
        </a>
        <nav aria-label="Portfolio navigation">
          <a href="#work">Work</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </nav>
      </motion.header>

      <div className={styles.content}>
        <section className={styles.hero} aria-labelledby="hero-title">
          <motion.div
            className={styles.heroCopy}
            variants={reducedMotion ? { hidden: {}, visible: {} } : HERO_SEQUENCE}
            initial="hidden"
            animate="visible"
          >
            <motion.span variants={HERO_REVEAL} transition={{ duration: reducedMotion ? 0 : 0.62, ease: EASE_OUT }} className={styles.eyebrow}><Sparkles aria-hidden="true" /> Lu / software engineer</motion.span>
            <motion.h1 variants={HERO_HEADING_REVEAL} transition={{ duration: reducedMotion ? 0 : 0.62, ease: EASE_OUT }} id="hero-title">I make stubborn software <em>behave.</em></motion.h1>
            <motion.p variants={HERO_REVEAL} transition={{ duration: reducedMotion ? 0 : 0.62, ease: EASE_OUT }}>I build Orchid.ai’s native Android app, agent systems, and Linux tools that do the useful part without making a fuss.</motion.p>
            <motion.div variants={HERO_REVEAL} transition={{ duration: reducedMotion ? 0 : 0.62, ease: EASE_OUT }} className={styles.heroActions}>
              <a href="#work">See the work <ArrowDown aria-hidden="true" /></a>
              <a href={portfolioIdentity.calendar}>Start a conversation <Mail aria-hidden="true" /></a>
            </motion.div>
          </motion.div>
        </section>

        <ProjectExplorer reduced={reducedMotion} />

        <section className={styles.aboutSection} id="about" aria-labelledby="about-title">
          <motion.div
            className={styles.aboutLead}
            initial={{ opacity: 0, clipPath: "inset(0 0 16% 0)", y: 28 }}
            whileInView={{ opacity: 1, clipPath: "inset(0 0 0% 0)", y: 0 }}
            viewport={{ once: true, amount: 0.28 }}
            transition={{ duration: reducedMotion ? 0 : 0.62, ease: EASE_OUT }}
          >
            <span className={styles.eyebrow}>About / how I work</span>
            <h2 id="about-title">Practical systems. Properly finished.</h2>
            <p>I work across native apps, agent infrastructure, Linux, and the awkward seams between them. I like the problems where “mostly works” is still broken.</p>
          </motion.div>

          <motion.article
            className={styles.iniuriaCard}
            initial={{ opacity: 0, scale: 0.965, y: 24 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, amount: 0.32 }}
            transition={{ duration: reducedMotion ? 0 : 0.56, ease: EASE_OUT }}
          >
            <span className={projectStyles.projectEyebrow}>Independent work / Iniuria.us</span>
            <h3>Automation with an actual job to do.</h3>
            <p>Discord automation, internal admin panels, and AI-assisted support triage built around the daily realities of an active community.</p>
            <div className={projectStyles.proofRow}><span>Discord systems</span><span>Admin tooling</span><span>AI triage</span></div>
          </motion.article>

          <motion.div
            className={styles.moreWork}
            initial={{ opacity: 0, clipPath: "inset(0 0 0 8%)" }}
            whileInView={{ opacity: 1, clipPath: "inset(0 0 0 0%)" }}
            viewport={{ once: true, amount: 0.18 }}
            transition={{ duration: reducedMotion ? 0 : 0.58, ease: EASE_OUT }}
          >
            <div>
              <span className={styles.eyebrow}><Github aria-hidden="true" /> More open source</span>
              <h3>Small tools. Sharp edges.</h3>
            </div>
            <div className={styles.moreGrid}>
              {supportingWork.map((project) => (
                <a key={project.name} href={project.href} target="_blank" rel="noreferrer">
                  <span><strong>{project.name}</strong><small>{project.note}</small></span>
                  <ArrowUpRight aria-hidden="true" />
                </a>
              ))}
            </div>
          </motion.div>
        </section>

        <motion.section
          className={styles.contactSection}
          id="contact"
          aria-labelledby="contact-title"
          initial={{ opacity: 0, scale: 0.975, y: 24 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, amount: 0.28 }}
          transition={{ duration: reducedMotion ? 0 : 0.56, ease: EASE_OUT }}
        >
          <div className={styles.contactIntro}>
            <span className={styles.eyebrow}>Open channel</span>
            <h2 id="contact-title">Got a useful problem?</h2>
            <p>Native apps, agent infrastructure, strange systems, and software that needs to behave.</p>
          </div>
          <div className={styles.contactBooking}>
            <span className={styles.contactLabel}>Book a call</span>
            <h3>30 minutes. No forms.</h3>
            <div className={styles.contactFacts} aria-label="Booking details">
              <span><Globe2 aria-hidden="true" /> Cal.com / luinbytes</span>
              <span><MapPin aria-hidden="true" /> Europe / London</span>
            </div>
            <a className={styles.contactCta} href={portfolioIdentity.calendar}>Start a conversation <ArrowUpRight aria-hidden="true" /></a>
          </div>
        </motion.section>
      </div>

      <motion.footer
        className={styles.footer}
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.7 }}
        transition={{ duration: reducedMotion ? 0 : 0.42, ease: EASE_OUT }}
      >
        <span>© {new Date().getFullYear()} Lu / 6C75</span>
        <div>
          <a href={portfolioIdentity.github} target="_blank" rel="noreferrer">GitHub</a>
          <a href={portfolioIdentity.x} target="_blank" rel="noreferrer">@x6c75</a>
          <a href={portfolioIdentity.orchid} target="_blank" rel="noreferrer">Orchid.ai</a>
        </div>
      </motion.footer>
    </div>
  );
}
