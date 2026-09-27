"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUpRight, AudioLines, Github, Globe2, Mail, MapPin } from "lucide-react";

import {
  portfolioIdentity,
  portfolioProjects,
  type PortfolioProject,
  type PortfolioProjectId,
} from "@/lib/portfolio-content";
import { PondEnvironment } from "./pond-environment";
import { ProfileCard } from "./profile-card";
import { PipFace } from "@/components/pip/pip-logo";
import { PipFeature } from "@/components/pip/pip-feature";
import projectStyles from "./project-explorer.module.css";
import styles from "./signal-desk.module.css";

const supportingWork = [
  { name: "Bongo Cat", note: "Cross-platform desktop companion", href: "https://github.com/luinbytes/bongocat" },
  { name: "file-deduplicator", note: "Safe parallel duplicate finder", href: "https://github.com/luinbytes/file-deduplicator" },
  { name: "cursor-barrier", note: "Linux input daemon in C", href: "https://github.com/luinbytes/cursor-barrier" },
  { name: "ByteBot", note: "Stateful Discord operations", href: "https://github.com/luinbytes/bytebot-definitive-edition" },
] as const;

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

function motionValue(reduced: boolean, value: number) {
  return reduced ? 0 : value;
}

function motionExit<T>(reduced: boolean, value: T) {
  return reduced ? undefined : value;
}

function useReducedMotionPreference() {
  const [preference, setPreference] = useState({ ready: false, reduced: true });

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPreference({ ready: true, reduced: media.matches });
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return preference;
}

function SiteFooter({ reduced, entrance, ready }: { reduced: boolean; entrance: boolean; ready: boolean }) {
  return (
    <motion.footer
      key={ready ? "footer-ready" : "footer-server"}
      className={styles.footer}
      initial={entrance ? { opacity: 0 } : false}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.7 }}
      transition={{ duration: motionValue(reduced, 0.42), ease: EASE_OUT }}
    >
      <span>© {new Date().getFullYear()} Lu / 6C75</span>
      <div>
        <a href={portfolioIdentity.github} target="_blank" rel="noreferrer">GitHub</a>
        <a href={portfolioIdentity.x} target="_blank" rel="noreferrer">@x6c75</a>
        <a href={portfolioIdentity.orchid} target="_blank" rel="noreferrer">Orchid.ai</a>
      </div>
    </motion.footer>
  );
}

function ProjectArtwork({ project }: { project: PortfolioProject }) {
  if (!project.image) {
    return (
      <div className={`${projectStyles.projectMedia} ${projectStyles.projectCover}`}>
        <AudioLines aria-hidden="true" />
        <strong>{project.name}</strong>
        <span>{project.category}</span>
      </div>
    );
  }

  return (
    <div className={`${projectStyles.projectMedia} ${projectStyles[`media${project.id.replaceAll("-", "")}`]}`}>
      <Image
        src={project.image}
        alt={project.imageAlt ?? `${project.name} project artwork`}
        fill
        sizes="(max-width: 820px) 92vw, 48vw"
        priority={project.id === "orchid-android"}
      />
    </div>
  );
}

function ProjectNavigation({
  activeId,
  reduced,
  onSelect,
}: {
  activeId: PortfolioProjectId;
  reduced: boolean;
  onSelect: (id: PortfolioProjectId) => void;
}) {
  return (
    <div className={projectStyles.projectNav} role="group" aria-label="Featured projects">
      {portfolioProjects.map((project) => {
        const active = project.id === activeId;
        return (
          <motion.button
            type="button"
            key={project.id}
            onClick={() => onSelect(project.id)}
            className={active ? projectStyles.activeProject : ""}
            aria-pressed={active}
            whileTap={reduced ? undefined : { scale: 0.985 }}
            transition={{ duration: 0.1 }}
          >
            {active && <motion.i className={projectStyles.projectMarker} layoutId="project-marker" transition={{ duration: reduced ? 0 : 0.24, ease: EASE_OUT }} />}
            <strong>{project.name}</strong>
            <small>{project.category}</small>
          </motion.button>
        );
      })}
    </div>
  );
}

function ProjectPanel({ project, reduced }: { project: PortfolioProject; reduced: boolean }) {
  return (
    <motion.div
      className={projectStyles.projectStage}
      aria-live="polite"
      layout="size"
      transition={{ layout: { duration: motionValue(reduced, 0.42), ease: EASE_OUT } }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.article
          className={projectStyles.projectPanel}
          key={project.id}
          initial={{ opacity: 0, y: motionValue(reduced, 8) }}
          animate={{ opacity: 1, y: 0 }}
          exit={motionExit(reduced, { opacity: 0, y: -6 })}
          transition={{ duration: motionValue(reduced, 0.28), ease: EASE_OUT }}
        >
          <motion.div
            className={projectStyles.projectVisual}
            initial={{ opacity: 0, scale: 1.015 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={motionExit(reduced, { opacity: 0, scale: 0.99 })}
            transition={{ duration: motionValue(reduced, 0.34), ease: EASE_OUT }}
          >
            <ProjectArtwork project={project} />
          </motion.div>
          <motion.div
            className={projectStyles.projectCopy}
            initial={{ opacity: 0, x: motionValue(reduced, 14) }}
            animate={{ opacity: 1, x: 0 }}
            exit={motionExit(reduced, { opacity: 0, x: -8 })}
            transition={{ duration: motionValue(reduced, 0.3), delay: motionValue(reduced, 0.035), ease: EASE_OUT }}
          >
            <span className={projectStyles.projectEyebrow}>{project.category}</span>
            <h3>{project.name}</h3>
            <p className={projectStyles.projectSummary}>{project.summary}</p>
            <p className={projectStyles.projectDetail}>{project.detail}</p>
            <div className={projectStyles.proofRow}>
              {project.proof?.map((item) => <span key={item}>{item}</span>)}
            </div>
            <div className={projectStyles.projectActions}>
              <a href={project.href} target="_blank" rel="noreferrer">
                View project <ArrowUpRight aria-hidden="true" />
              </a>
              {project.secondaryHref && (
                <a href={project.secondaryHref} target="_blank" rel="noreferrer">
                  {project.secondaryLabel} <ArrowUpRight aria-hidden="true" />
                </a>
              )}
            </div>
          </motion.div>
        </motion.article>
      </AnimatePresence>
    </motion.div>
  );
}

function ProjectExplorer({ reduced, entrance, ready }: { reduced: boolean; entrance: boolean; ready: boolean }) {
  const [activeId, setActiveId] = useState(portfolioProjects[0]?.id ?? "orchid-android");
  const activeIndex = Math.max(0, portfolioProjects.findIndex((project) => project.id === activeId));
  const activeProject = portfolioProjects[activeIndex] ?? portfolioProjects[0];

  if (!activeProject) return null;

  return (
    <section className={styles.workSection} id="work" aria-labelledby="work-title">
      <motion.div
        key={ready ? "work-intro-ready" : "work-intro-server"}
        className={styles.sectionIntro}
        initial={entrance ? { opacity: 0, y: 20 } : false}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.35 }}
        transition={{ duration: reduced ? 0 : 0.62, ease: EASE_OUT }}
      >
        <h2 id="work-title">Built where the interesting problems live.</h2>
        <p>Native apps, agent infrastructure, Linux systems. Pick a project to inspect the work.</p>
      </motion.div>

      <motion.div
        key={ready ? "project-explorer-ready" : "project-explorer-server"}
        className={projectStyles.projectExplorer}
        layout="size"
        initial={entrance ? { opacity: 0, scale: 0.985, y: 22 } : false}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={{ duration: reduced ? 0 : 0.56, ease: EASE_OUT, layout: { duration: reduced ? 0 : 0.42, ease: EASE_OUT } }}
      >
        <ProjectNavigation activeId={activeProject.id} reduced={reduced} onSelect={setActiveId} />
        <ProjectPanel project={activeProject} reduced={reduced} />
      </motion.div>

      <noscript>
        <nav className={projectStyles.noScriptProjects} aria-label="Project links">
          {portfolioProjects.map((project) => (
            <a key={project.id} href={project.href} target="_blank" rel="noreferrer">
              {project.name} <ArrowUpRight aria-hidden="true" />
            </a>
          ))}
        </nav>
      </noscript>
    </section>
  );
}

export function SignalDesk() {
  const { ready, reduced } = useReducedMotionPreference();
  const entrance = ready && !reduced;

  return (
    <div className={styles.page} id="top">
      <PondEnvironment reduced={reduced} />
      <p className={styles.srOnly}>The decorative pond responds to pointer movement. Right-click open water, or double-tap it on touch devices, to feed the fish.</p>

      <header className={styles.header}>
        <a className={styles.brand} href="#top">
          <ProfileCard reducedMotion={reduced} compact />
          <span className={styles.srOnly}>Back to top</span>
        </a>
        <nav aria-label="Portfolio navigation">
          <a href="#work">Work</a>
          <Link href="/pip" className={styles.pipNavLink}><PipFace /> Pip</Link>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </nav>
      </header>

      <div className={styles.content}>
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>Software engineer</span>
            <h1 id="hero-title">I make stubborn software <em>behave.</em></h1>
            <p>I build Orchid.ai’s native Android app, agent systems, and Linux tools that do the useful part without making a fuss.</p>
            <div className={styles.heroActions}>
              <a href="#work">See the work <ArrowDown aria-hidden="true" /></a>
              <a href={portfolioIdentity.calendar}>Start a conversation <Mail aria-hidden="true" /></a>
            </div>
          </div>
        </section>

        <PipFeature />

        <ProjectExplorer reduced={reduced} entrance={entrance} ready={ready} />

        <section className={styles.aboutSection} id="about" aria-labelledby="about-title">
          <motion.div
            key={ready ? "about-lead-ready" : "about-lead-server"}
            className={styles.aboutLead}
            initial={entrance ? { opacity: 0, y: 20 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.28 }}
            transition={{ duration: motionValue(reduced, 0.62), ease: EASE_OUT }}
          >
            <h2 id="about-title">Practical systems. Properly finished.</h2>
            <p>I work across native apps, agent infrastructure, Linux, and the awkward seams between them. I like the problems where “mostly works” is still broken.</p>
          </motion.div>

          <motion.article
            key={ready ? "iniuria-ready" : "iniuria-server"}
            className={styles.iniuriaCard}
            initial={entrance ? { opacity: 0, scale: 0.965, y: 24 } : false}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, amount: 0.32 }}
            transition={{ duration: motionValue(reduced, 0.56), ease: EASE_OUT }}
          >
            <span className={projectStyles.projectEyebrow}>Iniuria.us</span>
            <h3>Automation with an actual job to do.</h3>
            <p>Discord automation, internal admin panels, and AI-assisted support triage built around the daily realities of an active community.</p>
            <div className={projectStyles.proofRow}><span>Discord systems</span><span>Admin tooling</span><span>AI triage</span></div>
          </motion.article>

          <motion.div
            key={ready ? "more-work-ready" : "more-work-server"}
            className={styles.moreWork}
            initial={entrance ? { opacity: 0, y: 12 } : false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.18 }}
            transition={{ duration: motionValue(reduced, 0.58), ease: EASE_OUT }}
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
          key={ready ? "contact-ready" : "contact-server"}
          className={styles.contactSection}
          id="contact"
          aria-labelledby="contact-title"
          initial={entrance ? { opacity: 0, scale: 0.975, y: 24 } : false}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, amount: 0.28 }}
          transition={{ duration: motionValue(reduced, 0.56), ease: EASE_OUT }}
        >
          <div className={styles.contactIntro}>
            <h2 id="contact-title">Got a useful problem?</h2>
            <p>Native apps, agent infrastructure, strange systems, and software that needs to behave.</p>
          </div>
          <div className={styles.contactBooking}>
            <span className={styles.contactLabel}>Book a call</span>
            <h3>Tell me what you’re working on.</h3>
            <div className={styles.contactFacts} aria-label="Booking details">
              <span><Globe2 aria-hidden="true" /> Cal.com / luinbytes</span>
              <span><MapPin aria-hidden="true" /> Europe / London</span>
            </div>
            <a className={styles.contactCta} href={portfolioIdentity.calendar}>Start a conversation <ArrowUpRight aria-hidden="true" /></a>
          </div>
        </motion.section>
      </div>

      <SiteFooter reduced={reduced} entrance={entrance} ready={ready} />
    </div>
  );
}
