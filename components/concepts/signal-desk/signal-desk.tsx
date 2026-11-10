import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, ArrowUpRight, CalendarDays, Check, Copy, Github, Globe2, Mail, MapPin } from "lucide-react";

import {
  portfolioIdentity,
  portfolioProjects,
  type PortfolioProject,
} from "@/lib/portfolio-content";
import { PondEnvironment } from "./pond-environment";
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
        <a href={`mailto:${portfolioIdentity.email}`}>Email</a>
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

function ProjectCard({ project }: { project: PortfolioProject }) {
  return (
    <article className={projectStyles.projectCard} aria-labelledby={`project-${project.id}`}>
      <div className={projectStyles.projectCopy}>
        <span className={projectStyles.projectEyebrow}>{project.category}</span>
        <h3 id={`project-${project.id}`}>{project.name}</h3>
        {project.figure && (
          <p className={projectStyles.projectFigure}>
            <strong>{project.figure.value}</strong>
            <span>{project.figure.label}</span>
          </p>
        )}
        <p className={projectStyles.projectSummary}>{project.summary}</p>
        <p className={projectStyles.projectDetail}>{project.detail}</p>
        {project.proof && project.proof.length > 0 && (
          <div className={projectStyles.proofRow}>
            {project.proof.map((item) => <span key={item}>{item}</span>)}
          </div>
        )}
        <div className={projectStyles.projectActions}>
          <a href={project.href} target="_blank" rel="noreferrer">
            View project <span className={styles.srOnly}>{project.name}</span> <ArrowUpRight aria-hidden="true" />
          </a>
          {project.secondaryHref && (
            <a href={project.secondaryHref} target="_blank" rel="noreferrer">
              {project.secondaryLabel} <ArrowUpRight aria-hidden="true" />
            </a>
          )}
        </div>
      </div>
      <div className={projectStyles.projectVisual}>
        <ProjectArtwork project={project} />
      </div>
    </article>
  );
}

function ProjectExplorer({ reduced, entrance, ready }: { reduced: boolean; entrance: boolean; ready: boolean }) {
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
        <p>Four projects, what each one actually does, and where to find it.</p>
      </motion.div>

      <motion.div
        key={ready ? "project-grid-ready" : "project-grid-server"}
        className={projectStyles.projectGrid}
        initial={entrance ? { opacity: 0, y: 22 } : false}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.08 }}
        transition={{ duration: reduced ? 0 : 0.56, ease: EASE_OUT }}
      >
        {portfolioProjects.map((project) => <ProjectCard key={project.id} project={project} />)}
      </motion.div>
    </section>
  );
}

function CopyEmailButton() {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2400);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <>
      <button
        type="button"
        className={styles.copyButton}
        aria-label="Copy email address"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(portfolioIdentity.email);
            setCopied(true);
            setStatus("Email address copied.");
          } catch {
            setCopied(false);
            setStatus("Couldn’t copy automatically. The address can be selected and copied.");
          }
        }}
      >
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {copied ? "Copied" : "Copy"}
      </button>
      <span className={styles.srOnly} role="status">{status}</span>
    </>
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
      <p className={styles.srOnly}>The decorative pond responds to pointer movement. Click or tap open water to feed the fish, or use the Feed fish button in the pond controls.</p>

      <header className={styles.header}>
        <a className={styles.brand} href="#top">
          <span className={styles.brandMark}>lu<span aria-hidden="true">.</span></span>
          <span className={styles.brandNote}>a little corner of the internet</span>
          <span className={styles.srOnly}>Back to top</span>
        </a>
        <nav aria-label="Portfolio navigation">
          <a href="#work" aria-current={activeSection === "work" ? "location" : undefined}>Work</a>
          <a href="#about" aria-current={activeSection === "about" ? "location" : undefined}>More</a>
          <a href="#contact" aria-current={activeSection === "contact" ? "location" : undefined}>Contact</a>
        </nav>
      </header>

      <div className={styles.content}>
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy} data-pond-obscures="">
            <div className={styles.introduction}>
              <span className={styles.heroPortrait}>
                <SkulletImage frame label="Loading portrait" src="/images/portfolio/lu-avatar.jpg" width={64} height={64} alt="Lu's illustrated avatar wearing a pink cap" loading="eager" fetchPriority="low" />
              </span>
              <span className={styles.eyebrow}>@x6c75<br />Software engineer</span>
            </div>
            <h1 id="hero-title">Hi, I’m <em>Lu.</em></h1>
            <h2 className={styles.heroStatement}>I make stubborn<br />software behave.</h2>
            <p>I build native Android apps, agent systems, and Linux tools that do the useful part without making a fuss.</p>
            <div className={styles.heroActions}>
              <a href="#work">Things I’ve made <ArrowDown aria-hidden="true" /></a>
              <a href={`mailto:${portfolioIdentity.email}`}>Say hello <Mail aria-hidden="true" /></a>
            </div>
          </div>
          <p className={styles.pondNote} data-pond-obscures=""><span aria-hidden="true">↳</span> Stay a while. Feed the fish.<small>Click or tap the water</small></p>
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
            <span className={styles.eyebrow}>02 / Other work</span>
            <h2 id="about-title">“Mostly works”<br />is still broken.</h2>
            <p>That’s the kind of problem I like. Beyond the four projects above, it has also meant automation for an active community and a handful of small open-source tools.</p>
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
            <p>If something you’re building only mostly works, I’d like to hear about it. Email is the simplest way in; book a call if you’d rather talk it through.</p>
          </div>
          <div className={styles.contactBooking}>
            <span className={styles.contactLabel}>Email or book a call</span>
            <h3>Tell me what you’re working on.</h3>
            <div className={styles.contactEmailRow}>
              <a className={styles.contactEmail} href={`mailto:${portfolioIdentity.email}`}><Mail aria-hidden="true" /> {portfolioIdentity.email}</a>
              <CopyEmailButton />
            </div>
            <div className={styles.contactFacts} aria-label="Booking details">
              <span><Globe2 aria-hidden="true" /> Cal.com / luinbytes</span>
              <span><MapPin aria-hidden="true" /> Europe / London</span>
            </div>
            <a className={styles.contactCta} href={portfolioIdentity.calendar}>Book a call <CalendarDays aria-hidden="true" /></a>
          </div>
        </section>
      </div>

      <noscript><style>{`.${styles.pondSwitcher}, .${styles.copyButton} { display: none; }`}</style></noscript>
      <fieldset className={styles.pondSwitcher}>
        <legend className={styles.srOnly}>Pond view</legend>
        <div className={styles.pondChoices}>
          {(["ascii", "pixel"] as const).map((view) => (
            <label key={view} className={styles.pondChoice}>
              <input type="radio" name="pond-view" value={view} checked={pondView === view} onChange={() => setPondView(view)} />
              <span><i aria-hidden="true" className={view === "ascii" ? styles.asciiStone : styles.pixelStone} />{view === "ascii" ? "ASCII" : "Pixel"}</span>
            </label>
          ))}
        </div>
        <button type="button" className={styles.feedButton} aria-label="Feed fish" disabled={pondStatus.renderer !== "three"} onClick={() => {
          const surface = pageRef.current?.querySelector("[data-pond-input]");
          const handled = surface && !surface.dispatchEvent(new Event("pond-feed", { cancelable: true }));
          setFeedStatus(handled ? "Food dropped in the pond." : "No open water visible. Return to the top and try again.");
        }}><span aria-hidden="true">🐟</span> Feed</button>
        <div className={styles.srOnly} aria-live="polite">
          {pondStatus.mode !== pondView || pondStatus.renderer === "loading"
            ? `Loading ${pondView === "ascii" ? "ASCII" : "Pixel"} view…`
            : pondStatus.renderer === "fallback"
              ? "Pond unavailable. Try the other view."
              : `Current view: ${pondView === "ascii" ? "ASCII" : "Pixel"}`}
        </div>
        <span className={styles.srOnly} role="status">{feedStatus}</span>
      </fieldset>

      <SiteFooter reduced={reduced} entrance={entrance} ready={ready} />
    </div>
  );
}
