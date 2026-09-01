"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowDown,
  ArrowUpRight,
  Github,
  Mail,
  MousePointer2,
  Sparkles,
} from "lucide-react";
import { portfolioIdentity, portfolioProjects, type PortfolioProject } from "@/lib/portfolio-content";
import styles from "./signal-desk.module.css";

const supportingWork = [
  { name: "Bongo Cat", note: "Cross-platform desktop companion", href: "https://github.com/luinbytes/bongocat" },
  { name: "file-deduplicator", note: "Safe parallel duplicate finder", href: "https://github.com/luinbytes/file-deduplicator" },
  { name: "cursor-barrier", note: "Linux input daemon in C", href: "https://github.com/luinbytes/cursor-barrier" },
  { name: "ByteBot", note: "Stateful Discord operations", href: "https://github.com/luinbytes/bytebot-definitive-edition" },
] as const;

type Ripple = { x: number; y: number; born: number };

function PondEnvironment({ reduced }: { reduced: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (reduced) return;

    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    let frame = 0;
    let running = false;
    let ripples: Ripple[] = [];
    let last = { x: -1000, y: -1000, time: 0 };

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(window.innerWidth * ratio);
      canvas.height = Math.round(window.innerHeight * ratio);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = (now: number) => {
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
      ripples = ripples.filter((ripple) => now - ripple.born < 1650);

      for (const ripple of ripples) {
        if (now < ripple.born) continue;
        const progress = (now - ripple.born) / 1650;
        const eased = 1 - Math.pow(1 - progress, 3);
        const radius = 7 + eased * 76;
        const alpha = Math.pow(1 - progress, 1.7);

        context.save();
        context.translate(ripple.x, ripple.y);
        context.globalCompositeOperation = "screen";

        for (let ring = 0; ring < 2; ring += 1) {
          const ringRadius = radius - ring * 13;
          if (ringRadius <= 0) continue;
          context.beginPath();
          context.ellipse(0, 0, ringRadius, ringRadius * 0.68, 0, 0, Math.PI * 2);
          context.lineWidth = Math.max(0.4, 1.45 - progress);
          context.strokeStyle = `rgba(218, 255, 247, ${alpha * (0.24 - ring * 0.07)})`;
          context.stroke();
        }

        context.globalCompositeOperation = "multiply";
        context.beginPath();
        context.ellipse(1, 3, radius * 0.86, radius * 0.58, 0, 0, Math.PI * 2);
        context.lineWidth = 1;
        context.strokeStyle = `rgba(3, 45, 47, ${alpha * 0.18})`;
        context.stroke();
        context.restore();
      }

      canvas.dataset.rippleCount = String(ripples.length);
      if (ripples.length > 0) {
        frame = requestAnimationFrame(draw);
      } else {
        running = false;
      }
    };

    const start = () => {
      if (running) return;
      running = true;
      frame = requestAnimationFrame(draw);
    };

    const addRipple = (x: number, y: number, delay = 0) => {
      ripples.push({ x, y, born: performance.now() + delay });
      if (ripples.length > 28) ripples = ripples.slice(-28);
      canvas.dataset.rippleCount = String(ripples.length);
      start();
    };

    const move = (event: globalThis.PointerEvent) => {
      const now = performance.now();
      const distance = Math.hypot(event.clientX - last.x, event.clientY - last.y);
      if (distance < 36 && now - last.time < 70) return;
      last = { x: event.clientX, y: event.clientY, time: now };
      addRipple(event.clientX, event.clientY);
    };

    const press = (event: globalThis.PointerEvent) => {
      addRipple(event.clientX, event.clientY);
      addRipple(event.clientX, event.clientY, 120);
      addRipple(event.clientX, event.clientY, 240);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", press, { passive: true });

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", press);
    };
  }, [reduced]);

  return (
    <div className={styles.pond} aria-hidden="true">
      <div className={styles.pondImage} />
      <div className={styles.pondGrade} />
      <div className={`${styles.koi} ${styles.koiOne}`}>
        <Image src="/images/portfolio/koi-kohaku.webp" alt="" fill sizes="180px" priority />
      </div>
      <div className={`${styles.koi} ${styles.koiTwo}`}>
        <Image src="/images/portfolio/koi-ogon.webp" alt="" fill sizes="140px" priority />
      </div>
      <div className={styles.surfaceLight} />
      <canvas ref={canvasRef} className={styles.rippleCanvas} data-ripple-count="0" />
    </div>
  );
}

function ProjectArtwork({ project }: { project: PortfolioProject }) {
  const image = project.id === "linux-sonar" ? "/share-cards/linux-sonar.png" : project.image;

  if (!image) return null;

  if (project.id === "rakazo-android") {
    return (
      <div className={`${styles.projectMedia} ${styles.mediarakazoandroid}`}>
        <div className={styles.rakazoIdentity}>
          <Image src={image} alt={project.imageAlt ?? "Rakazo Android application icon"} width={104} height={104} />
          <span><strong>Rakazo</strong><small>Native Android + upstream</small></span>
        </div>
        <div className={styles.rakazoSignals} aria-label="Highlighted upstream work">
          <span>Delegated replies</span>
          <span>Android parity</span>
          <span>Scheduled group work</span>
          <span>Long-chat performance</span>
        </div>
        <span className={styles.mediaCaption}>{project.category}</span>
      </div>
    );
  }

  return (
    <div className={`${styles.projectMedia} ${styles[`media${project.id.replaceAll("-", "")}`]}`}>
      <Image
        src={image}
        alt={project.imageAlt ?? `${project.name} project artwork`}
        fill
        sizes="(max-width: 820px) 92vw, 48vw"
        priority={project.id === "orchid-android"}
      />
      <span className={styles.mediaCaption}>{project.category}</span>
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
      <div className={styles.sectionIntro}>
        <span className={styles.eyebrow}>Selected work / 2026</span>
        <h2 id="work-title">Built where the interesting problems live.</h2>
        <p>Native apps, agent infrastructure, Linux systems. Pick a project to inspect the work.</p>
      </div>

      <div className={styles.projectExplorer}>
        <div className={styles.projectNav} role="list" aria-label="Featured projects">
          {portfolioProjects.map((project, index) => {
            const active = project.id === activeProject.id;
            return (
              <button
                type="button"
                key={project.id}
                onClick={() => setActiveId(project.id)}
                className={active ? styles.activeProject : ""}
                aria-pressed={active}
              >
                <span>0{index + 1}</span>
                <strong>{project.name}</strong>
                <small>{project.category}</small>
              </button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.article
            className={styles.projectPanel}
            key={activeProject.id}
            initial={reduced ? false : { opacity: 0, transform: "translateY(10px)" }}
            animate={{ opacity: 1, transform: "translateY(0)" }}
            exit={reduced ? undefined : { opacity: 0, transform: "translateY(-8px)" }}
            transition={{ duration: reduced ? 0 : 0.22, ease: [0.23, 1, 0.32, 1] }}
          >
            <ProjectArtwork project={activeProject} />
            <div className={styles.projectCopy}>
              <span className={styles.projectEyebrow}>{activeProject.eyebrow}</span>
              <h3>{activeProject.name}</h3>
              <p className={styles.projectSummary}>{activeProject.summary}</p>
              <p className={styles.projectDetail}>{activeProject.detail}</p>
              <div className={styles.proofRow}>
                {activeProject.proof?.map((item) => <span key={item}>{item}</span>)}
              </div>
              <div className={styles.projectActions}>
                <a href={activeProject.href} target="_blank" rel="noreferrer">
                  View project <ArrowUpRight aria-hidden="true" />
                </a>
                {activeProject.secondaryHref && (
                  <a href={activeProject.secondaryHref} target="_blank" rel="noreferrer">
                    {activeProject.secondaryLabel} <ArrowUpRight aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>
          </motion.article>
        </AnimatePresence>
      </div>
    </section>
  );
}

export function SignalDesk() {
  const reducedMotion = Boolean(useReducedMotion());

  return (
    <div className={styles.page} id="top">
      <PondEnvironment reduced={reducedMotion} />

      <header className={styles.header}>
        <a className={styles.brand} href="#top" aria-label="Lu, back to top">
          <Image src="/images/portfolio/lu-avatar.jpg" alt="" width={38} height={38} priority />
          <span><strong>LU / 6C75</strong><small>SOFTWARE ENGINEER</small></span>
        </a>
        <nav aria-label="Portfolio navigation">
          <a href="#work">Work</a>
          <a href="#about">About</a>
          <a href="#contact">Contact</a>
        </nav>
        <span className={styles.availability}><i /> Building at Orchid.ai</span>
      </header>

      <main id="main">
        <section className={styles.hero} aria-labelledby="hero-title">
          <motion.div
            className={styles.heroCopy}
            initial={reducedMotion ? false : { opacity: 0, transform: "translateY(18px)" }}
            animate={{ opacity: 1, transform: "translateY(0)" }}
            transition={{ duration: reducedMotion ? 0 : 0.6, ease: [0.23, 1, 0.32, 1] }}
          >
            <span className={styles.eyebrow}><Sparkles aria-hidden="true" /> Lu / software engineer</span>
            <h1 id="hero-title">I make stubborn software <em>behave.</em></h1>
            <p>I build Orchid.ai’s native Android app, agent systems, and Linux tools that do the useful part without making a fuss.</p>
            <div className={styles.heroActions}>
              <a href="#work">See the work <ArrowDown aria-hidden="true" /></a>
              <a href={portfolioIdentity.email}>Start a conversation <Mail aria-hidden="true" /></a>
            </div>
          </motion.div>

          <motion.aside
            className={styles.pondNote}
            initial={reducedMotion ? false : { opacity: 0, transform: "translateY(12px)" }}
            animate={{ opacity: 1, transform: "translateY(0)" }}
            transition={{ duration: reducedMotion ? 0 : 0.5, delay: reducedMotion ? 0 : 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            <MousePointer2 aria-hidden="true" />
            <span><strong>Touch the water</strong><small>Move your pointer through the pond.</small></span>
          </motion.aside>
        </section>

        <ProjectExplorer reduced={reducedMotion} />

        <section className={styles.aboutSection} id="about" aria-labelledby="about-title">
          <div className={styles.aboutLead}>
            <span className={styles.eyebrow}>About / how I work</span>
            <h2 id="about-title">Practical systems. Properly finished.</h2>
            <p>I work across native apps, agent infrastructure, Linux, and the awkward seams between them. I like the problems where “mostly works” is still broken.</p>
            <div className={styles.profileLine}>
              <Image src="/images/portfolio/lu-avatar.jpg" alt="Lu's illustrated avatar wearing a pink cap" width={64} height={64} />
              <span><strong>Lu</strong><small>@x6c75 · United Kingdom</small></span>
            </div>
          </div>

          <article className={styles.iniuriaCard}>
            <span className={styles.projectEyebrow}>Independent work / Iniuria.us</span>
            <h3>Automation with an actual job to do.</h3>
            <p>Discord automation, internal admin panels, and AI-assisted support triage built around the daily realities of an active community.</p>
            <div className={styles.proofRow}><span>Discord systems</span><span>Admin tooling</span><span>AI triage</span></div>
          </article>

          <div className={styles.moreWork}>
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
          </div>
        </section>

        <section className={styles.contactSection} id="contact" aria-labelledby="contact-title">
          <span className={styles.eyebrow}>Open channel</span>
          <h2 id="contact-title">Got a useful problem?</h2>
          <p>Native apps, agent infrastructure, strange systems, and software that needs to behave.</p>
          <a href={portfolioIdentity.email}>Start a conversation <ArrowUpRight aria-hidden="true" /></a>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} Lu / 6C75</span>
        <div>
          <a href={portfolioIdentity.github} target="_blank" rel="noreferrer">GitHub</a>
          <a href={portfolioIdentity.x} target="_blank" rel="noreferrer">@x6c75</a>
          <a href={portfolioIdentity.orchid} target="_blank" rel="noreferrer">Orchid.ai</a>
        </div>
      </footer>
    </div>
  );
}
