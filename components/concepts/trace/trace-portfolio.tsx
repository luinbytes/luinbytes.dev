"use client";

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  ArrowDown,
  ArrowUpRight,
  Github,
  MapPin,
  Menu,
  Radio,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { portfolioIdentity, portfolioProjects } from "@/lib/portfolio-content";
import styles from "./trace.module.css";

const conceptLinks = [
  { label: "Signal field", href: "/concepts/signal-field" },
  { label: "Signal desk", href: "/concepts/signal-desk" },
];

const principles = [
  {
    title: "Follow the friction",
    detail: "The sharp edge is usually more interesting than the feature list.",
  },
  {
    title: "Respect the native seam",
    detail: "Use the system's strengths before adding another layer on top.",
  },
  {
    title: "Leave a useful artifact",
    detail: "A good build should survive the demo and help someone tomorrow.",
  },
];

const reveal = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

export default function TracePortfolio() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const reducedMotion = useReducedMotion();
  const workRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: workRef,
    offset: ["start 85%", "end 55%"],
  });
  const traceOffset = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const activeProject = portfolioProjects[activeIndex];
  const setProject = (index: number) => {
    setActiveIndex(Math.max(0, Math.min(index, portfolioProjects.length - 1)));
  };

  return (
    <div className={styles.tracePage}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a className={styles.wordmark} href="#top" aria-label="Lu, back to top">
            <span className={styles.wordmarkMark}>LU</span>
            <span className={styles.wordmarkText}>TRACE / 01</span>
          </a>

          <button
            className={styles.menuButton}
            type="button"
            aria-expanded={menuOpen}
            aria-controls="trace-navigation"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>

          <nav
            id="trace-navigation"
            className={styles.navigation}
            data-open={menuOpen}
            aria-label="Portfolio navigation"
          >
            <a href="#work" onClick={() => setMenuOpen(false)}>
              Work
            </a>
            <a href="#approach" onClick={() => setMenuOpen(false)}>
              Approach
            </a>
            <a href="#about" onClick={() => setMenuOpen(false)}>
              About
            </a>
            <a href="#contact" onClick={() => setMenuOpen(false)}>
              Contact
            </a>
            <span className={styles.navDivider} aria-hidden="true" />
            {conceptLinks.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)}>
                {link.label}
              </a>
            ))}
          </nav>

          <a className={styles.headerStatus} href={portfolioIdentity.orchid}>
            <span className={styles.statusDot} aria-hidden="true" />
            <span>Orchid.ai</span>
            <ArrowUpRight aria-hidden="true" />
          </a>
        </div>
      </header>

      <main id="top">
        <section className={styles.hero} aria-labelledby="trace-title">
          <div className={styles.container}>
            <div className={styles.heroGrid}>
              <div className={styles.heroCopy}>
                <motion.p
                  className={styles.eyebrow}
                  initial={reducedMotion ? false : reveal.hidden}
                  animate={reveal.visible}
                  transition={{ duration: 0.35, delay: 0.05 }}
                >
                  {portfolioIdentity.role} / {portfolioIdentity.location}
                </motion.p>
                <motion.h1
                  id="trace-title"
                  initial={reducedMotion ? false : reveal.hidden}
                  animate={reveal.visible}
                  transition={{ duration: 0.65, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
                >
                  <span>Follow</span>
                  <span className={styles.heroAccent}>the annoying</span>
                  <span>bit.</span>
                </motion.h1>
                <motion.p
                  className={styles.heroLede}
                  initial={reducedMotion ? false : reveal.hidden}
                  animate={reveal.visible}
                  transition={{ duration: 0.45, delay: 0.25 }}
                >
                  I&apos;m Lu. I build software across agents, Android, Linux,
                  desktop utilities, and game runtimes. The medium changes. The
                  instinct doesn&apos;t.
                </motion.p>
                <motion.div
                  className={styles.heroActions}
                  initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.36 }}
                >
                  <a className={styles.primaryAction} href="#work">
                    Explore the trace
                    <ArrowDown aria-hidden="true" />
                  </a>
                  <a className={styles.textAction} href={portfolioIdentity.github}>
                    <Github aria-hidden="true" />
                    GitHub
                    <ArrowUpRight aria-hidden="true" />
                  </a>
                </motion.div>
              </div>

              <motion.aside
                className={styles.heroSignal}
                aria-label="A visual summary of Lu's work"
                initial={reducedMotion ? false : { opacity: 0, scale: 0.92, rotate: -4 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 0.8, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className={styles.signalOrb}>
                  <motion.div
                    className={styles.signalOrbitOuter}
                    animate={reducedMotion ? undefined : { rotate: 360 }}
                    transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
                  />
                  <motion.div
                    className={styles.signalOrbitInner}
                    animate={reducedMotion ? undefined : { rotate: -360 }}
                    transition={{ duration: 16, repeat: Infinity, ease: "linear" }}
                  />
                  <span className={styles.signalCore}>LU</span>
                  <span className={`${styles.signalLabel} ${styles.signalLabelTop}`}>
                    notice
                  </span>
                  <span className={`${styles.signalLabel} ${styles.signalLabelRight}`}>
                    understand
                  </span>
                  <span className={`${styles.signalLabel} ${styles.signalLabelBottom}`}>
                    rebuild
                  </span>
                  <span className={`${styles.signalLabel} ${styles.signalLabelLeft}`}>
                    ship
                  </span>
                </div>
                <div className={styles.signalCaption}>
                  <Radio aria-hidden="true" />
                  <span>one useful signal at a time</span>
                </div>
              </motion.aside>
            </div>

            <a className={styles.scrollCue} href="#now">
              <span>Start at the current signal</span>
              <ArrowDown aria-hidden="true" />
            </a>
          </div>
        </section>

        <section id="now" className={`${styles.section} ${styles.nowSection}`}>
          <div className={styles.container}>
            <motion.div
              className={styles.sectionIntro}
              initial={false}
              whileInView={reveal.visible}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.45 }}
            >
              <p className={styles.sectionLabel}>Current signal</p>
              <h2>Right now, I&apos;m building at Orchid.ai.</h2>
            </motion.div>
            <div className={styles.nowGrid}>
              <motion.p
                className={styles.nowStatement}
                initial={false}
                whileInView={reveal.visible}
                viewport={{ once: true, amount: 0.35 }}
                transition={{ duration: 0.45, delay: 0.08 }}
              >
                Good software gets more interesting when it has to meet the
                real world. I&apos;m interested in the seam between a person and
                a stubborn system, where a small, well-placed tool can change
                the whole day.
              </motion.p>
              <dl className={styles.nowDetails}>
                <div>
                  <dt>Role</dt>
                  <dd>{portfolioIdentity.role}</dd>
                </div>
                <div>
                  <dt>Based</dt>
                  <dd>{portfolioIdentity.location}</dd>
                </div>
                <div>
                  <dt>Open source</dt>
                  <dd>Systems, utilities, experiments</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <section
          id="work"
          ref={workRef}
          className={`${styles.section} ${styles.workSection}`}
          aria-labelledby="work-title"
        >
          <div className={styles.container}>
            <div className={styles.sectionIntroWide}>
              <p className={styles.sectionLabel}>Selected repositories</p>
              <h2 id="work-title">A trail of useful things.</h2>
              <p>
                Four featured projects, chosen for the shape of the problem
                as much as the code that came out of it.
              </p>
            </div>

            <div className={styles.workLayout}>
              <div className={styles.projectIndex}>
                <div className={styles.indexHeader}>
                  <span className={styles.sectionLabel}>Trace index</span>
                  <span className={styles.indexCount}>
                    {String(activeIndex + 1).padStart(2, "0")} / {String(portfolioProjects.length).padStart(2, "0")}
                  </span>
                </div>
                <div className={styles.traceList}>
                  <svg
                    className={styles.traceLine}
                    viewBox="0 0 48 520"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <path
                      className={styles.traceLineBase}
                      d="M24 8 C4 70 44 110 24 170 S4 250 24 320 S44 400 24 512"
                    />
                    <motion.path
                      className={styles.traceLineProgress}
                      d="M24 8 C4 70 44 110 24 170 S4 250 24 320 S44 400 24 512"
                      pathLength="1"
                      style={{ strokeDashoffset: traceOffset }}
                    />
                  </svg>
                  {portfolioProjects.map((project, index) => {
                    const isActive = index === activeIndex;
                    return (
                      <motion.button
                        key={project.id}
                        type="button"
                        className={styles.projectRow}
                        data-active={isActive}
                        aria-pressed={isActive}
                        onClick={() => setProject(index)}
                        onFocus={() => setProject(index)}
                        whileHover={reducedMotion ? undefined : { x: 6 }}
                        transition={{ duration: 0.18 }}
                      >
                        <span className={styles.projectMarker} aria-hidden="true" />
                        <span className={styles.projectNumber}>
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className={styles.projectNameGroup}>
                          <strong>{project.name}</strong>
                          <small>{project.category}</small>
                        </span>
                        <ArrowUpRight className={styles.projectArrow} aria-hidden="true" />
                      </motion.button>
                    );
                  })}
                </div>
                <div className={styles.scrubber}>
                  <label htmlFor="trace-scrubber">Scrub the trace</label>
                  <output htmlFor="trace-scrubber">{activeProject.name}</output>
                  <input
                    id="trace-scrubber"
                    type="range"
                    min="0"
                    max={portfolioProjects.length - 1}
                    step="1"
                    value={activeIndex}
                    aria-label="Choose a repository"
                    onChange={(event) => setProject(Number(event.target.value))}
                  />
                </div>
              </div>

              <div className={styles.detailColumn}>
                <div className={styles.detailKicker} aria-live="polite">
                  <span className={styles.detailPulse} aria-hidden="true" />
                  currently tracing / {activeProject.category}
                </div>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.article
                    key={activeProject.id}
                    className={styles.projectDetail}
                    initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reducedMotion ? undefined : { opacity: 0, y: -10 }}
                    transition={{ duration: reducedMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
                    aria-labelledby={`project-${activeProject.id}`}
                  >
                    <p className={styles.detailCategory}>{activeProject.category}</p>
                    <h3 id={`project-${activeProject.id}`}>{activeProject.name}</h3>
                    <p className={styles.detailSummary}>{activeProject.summary}</p>
                    <p className={styles.detailBody}>{activeProject.detail}</p>
                    <dl className={styles.projectMeta}>
                      <div>
                        <dt>Built with</dt>
                        <dd>
                          {activeProject.stack.map((item) => (
                            <span key={item}>{item}</span>
                          ))}
                        </dd>
                      </div>
                      <div>
                        <dt>Proof</dt>
                        <dd>Public source, open to inspection</dd>
                      </div>
                    </dl>
                    <a
                      className={styles.detailAction}
                      href={activeProject.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open repository
                      <ArrowUpRight aria-hidden="true" />
                    </a>
                  </motion.article>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </section>

        <section id="approach" className={`${styles.section} ${styles.approachSection}`}>
          <div className={styles.container}>
            <div className={styles.splitHeading}>
              <p className={styles.sectionLabel}>Working theory</p>
              <h2>Three habits that keep the work honest.</h2>
            </div>
            <div className={styles.principleList}>
              {principles.map((principle, index) => (
                <motion.article
                  key={principle.title}
                  className={styles.principle}
                  initial={false}
                  whileInView={reveal.visible}
                  viewport={{ once: true, amount: 0.4 }}
                  transition={{ duration: 0.38, delay: index * 0.08 }}
                >
                  <span className={styles.principleIndex}>{String(index + 1).padStart(2, "0")}</span>
                  <h3>{principle.title}</h3>
                  <p>{principle.detail}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className={`${styles.section} ${styles.aboutSection}`}>
          <div className={styles.container}>
            <div className={styles.aboutGrid}>
              <div>
                <p className={styles.sectionLabel}>Origin story</p>
                <h2>The medium changed. The instinct didn&apos;t.</h2>
              </div>
              <div className={styles.aboutCopy}>
                <p>
                  I started with jailbreaks, modding, firmware rabbit holes,
                  and the slightly dangerous belief that every black box was
                  asking to be opened.
                </p>
                <p>
                  These days that curiosity shows up in native apps, Linux
                  tools, automation, and runtime systems. I still want to
                  understand what is really happening, then make the useful
                  version easier to reach.
                </p>
                <div className={styles.aboutStamp}>
                  <MapPin aria-hidden="true" />
                  <span>United Kingdom / open to good problems</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className={`${styles.section} ${styles.contactSection}`}>
          <div className={styles.container}>
            <div className={styles.contactSignal} aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <p className={styles.sectionLabel}>Make contact</p>
            <h2>Have a strange problem?</h2>
            <p className={styles.contactLede}>
              Send the sharp edge. I like working out what is actually going on.
            </p>
            <div className={styles.contactLinks}>
              <a className={styles.contactEmail} href={portfolioIdentity.email}>
                0x6c75@protonmail.com
                <ArrowUpRight aria-hidden="true" />
              </a>
              <a href={portfolioIdentity.github} target="_blank" rel="noopener noreferrer">
                GitHub
                <ArrowUpRight aria-hidden="true" />
              </a>
              <a href={portfolioIdentity.x} target="_blank" rel="noopener noreferrer">
                X / Twitter
                <ArrowUpRight aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>LU / TRACE / 01</span>
        <span>Notice → understand → rebuild → ship</span>
        <a href="#top">Back to top ↑</a>
      </footer>
    </div>
  );
}
