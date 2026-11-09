import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDown, ArrowUpRight, Github, Globe2, Mail, MapPin } from "lucide-react";

import {
  portfolioIdentity,
  portfolioProjects,
  type PortfolioProject,
  type PortfolioProjectId,
} from "@/lib/portfolio-content";
import { PondEnvironment } from "./pond-environment";
import { Button } from "@/components/ui/button";
import { SkulletImage } from "@/components/ui/skullet-image";
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
      <span>© {import.meta.env.BUILD_YEAR} Lu / 6C75</span>
      <div>
        <a href="/privacy">Privacy</a>
        <a href={portfolioIdentity.github} target="_blank" rel="noreferrer">GitHub</a>
        <a href={portfolioIdentity.x} target="_blank" rel="noreferrer">@x6c75</a>
      </div>
    </motion.footer>
  );
}

function ProjectArtwork({ project }: { project: PortfolioProject }) {
  return (
    <div className={projectStyles.projectIllustration}>
      <svg viewBox="0 0 480 360" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path className={projectStyles.artWater} d="M30 292h80m22 0h62m74 0h95m18 0h69M55 310h110m80 0h150M30 68h70m265 0h85" />
        {project.id === "rakazo-android" && <>
          <rect x="161" y="40" width="158" height="270" rx="22" fill="var(--paper)" />
          <path d="M217 60h46M226 289h28" />
          <path className={projectStyles.artAccent} d="M199 140h82v65h-82zM211 140l-9-15m67 15l9-15M222 158v6m36-6v6M218 186h44" />
          <path d="M94 120h42v80H94m252-32h40m-13-13l13 13-13 13M94 246h42m210-16h40v40h-40" />
        </>}
        {project.id === "linux-sonar" && <>
          <rect x="65" y="83" width="350" height="192" rx="12" fill="var(--paper)" />
          {[118,179,240,301,362].map((x,i)=><g key={x}><path d={`M${x} 120v110`} /><rect className={projectStyles.artAccent} x={x-12} y={[150,185,130,165,145][i]} width="24" height="20" rx="3" fill="var(--paper)" /></g>)}
          <path className={projectStyles.artAccent} d="M174 51v-9m18 18V32m18 19v-9m18 18V22m18 29v-9m18 18V32m18 19v-9" />
        </>}
        {project.id === "homebot" && <>
          <path d="M120 182h75m90 0h75M240 98v44m0 80v42" />
          <rect x="195" y="142" width="90" height="80" rx="14" fill="var(--paper)" />
          <path className={projectStyles.artAccent} d="M216 169v8m48-8v8m-45 21h42" />
          <path fill="var(--paper)" d="M52 115h89v62H79l-27 18zm286 71h89v62h-27l-30 20v-20h-32zM196 40h88v58h-55l-33 19z" />
          <path d="M70 137h50m-50 18h29m168-94h-50m138 146h51m-51 19h29" />
        </>}
        {project.id === "connectormap" && <>
          <rect x="73" y="70" width="334" height="216" rx="12" fill="var(--paper)" />
          <path d="M143 70v216M73 124h334M73 178h334M73 232h334m-55-162v216m-70-216v216m-69-216v216" />
          {[[178,151],[247,205],[317,151],[178,259],[317,259]].map(([x,y])=><path key={`${x}-${y}`} className={projectStyles.artAccent} d={`M${x-9} ${y}l6 6 13-14`} />)}
          <path d="M97 98h21m-21 53h21m-21 54h21m-21 54h21m60-161h1m68 0h1m69 0h1m68 0h1" />
        </>}
      </svg>
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
          <Button
            asChild
            variant="ghost"
            key={project.id}
            className={active ? projectStyles.activeProject : ""}
          >
            <motion.button
              type="button"
              onClick={() => onSelect(project.id)}
              aria-pressed={active}
              whileTap={reduced ? undefined : { scale: 0.985 }}
              transition={{ duration: 0.1 }}
            >
              {active && <motion.i className={projectStyles.projectMarker} layoutId="project-marker" transition={{ duration: reduced ? 0 : 0.24, ease: EASE_OUT }} />}
              <strong>{project.name}</strong>
              <small>{project.category}</small>
            </motion.button>
          </Button>
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
              <Button asChild variant="secondary"><a href={project.href} target="_blank" rel="noreferrer">
                View project <ArrowUpRight aria-hidden="true" />
              </a></Button>
              {project.secondaryHref && (
                <Button asChild variant="outline"><a href={project.secondaryHref} target="_blank" rel="noreferrer">
                  {project.secondaryLabel} <ArrowUpRight aria-hidden="true" />
                </a></Button>
              )}
            </div>
          </motion.div>
        </motion.article>
      </AnimatePresence>
    </motion.div>
  );
}

function ProjectExplorer({ reduced, entrance, ready }: { reduced: boolean; entrance: boolean; ready: boolean }) {
  const [activeId, setActiveId] = useState<PortfolioProjectId | undefined>(portfolioProjects[0]?.id);
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
        <span className={styles.eyebrow}>01 / Things I’ve made</span>
        <h2 id="work-title">A few useful obsessions.</h2>
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
  const [pondView, setPondView] = useState<"ascii" | "pixel">("ascii");
  const pageRef = useRef<HTMLDivElement>(null);
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const sync = () => {
      const sections = ["work", "about", "contact"];
      const visible = sections.filter(id => (document.getElementById(id)?.getBoundingClientRect().top ?? Infinity) <= 180);
      const atBottom = window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
      setActiveSection(atBottom ? "contact" : visible.at(-1) ?? "");
    };
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("hashchange", sync);
    sync();
    return () => { window.removeEventListener("scroll", sync); window.removeEventListener("hashchange", sync); };
  }, []);
  const [pondStatus, setPondStatus] = useState<{ mode: string; renderer: string }>({ mode: "ascii", renderer: "loading" });
  const [feedStatus, setFeedStatus] = useState("");
  const entrance = ready && !reduced;

  useEffect(() => {
    const pond = pageRef.current?.querySelector<HTMLElement>("[data-renderer]");
    if (!pond) return;
    const sync = () => setPondStatus({ mode: pond.dataset.view ?? "ascii", renderer: pond.dataset.renderer ?? "loading" });
    const observer = new MutationObserver(sync);
    observer.observe(pond, { attributes: true, attributeFilter: ["data-renderer", "data-view"] });
    sync();
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={pageRef} className={styles.page} id="top">
      <PondEnvironment reduced={reduced} mode={pondView} />
      <p className={styles.srOnly}>The decorative pond responds to pointer movement. Right-click open water, or double-tap it on touch devices, to feed the fish, or use the Feed fish button.</p>

      <header className={styles.header}>
        <a className={styles.brand} href="#top">
          <span className={styles.brandMark}>lu<span aria-hidden="true">.</span></span>
          <span className={styles.brandNote}>a little corner of the internet</span>
          <span className={styles.srOnly}>Back to top</span>
        </a>
        <nav aria-label="Portfolio navigation">
          <a href="#work" aria-current={activeSection === "work" ? "location" : undefined}>Work</a>
          <a href="#about" aria-current={activeSection === "about" ? "location" : undefined}>About</a>
          <a href="#contact" aria-current={activeSection === "contact" ? "location" : undefined}>Contact</a>
        </nav>
      </header>

      <div className={styles.content}>
        <section className={styles.hero} aria-labelledby="hero-title">
          <noscript><style>{`.${styles.pondSwitcher} { display: none; }`}</style></noscript>
          <fieldset className={styles.pondSwitcher}>
            <legend>Pond view</legend>
            <div className={styles.pondChoices}>
              {(["ascii", "pixel"] as const).map((view) => (
                <label key={view} className={styles.pondChoice}>
                  <input type="radio" name="pond-view" value={view} checked={pondView === view} onChange={() => setPondView(view)} />
                  <span><i aria-hidden="true" className={view === "ascii" ? styles.asciiStone : styles.pixelStone} />{view === "ascii" ? "ASCII" : "Pixel"}</span>
                </label>
              ))}
            </div>
            <div className={styles.pondCurrent} aria-live="polite">
              {pondStatus.mode !== pondView || pondStatus.renderer === "loading"
                ? `Loading ${pondView === "ascii" ? "ASCII" : "Pixel"} view…`
                : pondStatus.renderer === "fallback"
                  ? "Pond unavailable. Try the other view."
                  : `Current view: ${pondView === "ascii" ? "ASCII" : "Pixel"}`}
            </div>
            <button type="button" className={styles.feedButton} disabled={pondStatus.renderer !== "three"} onClick={() => {
              const surface = pageRef.current?.querySelector("[data-pond-input]");
              const handled = surface && !surface.dispatchEvent(new Event("pond-feed", { cancelable: true }));
              setFeedStatus(handled ? "Food dropped in the pond." : "No open water visible. Return to the top and try again.");
            }}>Feed fish</button>
            <span className={styles.srOnly} role="status">{feedStatus}</span>
          </fieldset>
          <div className={styles.heroCopy} data-pond-obscures="">
            <div className={styles.introduction}>
              <span className={styles.heroPortrait}>
                <SkulletImage frame label="Loading portrait" src="/images/portfolio/lu-avatar.jpg" width={64} height={64} alt="Lu's illustrated avatar wearing a pink cap" loading="eager" fetchPriority="high" />
              </span>
              <span className={styles.eyebrow}>@x6c75<br />Software engineer</span>
            </div>
            <h1 id="hero-title">Hi, I’m <em>Lu.</em></h1>
            <h2 className={styles.heroStatement}>I make stubborn<br />software behave.</h2>
            <p>I build native Android apps, agent systems, and Linux tools that do the useful part without making a fuss.</p>
            <div className={styles.heroActions}>
              <a href="#work">Things I’ve made <ArrowDown aria-hidden="true" /></a>
              <a href={portfolioIdentity.calendar}>Say hello <Mail aria-hidden="true" /></a>
            </div>
          </div>
          <p className={styles.pondNote} data-pond-obscures=""><span aria-hidden="true">↳</span> Stay a while. Feed the fish.<small>Right click the water · double tap on touch</small></p>
        </section>


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
            <span className={styles.eyebrow}>02 / A bit about me</span>
            <h2 id="about-title">Powered by caffeine<br />and spite.</h2>
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

        <section
          key={ready ? "contact-ready" : "contact-server"}
          className={styles.contactSection}
          id="contact"
          aria-labelledby="contact-title"
        >
          <div className={styles.contactIntro}>
            <span className={styles.eyebrow}>03 / Say hello</span>
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
        </section>
      </div>

      <SiteFooter reduced={reduced} entrance={entrance} ready={ready} />
    </div>
  );
}
