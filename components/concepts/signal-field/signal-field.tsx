"use client";

import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import Link from "next/link";
import { useRef, useState } from "react";
import { portfolioIdentity, portfolioProjects, type PortfolioProject } from "@/lib/portfolio-content";
import styles from "./signal-field.module.css";

type NodePosition = {
  left: number;
  top: number;
};

const nodePositions: Record<string, NodePosition> = {
  homebot: { left: 22, top: 23 },
  "rakazo-android": { left: 73, top: 19 },
  "linux-sonar": { left: 87, top: 51 },
  bongocat: { left: 68, top: 79 },
  "cursor-barrier": { left: 34, top: 81 },
  ballhammer: { left: 13, top: 52 },
};

const conceptRoutes = [
  { href: "/concepts/signal-field", label: "Signal Field", active: true },
  { href: "/concepts/signal-desk", label: "Signal Desk", active: false },
  { href: "/concepts/trace", label: "Trace", active: false },
];

const principles = [
  {
    title: "Small surfaces, real depth",
    copy: "The best tools do one useful thing exceptionally well, then get out of the way.",
  },
  {
    title: "Meet the platform",
    copy: "Android, Linux, desktop, game runtime: the constraint is part of the material.",
  },
  {
    title: "Ship the proof",
    copy: "A working build, a clear README, and a path for someone else to try it.",
  },
];

function routePath(position: NodePosition) {
  const endX = position.left * 10;
  const endY = position.top * 6.4;
  const controlOneX = 500 + (endX - 500) * 0.28;
  const controlTwoX = 500 + (endX - 500) * 0.72;

  return `M 500 320 C ${controlOneX} 320, ${controlTwoX} ${endY}, ${endX} ${endY}`;
}

function ProjectDossier({ project }: { project: PortfolioProject }) {
  return (
    <div className={styles.dossierContent}>
      <div className={styles.dossierHeading}>
        <div>
          <p className={styles.dossierEyebrow}>{project.category}</p>
          <h3>{project.name}</h3>
        </div>
        <span className={styles.dossierCoordinate}>/{project.id}</span>
      </div>
      <p className={styles.dossierDetail}>{project.detail}</p>
      <div className={styles.dossierFooter}>
        <ul className={styles.stackList} aria-label={`${project.name} technologies`}>
          {project.stack.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <a className={styles.textLink} href={project.href} target="_blank" rel="noreferrer">
          View repository <span aria-hidden="true">↗</span>
        </a>
      </div>
    </div>
  );
}

function ProjectRow({
  project,
  active,
  onSelect,
}: {
  project: PortfolioProject;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <article className={`${styles.projectRow} ${active ? styles.projectRowActive : ""}`}>
      <button
        type="button"
        className={styles.projectRowButton}
        aria-expanded={active}
        onClick={onSelect}
      >
        <span className={styles.projectNumber}>{String(portfolioProjects.indexOf(project) + 1).padStart(2, "0")}</span>
        <span className={styles.projectRowMain}>
          <span className={styles.projectRowName}>{project.name}</span>
          <span className={styles.projectRowSummary}>{project.summary}</span>
        </span>
        <span className={styles.projectRowCategory}>{project.category}</span>
        <span className={styles.projectChevron} aria-hidden="true">{active ? "−" : "+"}</span>
      </button>
      <AnimatePresence initial={false}>
        {active && (
          <motion.div
            className={styles.mobileDossier}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
          >
            <ProjectDossier project={project} />
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}

export function SignalField() {
  const reduceMotion = useReducedMotion();
  const motionDisabled = reduceMotion ?? false;
  const [activeId, setActiveId] = useState<string | null>(null);
  const [listView, setListView] = useState(false);
  const nodeRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const fieldX = useSpring(pointerX, { stiffness: 90, damping: 22, mass: 0.35 });
  const fieldY = useSpring(pointerY, { stiffness: 90, damping: 22, mass: 0.35 });
  const activeProject = portfolioProjects.find((project) => project.id === activeId) ?? null;

  function selectProject(id: string) {
    setActiveId((current) => (current === id ? null : id));
  }

  function handleFieldPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (motionDisabled || event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    pointerX.set(((event.clientX - bounds.left) / bounds.width - 0.5) * -10);
    pointerY.set(((event.clientY - bounds.top) / bounds.height - 0.5) * -8);
  }

  function resetFieldPointer() {
    pointerX.set(0);
    pointerY.set(0);
  }

  function handleNodeKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, id: string) {
    const direction =
      event.key === "ArrowRight" || event.key === "ArrowDown"
        ? 1
        : event.key === "ArrowLeft" || event.key === "ArrowUp"
          ? -1
          : 0;
    if (!direction) return;
    event.preventDefault();
    const currentIndex = portfolioProjects.findIndex((project) => project.id === id);
    const nextIndex = (currentIndex + direction + portfolioProjects.length) % portfolioProjects.length;
    nodeRefs.current[portfolioProjects[nextIndex].id]?.focus();
  }

  return (
    <div className={styles.page}>
      <header className={styles.conceptHeader}>
        <Link href="/" className={styles.brand}>
          luinbytes<span>.</span>dev <small>/ signal field</small>
        </Link>
        <nav className={styles.conceptNav} aria-label="Portfolio concepts">
          {conceptRoutes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              aria-current={route.active ? "page" : undefined}
              className={route.active ? styles.conceptNavActive : ""}
            >
              {route.label}
            </Link>
          ))}
        </nav>
        <a className={styles.headerContact} href={portfolioIdentity.email}>
          Say hello <span aria-hidden="true">↗</span>
        </a>
      </header>

      <main>
        <section className={styles.hero} aria-labelledby="signal-field-title">
          <div className={styles.heroCopy}>
            <p className={styles.kicker}><span className={styles.pulse} aria-hidden="true" /> Personal portfolio / field 01</p>
            <h1 id="signal-field-title">Useful systems,<br /><em>slightly strange.</em></h1>
            <p className={styles.heroIntro}>
              I&apos;m Lu, a software engineer at <a href={portfolioIdentity.orchid} target="_blank" rel="noreferrer">Orchid.ai</a>. I build tools for the edges of everyday computing, from Android clients to Linux utilities and game systems.
            </p>
            <div className={styles.heroActions}>
              <a className={styles.primaryAction} href="#builds">Explore the field <span aria-hidden="true">↓</span></a>
              <button type="button" className={styles.secondaryAction} aria-pressed={listView} onClick={() => setListView((current) => !current)}>
                {listView ? "Show field" : "List view"} <span aria-hidden="true">⌘↗</span>
              </button>
            </div>
            <div className={styles.heroMeta}>
              <span>Based in {portfolioIdentity.location}</span>
              <span className={styles.metaRule} aria-hidden="true" />
              <span>Open source / independent</span>
            </div>
          </div>

          <div className={styles.fieldColumn}>
            <div
              className={styles.fieldSurface}
              onPointerMove={handleFieldPointerMove}
              onPointerLeave={resetFieldPointer}
              aria-label="Interactive repository field"
            >
              <div className={styles.fieldTopline}>
                <span>Move to scout / select to inspect</span>
                <span>6 signals detected</span>
              </div>
              {!listView ? (
                <motion.div className={styles.fieldMap} style={motionDisabled ? undefined : { x: fieldX, y: fieldY }}>
                  <svg className={styles.routeSvg} viewBox="0 0 1000 640" aria-hidden="true" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="route-gradient" x1="0" x2="1">
                        <stop offset="0" stopColor="#d8ff57" stopOpacity="0.16" />
                        <stop offset="1" stopColor="#ff765a" stopOpacity="0.85" />
                      </linearGradient>
                    </defs>
                    {portfolioProjects.map((project, index) => {
                      const position = nodePositions[project.id];
                      return (
                        <motion.path
                          key={project.id}
                          d={routePath(position)}
                          className={activeId === project.id ? styles.routeActive : styles.route}
                          pathLength={1}
                          initial={motionDisabled ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: activeId && activeId !== project.id ? 0.22 : 1 }}
                          transition={{ duration: motionDisabled ? 0 : 0.68, delay: motionDisabled ? 0 : index * 0.055, ease: "easeOut" }}
                        />
                      );
                    })}
                  </svg>
                  <div className={`${styles.contour} ${styles.contourOne}`} aria-hidden="true" />
                  <div className={`${styles.contour} ${styles.contourTwo}`} aria-hidden="true" />
                  <div className={`${styles.contour} ${styles.contourThree}`} aria-hidden="true" />

                  <div className={styles.centerNode}>
                    <span className={styles.centerNodeDot} aria-hidden="true" />
                    <span className={styles.centerNodeLabel}>you are here</span>
                    <strong>{portfolioIdentity.name}</strong>
                    <span>{portfolioIdentity.role}</span>
                  </div>

                  {portfolioProjects.map((project, index) => {
                    const position = nodePositions[project.id];
                    const active = activeId === project.id;
                    return (
                      <div
                        key={project.id}
                        className={styles.nodePosition}
                        style={{ left: `${position.left}%`, top: `${position.top}%` }}
                      >
                        <motion.button
                          ref={(element) => { nodeRefs.current[project.id] = element; }}
                          type="button"
                          className={`${styles.node} ${active ? styles.nodeActive : ""}`}
                          aria-pressed={active}
                          onClick={() => selectProject(project.id)}
                          onKeyDown={(event) => handleNodeKeyDown(event, project.id)}
                          initial={motionDisabled ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.76 }}
                          animate={{ opacity: 1, scale: active ? 1.04 : 1 }}
                          transition={{ duration: motionDisabled ? 0 : 0.3, delay: motionDisabled ? 0 : 0.24 + index * 0.06 }}
                        >
                          <span className={styles.nodeIndex}>{String(index + 1).padStart(2, "0")}</span>
                          <span className={styles.nodeName}>{project.name}</span>
                          <span className={styles.nodeCategory}>{project.category}</span>
                          <span className={styles.nodeArrow} aria-hidden="true">↗</span>
                        </motion.button>
                      </div>
                    );
                  })}
                </motion.div>
              ) : (
                <div className={styles.desktopList}>
                  {portfolioProjects.map((project) => (
                    <ProjectRow key={project.id} project={project} active={activeId === project.id} onSelect={() => selectProject(project.id)} />
                  ))}
                </div>
              )}
              <div className={styles.fieldLegend}>
                <span><i className={styles.legendDot} /> Current role</span>
                <span><i className={`${styles.legendDot} ${styles.legendProject}`} /> Public work</span>
                <span className={styles.fieldCoordinates}>FIELD / UNITED KINGDOM</span>
              </div>
            </div>

            <div className={styles.selectionDossier} role="status" aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                {activeProject ? (
                  <motion.div key={activeProject.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: motionDisabled ? 0 : 0.2 }}>
                    <ProjectDossier project={activeProject} />
                  </motion.div>
                ) : (
                  <motion.div key="empty" className={styles.emptyDossier} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <span className={styles.emptyDossierMark} aria-hidden="true">✳</span>
                    <p>Select a signal to see what I built there.</p>
                    <span className={styles.emptyDossierHint}>Tab through nodes / arrows to move</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        <section id="builds" className={styles.buildsSection} aria-labelledby="builds-title">
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>The public trail</p>
            <h2 id="builds-title">Builds in orbit<span>.</span></h2>
            <p>Six places where curiosity turned into something people can clone, run, or learn from.</p>
          </div>
          <div className={styles.mobileLog}>
            <div className={styles.mobileLogHeader}><span>Field log</span><span>Tap a signal to inspect</span></div>
            {portfolioProjects.map((project) => (
              <ProjectRow key={project.id} project={project} active={activeId === project.id} onSelect={() => selectProject(project.id)} />
            ))}
          </div>
        </section>

        <section id="now" className={styles.orchidSection} aria-labelledby="orchid-title">
          <div className={styles.orchidStamp}>NOW / 01</div>
          <div>
            <p className={styles.kicker}>Current coordinates</p>
            <h2 id="orchid-title">Building with the team at <a href={portfolioIdentity.orchid} target="_blank" rel="noreferrer">Orchid.ai</a><span>.</span></h2>
            <p className={styles.orchidCopy}>My day job is the newest point on the map. This site keeps the lens on the work I can share: independent experiments, open-source tools, and the engineering habits that connect them.</p>
          </div>
          <a className={styles.orchidLink} href={portfolioIdentity.orchid} target="_blank" rel="noreferrer">Visit Orchid.ai <span aria-hidden="true">↗</span></a>
        </section>

        <section id="principles" className={styles.principlesSection} aria-labelledby="principles-title">
          <div className={styles.sectionHeading}>
            <p className={styles.kicker}>The wayfinding rules</p>
            <h2 id="principles-title">What guides the build<span>.</span></h2>
          </div>
          <ol className={styles.principlesList}>
            {principles.map((principle, index) => (
              <li key={principle.title}>
                <span className={styles.principleNumber}>{String(index + 1).padStart(2, "0")}</span>
                <div><h3>{principle.title}</h3><p>{principle.copy}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <section id="origin" className={styles.originSection} aria-labelledby="origin-title">
          <div className={styles.originGraphic} aria-hidden="true"><span>LU</span><i /><i /><i /></div>
          <div className={styles.originCopy}>
            <p className={styles.kicker}>Origin point / {portfolioIdentity.location}</p>
            <h2 id="origin-title">A practical engineer with a soft spot for odd edges.</h2>
            <p>I like the seam between a person and a machine: the tiny friction, the missing affordance, the idea that is almost useful. That is usually where I start.</p>
          </div>
        </section>

        <section id="contact" className={styles.contactSection} aria-labelledby="contact-title">
          <p className={styles.kicker}>End of the line</p>
          <h2 id="contact-title">Have a signal worth following<span>?</span></h2>
          <p>Send me a note, browse the source, or find me in the places below.</p>
          <div className={styles.contactLinks}>
            <a className={styles.primaryAction} href={portfolioIdentity.email}>Email Lu <span aria-hidden="true">↗</span></a>
            <a className={styles.textLink} href={portfolioIdentity.github} target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a>
            <a className={styles.textLink} href={portfolioIdentity.x} target="_blank" rel="noreferrer">X / @x6c75 <span aria-hidden="true">↗</span></a>
          </div>
        </section>
      </main>

      <footer className={styles.conceptFooter}>
        <Link href="/">luinbytes.dev</Link>
        <span>Built in the open / {new Date().getFullYear()}</span>
        <a href="#signal-field-title">Back to top ↑</a>
      </footer>
    </div>
  );
}
