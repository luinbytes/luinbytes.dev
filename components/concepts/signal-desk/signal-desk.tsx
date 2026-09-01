"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowDown,
  ArrowUpRight,
  Cable,
  Github,
  Mail,
  Music2,
  Radio,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import { portfolioIdentity, portfolioProjects, type PortfolioProject } from "@/lib/portfolio-content";
import styles from "./signal-desk.module.css";

const bubbles = [
  [6, 10, 0.55, 13], [12, 72, 0.8, 8], [19, 38, 0.65, 10], [25, 87, 0.9, 6],
  [34, 19, 0.72, 11], [42, 64, 0.5, 15], [49, 92, 0.82, 9], [58, 31, 0.62, 12],
  [64, 77, 0.94, 7], [71, 15, 0.7, 10], [78, 56, 0.58, 14], [84, 84, 0.88, 8],
  [91, 27, 0.66, 12], [96, 68, 0.76, 9],
] as const;

const fish = [
  { top: "13%", delay: "-4s", duration: "24s", scale: 0.78, tone: "sun" },
  { top: "31%", delay: "-17s", duration: "31s", scale: 0.5, tone: "coral" },
  { top: "56%", delay: "-10s", duration: "27s", scale: 0.64, tone: "mint" },
  { top: "78%", delay: "-24s", duration: "35s", scale: 0.46, tone: "blue" },
] as const;

const supportingWork = [
  { name: "Bongo Cat", note: "Cross-platform desktop companion", href: "https://github.com/luinbytes/bongocat" },
  { name: "file-deduplicator", note: "Safe parallel duplicate finder", href: "https://github.com/luinbytes/file-deduplicator" },
  { name: "cursor-barrier", note: "Linux input daemon in C", href: "https://github.com/luinbytes/cursor-barrier" },
  { name: "ByteBot", note: "Stateful Discord operations", href: "https://github.com/luinbytes/bytebot-definitive-edition" },
] as const;

function AmbientAquarium() {
  return (
    <div className={styles.aquarium} aria-hidden="true">
      <div className={styles.sunwash} />
      <div className={styles.caustics} />
      <div className={styles.horizon} />
      <div className={styles.bubbles}>
        {bubbles.map(([left, bottom, scale, duration], index) => (
          <span
            key={`${left}-${bottom}`}
            style={{
              "--bubble-left": `${left}%`,
              "--bubble-bottom": `${bottom}%`,
              "--bubble-scale": scale,
              "--bubble-duration": `${duration}s`,
              "--bubble-delay": `${index * -1.7}s`,
            } as CSSProperties}
          />
        ))}
      </div>
      {fish.map((item) => (
        <div
          className={`${styles.fish} ${styles[`fish${item.tone}`]}`}
          key={`${item.top}-${item.delay}`}
          style={{
            "--fish-top": item.top,
            "--fish-delay": item.delay,
            "--fish-duration": item.duration,
            "--fish-scale": item.scale,
          } as CSSProperties}
        >
          <span className={styles.fishBody}><i /></span>
        </div>
      ))}
      <div className={styles.seabed} />
      <div className={styles.pointerGlow} />
      <div className={styles.glitter} />
    </div>
  );
}

function ProjectArtwork({ project }: { project: PortfolioProject }) {
  if (project.id === "rakazo-android") {
    return (
      <div className={styles.rakazoArtwork} aria-label="Stylised native Android conversation flow">
        <div className={styles.androidPhone}>
          <div className={styles.androidStatus}><span>9:41</span><i /><i /><i /></div>
          <div className={styles.androidTitle}>
            <Image src="/images/portfolio/rakazo-icon.png" alt="" width={36} height={36} />
            <span><strong>Rakazo</strong><small>agent online</small></span>
            <i />
          </div>
          <div className={styles.androidChat}>
            <p>Keep the answer linked to the original request.</p>
            <p>Done. The delegated reply is surfaced and the thread stays authoritative.</p>
            <span><i /> mobile sync live</span>
          </div>
          <div className={styles.androidComposer}><span>Message Rakazo…</span><i>↑</i></div>
        </div>
        <div className={styles.androidAnnotations}>
          <span>COMPOSE NATIVE</span><span>DURABLE REPLIES</span><span>FAST LONG CHATS</span>
        </div>
      </div>
    );
  }

  if (project.id === "linux-sonar") {
    return (
      <div className={styles.sonarArtwork} aria-label="Five Linux audio channels visualised as a signal mixer">
        <div className={styles.sonarWave}><i /><i /><i /><i /><i /><i /><i /><i /><i /></div>
        <div className={styles.mixerTracks}>
          {['GAME', 'CHAT', 'MEDIA', 'AUX', 'MIC'].map((label, index) => (
            <div key={label}>
              <span className={styles.meter}><i style={{ height: `${42 + index * 11}%` }} /></span>
              <strong>{label}</strong>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!project.image) return null;

  return (
    <div className={`${styles.projectArtwork} ${styles[`artwork${project.id.replace('-', '')}`]}`}>
      <Image src={project.image} alt={project.imageAlt ?? ""} fill sizes="(max-width: 760px) 92vw, 46vw" priority={project.id === "orchid-android"} />
      {project.id === "orchid-android" && (
        <>
          <div className={styles.orchidFilmstrip} aria-hidden="true">
            <span><Image src="/images/portfolio/orchid-coffee.jpg" alt="" fill sizes="120px" /></span>
            <span><Image src="/images/portfolio/orchid-notes.jpg" alt="" fill sizes="120px" /></span>
          </div>
          <div className={styles.orchidBadge}>
            <Image src="/images/portfolio/orchid-icon.png" alt="" width={54} height={54} />
            <span><small>NOW BUILDING</small>ORCHID FOR ANDROID</span>
          </div>
        </>
      )}
    </div>
  );
}

function PatchCable({ activeIndex, reduced }: { activeIndex: number; reduced: boolean }) {
  const endY = 47 + activeIndex * 58;
  const path = `M 17 42 C 98 42, 86 ${endY}, 196 ${endY}`;

  return (
    <svg className={styles.patchCable} viewBox="0 0 220 240" preserveAspectRatio="none" aria-hidden="true">
      <motion.path
        d={path}
        initial={reduced ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: reduced ? 0 : 0.55, ease: [0.23, 1, 0.32, 1] }}
      />
      <circle cx="17" cy="42" r="7" />
      <motion.circle
        cx="196"
        animate={{ cy: endY }}
        r="7"
        transition={{ duration: reduced ? 0 : 0.45, ease: [0.645, 0.045, 0.355, 1] }}
      />
    </svg>
  );
}

function ProjectDesk({ reduced }: { reduced: boolean }) {
  const [activeId, setActiveId] = useState(portfolioProjects[0]?.id ?? "orchid-android");
  const activeIndex = Math.max(0, portfolioProjects.findIndex((project) => project.id === activeId));
  const activeProject = portfolioProjects[activeIndex] ?? portfolioProjects[0];

  if (!activeProject) return null;

  return (
    <section className={styles.workSection} id="work" aria-labelledby="work-title">
      <div className={styles.sectionHeading}>
        <span className={styles.kicker}><Cable aria-hidden="true" /> Interactive patchbay</span>
        <h2 id="work-title">Route the signal.<br /><em>Inspect the work.</em></h2>
        <p>Four channels, ordered by what I’m doing now. Pick one to reroute the desk.</p>
      </div>

      <div className={styles.deskShell} data-channel={activeIndex + 1}>
        <div className={styles.deskTopbar}>
          <span>LUINBYTES PERSONAL SIGNAL DESK</span>
          <span className={styles.online}><i /> ONLINE / {String(activeIndex + 1).padStart(2, "0")}</span>
        </div>

        <div className={styles.deskGrid}>
          <div className={styles.patchPanel}>
            <div className={styles.patchLegend}><span>INPUT</span><span>SELECT OUTPUT</span></div>
            <PatchCable activeIndex={activeIndex} reduced={reduced} />
            <div className={styles.channelButtons} role="list" aria-label="Featured work channels">
              {portfolioProjects.map((project, index) => {
                const active = project.id === activeProject.id;
                return (
                  <button
                    type="button"
                    key={project.id}
                    onClick={() => setActiveId(project.id)}
                    className={active ? styles.activeChannel : ""}
                    aria-pressed={active}
                  >
                    <span className={styles.channelJack}><i /></span>
                    <span className={styles.channelNumber}>0{index + 1}</span>
                    <span><strong>{project.name}</strong><small>{project.category}</small></span>
                    <Radio aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.article
              className={styles.projectReadout}
              key={activeProject.id}
              initial={reduced ? false : { opacity: 0, transform: "translateY(12px) scale(0.985)" }}
              animate={{ opacity: 1, transform: "translateY(0) scale(1)" }}
              exit={reduced ? undefined : { opacity: 0, transform: "translateY(-8px) scale(0.99)" }}
              transition={{ duration: reduced ? 0 : 0.24, ease: [0.215, 0.61, 0.355, 1] }}
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
                  <a href={activeProject.href} target="_blank" rel="noreferrer">Open channel <ArrowUpRight aria-hidden="true" /></a>
                  {activeProject.secondaryHref && (
                    <a className={styles.secondaryAction} href={activeProject.secondaryHref} target="_blank" rel="noreferrer">
                      {activeProject.secondaryLabel} <ArrowUpRight aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>
            </motion.article>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

export function SignalDesk() {
  const pageRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const reducedMotion = Boolean(useReducedMotion());

  const workStatus = useMemo(() => [
    "Native Android at Orchid.ai",
    "Open source across Android, Rust, and Linux",
    "Based in the United Kingdom",
  ], []);

  useEffect(() => () => {
    void audioRef.current?.close();
  }, []);

  const updatePointer = (event: PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || !pageRef.current) return;
    pageRef.current.style.setProperty("--pointer-x", `${event.clientX}px`);
    pageRef.current.style.setProperty("--pointer-y", `${event.clientY}px`);
  };

  const toggleSound = async () => {
    if (audioRef.current) {
      await audioRef.current.close();
      audioRef.current = null;
      setSoundOn(false);
      return;
    }

    const context = new AudioContext();
    const master = context.createGain();
    const low = context.createOscillator();
    const shimmer = context.createOscillator();
    const lowGain = context.createGain();
    const shimmerGain = context.createGain();
    low.type = "sine";
    low.frequency.value = 54;
    shimmer.type = "sine";
    shimmer.frequency.value = 246;
    lowGain.gain.value = 0.012;
    shimmerGain.gain.value = 0.0025;
    master.gain.value = 0.65;
    low.connect(lowGain).connect(master);
    shimmer.connect(shimmerGain).connect(master);
    master.connect(context.destination);
    low.start();
    shimmer.start();
    audioRef.current = context;
    setSoundOn(true);
  };

  return (
    <div className={styles.page} ref={pageRef} onPointerMove={updatePointer}>
      <AmbientAquarium />

      <header className={styles.header}>
        <a className={styles.brand} href="#top" aria-label="Lu, back to top">
          <span className={styles.brandOrb}><Image src="/images/portfolio/lu-avatar.jpg" alt="" width={38} height={38} priority /></span>
          <span><strong>LU / 6C75</strong><small>PERSONAL SIGNAL</small></span>
        </a>
        <nav aria-label="Portfolio navigation">
          <a href="#work">Work</a>
          <a href="#about">Operator</a>
          <a href="#contact">Contact</a>
        </nav>
        <button type="button" className={styles.soundToggle} onClick={toggleSound} aria-pressed={soundOn}>
          {soundOn ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
          <span>{soundOn ? "sound on" : "sound off"}</span>
        </button>
      </header>

      <main id="top">
        <section className={styles.hero} aria-labelledby="hero-title">
          <motion.div
            className={styles.heroCopy}
            initial={reducedMotion ? false : { opacity: 0, transform: "translateY(18px)" }}
            animate={{ opacity: 1, transform: "translateY(0)" }}
            transition={{ duration: reducedMotion ? 0 : 0.55, ease: [0.23, 1, 0.32, 1] }}
          >
            <span className={styles.kicker}><Sparkles aria-hidden="true" /> Portfolio habitat / 2026</span>
            <h1 id="hero-title">I make computers do the <em>useful part.</em></h1>
            <p>Building Orchid.ai’s native Android app, agent systems, and stubbornly practical tools for everything underneath.</p>
            <div className={styles.heroActions}>
              <a href="#work">Explore my work <ArrowDown aria-hidden="true" /></a>
              <a className={styles.glassAction} href={portfolioIdentity.email}>Start a conversation <Mail aria-hidden="true" /></a>
            </div>
          </motion.div>

          <motion.aside
            className={styles.operatorCard}
            initial={reducedMotion ? false : { opacity: 0, transform: "translateY(12px) rotate(1deg)" }}
            animate={{ opacity: 1, transform: "translateY(0) rotate(-1.2deg)" }}
            transition={{ duration: reducedMotion ? 0 : 0.6, delay: reducedMotion ? 0 : 0.16, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className={styles.operatorPortrait}>
              <Image src="/images/portfolio/lu-avatar.jpg" alt="Lu's illustrated avatar wearing a pink cap and holding a Red Bull" fill priority sizes="(max-width: 700px) 62vw, 320px" />
              <span className={styles.avatarSparkle}>✦</span>
            </div>
            <div className={styles.operatorMeta}>
              <span><i /> OPERATOR ONLINE</span>
              <strong>Lu</strong>
              <small>@x6c75</small>
            </div>
          </motion.aside>

          <div className={styles.statusRibbon}>
            {workStatus.map((item) => <span key={item}><i />{item}</span>)}
          </div>
        </section>

        <ProjectDesk reduced={reducedMotion} />

        <section className={styles.aboutSection} id="about" aria-labelledby="about-title">
          <div className={styles.aboutCopy}>
            <span className={styles.kicker}><Music2 aria-hidden="true" /> Operator notes</span>
            <h2 id="about-title">Useful software.<br /><em>No ornamental misery.</em></h2>
            <p>I work across native apps, agent infrastructure, Linux, and the awkward seams between them. The recurring job is simple: find what is missing, understand the real constraints, and make the whole thing dependable.</p>
          </div>

          <article className={styles.iniuriaCard}>
            <span className={styles.windowBar}><i /><i /><i /><strong>INDEPENDENT WORK</strong></span>
            <div>
              <span className={styles.projectEyebrow}>Iniuria.us / side work</span>
              <h3>Automation with an actual job to do.</h3>
              <p>Discord automation, internal admin panels, and AI-assisted support triage built for an active community and its day-to-day operations.</p>
              <div className={styles.proofRow}><span>Discord systems</span><span>Admin tooling</span><span>AI triage</span></div>
            </div>
          </article>
        </section>

        <section className={styles.moreSection} aria-labelledby="more-title">
          <div className={styles.moreHeading}>
            <span className={styles.kicker}><Github aria-hidden="true" /> More signals</span>
            <h2 id="more-title">Small tools.<br /><em>Sharp edges.</em></h2>
          </div>
          <div className={styles.moreGrid}>
            {supportingWork.map((project, index) => (
              <a key={project.name} href={project.href} target="_blank" rel="noreferrer">
                <span>0{index + 5}</span>
                <strong>{project.name}</strong>
                <small>{project.note}</small>
                <ArrowUpRight aria-hidden="true" />
              </a>
            ))}
          </div>
        </section>

        <section className={styles.contactSection} id="contact" aria-labelledby="contact-title">
          <div className={styles.contactOrb}><Image src="/images/portfolio/orchid-icon.png" alt="" width={150} height={150} /></div>
          <div>
            <span className={styles.kicker}><Radio aria-hidden="true" /> Open channel</span>
            <h2 id="contact-title">Got something that should work <em>better?</em></h2>
            <p>Send the signal. Interesting systems, native apps, agent infrastructure, and strange practical problems welcome.</p>
          </div>
          <a href={portfolioIdentity.email}>Start a conversation <ArrowUpRight aria-hidden="true" /></a>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} LU / SIGNAL DESK</span>
        <div>
          <a href={portfolioIdentity.github} target="_blank" rel="noreferrer"><Github aria-hidden="true" /> GitHub</a>
          <a href={portfolioIdentity.x} target="_blank" rel="noreferrer"><Radio aria-hidden="true" /> @x6c75</a>
          <a href={portfolioIdentity.orchid} target="_blank" rel="noreferrer"><Image src="/images/portfolio/orchid-icon.png" alt="" width={16} height={16} /> Orchid.ai</a>
        </div>
      </footer>
    </div>
  );
}
