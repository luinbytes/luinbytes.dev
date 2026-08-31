"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
  Cable,
  CircleDot,
  Github,
  Mail,
  Radio,
  Shuffle,
  TerminalSquare,
} from "lucide-react";
import { portfolioIdentity, portfolioProjects, type PortfolioProject } from "@/lib/portfolio-content";
import styles from "./signal-desk.module.css";

const channelColors = ["coral", "blue", "brass", "lilac", "slate", "rose"] as const;
const conceptLinks = [
  { label: "MVP 02 / Trace", href: "/concepts/trace" },
  { label: "MVP 03 / Signal Field", href: "/concepts/signal-field" },
];

function projectTone(index: number) {
  return channelColors[index % channelColors.length];
}

function CablePath({ index, active, reduced }: { index: number; active: boolean; reduced: boolean }) {
  const y = 42 + index * 39;
  const path = `M 40 ${y} C 126 ${y}, 125 ${active ? 172 : 158}, 222 ${active ? 171 : 154}`;

  return (
    <motion.path
      d={path}
      className={`${styles.cablePath} ${styles[`tone${projectTone(index)}`]} ${active ? styles.cablePathActive : ""}`}
      initial={reduced ? false : { pathLength: 0, opacity: 0.22 }}
      animate={{ pathLength: active || reduced ? 1 : 0.58, opacity: active ? 1 : 0.3 }}
      transition={{ duration: reduced ? 0 : 0.65, ease: [0.22, 1, 0.36, 1] }}
    />
  );
}

function Patchbay({
  projects,
  selectedId,
  onSelect,
  reduced,
}: {
  projects: PortfolioProject[];
  selectedId: string;
  onSelect: (id: string) => void;
  reduced: boolean;
}) {
  return (
    <div className={styles.patchbayShell}>
      <div className={styles.patchbayTopline}>
        <span className={styles.microLabel}>PATCHBAY / 06 CHANNELS</span>
        <span className={styles.signalReady}>
          <span className={styles.readyDot} />
          signal ready
        </span>
      </div>

      <div className={styles.patchbay}>
        <div className={styles.patchbayRail} aria-hidden="true">
          <span>IN</span>
          <span className={styles.railLine} />
          <span>LU / 6C75</span>
        </div>

        <div className={styles.cableArtwork} aria-hidden="true">
          <svg viewBox="0 0 248 264" preserveAspectRatio="none">
            {projects.map((project, index) => (
              <CablePath
                key={project.id}
                index={index}
                active={selectedId === project.id}
                reduced={reduced}
              />
            ))}
          </svg>
        </div>

        <div className={styles.channelList} role="list" aria-label="Portfolio repository channels">
          {projects.map((project, index) => {
            const active = selectedId === project.id;
            return (
              <button
                className={`${styles.channel} ${active ? styles.channelActive : ""}`}
                data-tone={projectTone(index)}
                key={project.id}
                type="button"
                aria-pressed={active}
                onClick={() => onSelect(project.id)}
              >
                <span className={styles.jack} aria-hidden="true">
                  <span />
                </span>
                <span className={styles.channelIndex}>{String(index + 1).padStart(2, "0")}</span>
                <span className={styles.channelName}>{project.name}</span>
                <span className={styles.channelCategory}>{project.category}</span>
                <ArrowUpRight className={styles.channelArrow} aria-hidden="true" />
              </button>
            );
          })}
        </div>

        <div className={styles.patchbayLegend} aria-hidden="true">
          <span>FRICTION</span>
          <span className={styles.legendTicks}>
            <i /> <i /> <i /> <i /> <i />
          </span>
          <span>OUTPUT</span>
        </div>
      </div>
    </div>
  );
}

function SignalReadout({ project, index, reduced }: { project: PortfolioProject; index: number; reduced: boolean }) {
  return (
    <motion.article
      className={`${styles.readout} ${styles[`tone${projectTone(index)}`]}`}
      aria-live="polite"
      layout
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className={styles.readoutHeader}>
        <span className={styles.microLabel}>LIVE READOUT / CH{String(index + 1).padStart(2, "0")}</span>
        <span className={styles.readoutStatus}><CircleDot aria-hidden="true" /> routed</span>
      </div>
      <div className={styles.readoutTitleRow}>
        <div>
          <p className={styles.readoutCategory}>{project.category}</p>
          <h3>{project.name}</h3>
        </div>
        <span className={styles.readoutGlyph} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
      </div>
      <p className={styles.readoutSummary}>{project.summary}</p>
      <div className={styles.readoutGrid}>
        <div>
          <span className={styles.readoutLabel}>BUILD NOTE</span>
          <p>{project.detail}</p>
        </div>
        <div>
          <span className={styles.readoutLabel}>STACK</span>
          <div className={styles.stackList}>
            {project.stack.map((item) => <span key={item}>{item}</span>)}
          </div>
        </div>
      </div>
      <a className={styles.readoutLink} href={project.href} target="_blank" rel="noreferrer">
        Inspect source <ArrowUpRight aria-hidden="true" />
      </a>
    </motion.article>
  );
}

function SectionMarker({ number, label, tone = "coral" }: { number: string; label: string; tone?: string }) {
  return (
    <div className={styles.sectionMarker}>
      <span className={`${styles.markerDot} ${styles[`tone${tone}`]}`} />
      <span>{number}</span>
      <span className={styles.markerRule} />
      <span>{label}</span>
    </div>
  );
}

export function SignalDesk() {
  const [selectedId, setSelectedId] = useState(portfolioProjects[0]?.id ?? "homebot");
  const reducedMotion = useReducedMotion();
  const selectedIndex = Math.max(0, portfolioProjects.findIndex((project) => project.id === selectedId));
  const selectedProject = portfolioProjects[selectedIndex] ?? portfolioProjects[0];
  const nextProject = useMemo(() => {
    if (!portfolioProjects.length) return null;
    return portfolioProjects[(selectedIndex + 1) % portfolioProjects.length];
  }, [selectedIndex]);

  if (!selectedProject) return null;

  const routeNext = () => {
    if (nextProject) setSelectedId(nextProject.id);
  };

  return (
    <div className={styles.page}>
      <div className={styles.paperNoise} aria-hidden="true" />
      <header className={styles.header}>
        <Link href="/" className={styles.wordmark} aria-label="Lu home">
          <span className={styles.wordmarkMark}><span /></span>
          <span>LU / 6C75</span>
        </Link>
        <nav className={styles.headerNav} aria-label="Concept navigation">
          <Link href="/" className={styles.headerLink}>Portfolio home</Link>
          {conceptLinks.map((link) => <Link key={link.href} href={link.href} className={styles.headerLink}>{link.label}</Link>)}
        </nav>
        <a href={portfolioIdentity.email} className={styles.headerContact}>
          <Mail aria-hidden="true" /> say hello
        </a>
      </header>

      <main>
        <section className={styles.hero} aria-labelledby="signal-title">
          <div className={styles.heroCopy}>
            <SectionMarker number="00" label="SIGNAL DESK / PERSONAL PORTFOLIO" />
            <motion.h1
              id="signal-title"
              initial={reducedMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : 0.1 }}
            >
              I build the missing layer between <em>people</em> and systems.
            </motion.h1>
            <motion.p
              className={styles.heroIntro}
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: reducedMotion ? 0 : 0.45, delay: reducedMotion ? 0 : 0.24 }}
            >
              Software engineer at <a href={portfolioIdentity.orchid} target="_blank" rel="noreferrer">Orchid.ai</a>. I make useful things for Android, Linux, AI workflows, and the odd edges where software meets reality.
            </motion.p>
            <div className={styles.heroMeta}>
              <span><Radio aria-hidden="true" /> currently shipping</span>
              <span><span className={styles.liveDot} /> {portfolioIdentity.location}</span>
            </div>
          </div>
          <div className={styles.heroStamp} aria-label="Signal desk status">
            <div className={styles.stampTop}><span>INSTRUMENT / 01</span><span>2026</span></div>
            <div className={styles.stampMark}><span>LU</span><span>↘</span></div>
            <div className={styles.stampBottom}><span>BUILD / ROUTE / VERIFY</span><span>READY</span></div>
          </div>
        </section>

        <section className={styles.consoleSection} id="channels" aria-labelledby="channels-title">
          <div className={styles.sectionIntro}>
            <SectionMarker number="01" label="OPEN CHANNELS" tone="blue" />
            <h2 id="channels-title">Pick a signal.<br /><span>See what it moves.</span></h2>
            <p>Route a repository into the readout. Each channel starts with a small annoyance and ends with something you can actually use.</p>
            <button type="button" className={styles.routeButton} onClick={routeNext}>
              <Shuffle aria-hidden="true" /> route another
            </button>
          </div>

          <div className={styles.consoleGrid}>
            <Patchbay projects={portfolioProjects} selectedId={selectedId} onSelect={setSelectedId} reduced={Boolean(reducedMotion)} />
            <AnimatePresence mode="wait">
              <SignalReadout key={selectedProject.id} project={selectedProject} index={selectedIndex} reduced={Boolean(reducedMotion)} />
            </AnimatePresence>
          </div>
        </section>

        <section className={styles.orchidSection} id="now" aria-labelledby="now-title">
          <div className={styles.orchidPanel}>
            <div className={styles.orchidPanelRail} aria-hidden="true"><span>ORCHID.AI</span><span>01</span></div>
            <div className={styles.orchidContent}>
              <SectionMarker number="02" label="CURRENT WORK" tone="brass" />
              <h2 id="now-title">The signal is live at <span>Orchid.ai.</span></h2>
              <p>I work on software that helps people get useful work done with AI. The details change quickly. The instinct stays the same: find the friction, understand the system, make the next step feel obvious.</p>
              <a className={styles.textLink} href={portfolioIdentity.orchid} target="_blank" rel="noreferrer">Visit Orchid.ai <ArrowUpRight aria-hidden="true" /></a>
            </div>
            <div className={styles.orchidDiagram} aria-hidden="true">
              <svg viewBox="0 0 420 250" preserveAspectRatio="none">
                <path d="M25 126H395" />
                <path d="M104 48v156M210 29v194M316 48v156" />
                <circle cx="104" cy="126" r="17" /><circle cx="210" cy="126" r="24" /><circle cx="316" cy="126" r="17" />
                <path className={styles.diagramAccent} d="M25 126h79m212 0h79M210 29v73m0 48v73" />
                <circle className={styles.diagramPulse} cx="210" cy="126" r="5" />
              </svg>
              <div><span>LISTEN</span><span>MAKE</span><span>LEARN</span></div>
            </div>
          </div>
        </section>

        <section className={styles.philosophySection} id="about" aria-labelledby="about-title">
          <div className={styles.philosophyIntro}>
            <SectionMarker number="03" label="WORKING PHILOSOPHY" tone="lilac" />
            <h2 id="about-title">Useful curiosity<br /><span>over shiny noise.</span></h2>
          </div>
          <div className={styles.philosophyList}>
            <div><span>01</span><h3>Start with the irritation.</h3><p>The best project briefs usually begin as a sentence nobody bothered to write down.</p></div>
            <div><span>02</span><h3>Understand the seams.</h3><p>Good tools respect the systems around them, whether that is PipeWire, Android, or a messy runtime.</p></div>
            <div><span>03</span><h3>Ship the useful version.</h3><p>There is room for polish after the first person can rely on it. That is where the interesting work starts.</p></div>
          </div>
        </section>

        <section className={styles.contactSection} id="contact" aria-labelledby="contact-title">
          <div className={styles.contactCard}>
            <div className={styles.contactIcon}><Cable aria-hidden="true" /></div>
            <div>
              <SectionMarker number="04" label="HANDOFF" tone="coral" />
              <h2 id="contact-title">Have a strange<br /><span>workflow?</span></h2>
              <p>Send the signal. I like hard edges, useful tools, and projects that make the next person’s day a little less annoying.</p>
            </div>
            <a className={styles.contactButton} href={portfolioIdentity.email}>Start a conversation <ArrowUpRight aria-hidden="true" /></a>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} Lu / signal desk</span>
        <div className={styles.footerLinks}>
          <a href={portfolioIdentity.github} target="_blank" rel="noreferrer"><Github aria-hidden="true" /> GitHub</a>
          <a href={portfolioIdentity.x} target="_blank" rel="noreferrer"><Radio aria-hidden="true" /> X / social</a>
          <span><TerminalSquare aria-hidden="true" /> built with intent</span>
        </div>
      </footer>
    </div>
  );
}
