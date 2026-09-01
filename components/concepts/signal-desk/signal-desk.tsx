"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ShockwaveFilter } from "pixi-filters";
import type { Buffer, Container, MeshPlane, Sprite } from "pixi.js";
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

type PondRipple = { filter: ShockwaveFilter; born: number; life: number };
type Wake = { born: number; life: number };
type AnimatedFish = {
  container: Container;
  mesh: MeshPlane;
  shadow: Sprite;
  buffer: Buffer;
  baseVertices: Float32Array;
  textureHeight: number;
  x: number;
  y: number;
  heading: number;
  speed: number;
  cruise: number;
  clearance: number;
  phase: number;
  lastWake: number;
};

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const HERO_SEQUENCE = {
  hidden: {},
  visible: { transition: { delayChildren: 0.08, staggerChildren: 0.085 } },
};
const HERO_REVEAL = {
  hidden: { opacity: 0, y: 22, clipPath: "inset(0 0 20% 0)" },
  visible: { opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)" },
};

function angleDelta(from: number, to: number) {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

function PondEnvironment({ reduced }: { reduced: boolean }) {
  const pondRef = useRef<HTMLDivElement>(null);
  const pixiHostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const pond = pondRef.current;
    const host = pixiHostRef.current;
    if (!pond || !host) return;

    if (reduced) {
      pond.dataset.renderer = "reduced";
      host.dataset.pixiState = "reduced";
      return;
    }

    let disposed = false;
    let teardown = () => {};
    host.dataset.pixiState = "loading";

    void (async () => {
      const [PIXI, { BulgePinchFilter, ShockwaveFilter }] = await Promise.all([
        import("pixi.js"),
        import("pixi-filters"),
      ]);
      const app = new PIXI.Application();
      await app.init({
        resizeTo: window,
        preference: "webgl",
        antialias: false,
        autoDensity: true,
        backgroundAlpha: 0,
        resolution: Math.min(window.devicePixelRatio || 1, Math.max(0.8, Math.min(1, 1100 / window.innerWidth))),
        powerPreference: "high-performance",
      });

      if (disposed) {
        app.destroy(true, { children: true });
        return;
      }

      host.replaceChildren(app.canvas);
      app.canvas.className = styles.pixiCanvas;

      const [pondTexture, waterTexture, kohakuTexture, ogonTexture] = await Promise.all([
        PIXI.Assets.load("/images/portfolio/pond-aerial.webp"),
        PIXI.Assets.load("/images/portfolio/water-displacement.jpg"),
        PIXI.Assets.load("/images/portfolio/koi-kohaku.webp"),
        PIXI.Assets.load("/images/portfolio/koi-ogon.webp"),
      ]);

      if (disposed) {
        app.destroy(true, { children: true });
        return;
      }

      const scene = new PIXI.Container();
      const background = new PIXI.Sprite(pondTexture);
      background.anchor.set(0.5);
      background.alpha = 0.9;
      scene.addChild(background);

      waterTexture.source.style.addressMode = "repeat";
      const displacementMap = new PIXI.Sprite(waterTexture);
      displacementMap.anchor.set(0.5);
      displacementMap.alpha = 0.001;
      const effectResolution = window.innerWidth > 900 ? 0.72 : 0.85;
      const water = new PIXI.DisplacementFilter({ sprite: displacementMap, scale: { x: 4.2, y: 3.2 } });
      water.resolution = effectResolution;
      const finger = new BulgePinchFilter({ radius: 150, strength: 0 });
      finger.resolution = effectResolution;
      finger.enabled = false;
      scene.filters = [water, finger];
      app.stage.addChild(displacementMap, scene);

      const createFish = (
        texture: typeof kohakuTexture,
        width: number,
        x: number,
        y: number,
        heading: number,
        cruise: number,
        phase: number,
        alpha: number,
      ): AnimatedFish => {
        const mesh = new PIXI.MeshPlane({ texture, verticesX: 4, verticesY: 9 });
        mesh.pivot.set(texture.width / 2, texture.height / 2);
        mesh.scale.set(width / texture.width);
        mesh.alpha = alpha;
        mesh.tint = 0xe5fff8;
        const shadow = new PIXI.Sprite(texture);
        shadow.anchor.set(0.5);
        shadow.scale.set(width / texture.width * 0.98);
        shadow.tint = 0x073c38;
        shadow.alpha = 0.2;
        shadow.blendMode = "multiply";
        shadow.filters = [new PIXI.BlurFilter({ strength: 2.6, quality: 1 })];
        const container = new PIXI.Container();
        const buffer = mesh.geometry.getAttribute("aPosition").buffer;
        container.addChild(mesh);
        scene.addChild(shadow, container);
        return {
          container,
          mesh,
          shadow,
          buffer,
          baseVertices: Float32Array.from(buffer.data as Float32Array),
          textureHeight: texture.height,
          x,
          y,
          heading,
          speed: cruise,
          cruise,
          clearance: width * 0.7,
          phase,
          lastWake: 0,
        };
      };

      const swimmers = [
        createFish(kohakuTexture, 124, window.innerWidth * 0.78, window.innerHeight * 0.2, 2.05, 29, 0.6, 0.72),
        createFish(ogonTexture, 96, window.innerWidth * 0.22, window.innerHeight * 0.76, -0.72, 23, 3.1, 0.56),
      ];

      let ripples: PondRipple[] = [];
      let wakes: Wake[] = [];
      let frameCount = 0;
      let pointer = { x: -1000, y: -1000, time: 0, energy: 0 };

      const layout = () => {
        const width = window.innerWidth;
        const height = window.innerHeight;
        const scale = Math.max(width / pondTexture.width, height / pondTexture.height) * 1.025;
        background.position.set(width / 2, height / 2);
        background.scale.set(scale);
        const displacementScale = Math.max(width / waterTexture.width, height / waterTexture.height) * 1.35;
        displacementMap.position.set(width / 2, height / 2);
        displacementMap.scale.set(displacementScale);
        scene.filterArea = app.screen;
        for (const swimmer of swimmers) {
          swimmer.x = Math.max(swimmer.clearance, Math.min(width - swimmer.clearance, swimmer.x));
          swimmer.y = Math.max(swimmer.clearance, Math.min(height - swimmer.clearance, swimmer.y));
        }
      };

      const syncFilters = () => {
        scene.filters = [water, finger, ...ripples.map((ripple) => ripple.filter)];
      };

      const addRipple = (x: number, y: number, size = 132, strength = 1) => {
        const speed = 145 + strength * 45;
        const filter = new ShockwaveFilter({
          center: { x, y },
          speed,
          amplitude: 1.5 + strength * 5.8,
          wavelength: 32 + size * 0.22,
          brightness: 1 + strength * 0.008,
          radius: size,
        });
        filter.resolution = effectResolution;
        ripples.push({ filter, born: performance.now(), life: (size / speed) * 1000 + 180 });
        while (ripples.length > 2) {
          const oldest = ripples.shift();
          oldest?.filter.destroy();
        }
        syncFilters();
        host.dataset.rippleCount = String(ripples.length);
      };

      const move = (event: globalThis.PointerEvent) => {
        const now = performance.now();
        const distance = Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y);
        const elapsed = Math.max(16, now - pointer.time);
        const energy = pointer.time ? Math.min(1, 0.22 + (distance / elapsed) * 0.25) : 0.35;
        if (pointer.time && distance > 3) {
          wakes.push({
            born: now,
            life: 620,
          });
        }
        pointer = { x: event.clientX, y: event.clientY, time: now, energy };
        if (wakes.length > 140) wakes = wakes.slice(-140);
      };

      const press = (event: globalThis.PointerEvent) => {
        addRipple(event.clientX, event.clientY);
      };

      app.ticker.add((ticker) => {
        const now = performance.now();
        const delta = Math.min(ticker.deltaMS / 1000, 0.034);
        const pointerFresh = now - pointer.time < 1600;
        let reacting = false;

        displacementMap.position.set(
          window.innerWidth / 2 + Math.sin(now * 0.00034) * 30,
          window.innerHeight / 2 + Math.cos(now * 0.00028) * 24,
        );
        const waterEnergy = pointerFresh ? Math.max(0, 1 - (now - pointer.time) / 850) * pointer.energy : 0;
        water.scale.x = 2.8 + Math.sin(now * 0.0003) * 0.24 + waterEnergy * 0.7;
        water.scale.y = 2.2 + Math.cos(now * 0.00024) * 0.2 + waterEnergy * 0.55;
        finger.enabled = waterEnergy > 0.005;
        finger.centerX = pointer.x / window.innerWidth;
        finger.centerY = pointer.y / window.innerHeight;
        finger.radius = 120 + waterEnergy * 60;
        finger.strength = -0.065 * waterEnergy;

        for (const swimmer of swimmers) {
          const distance = Math.hypot(swimmer.x - pointer.x, swimmer.y - pointer.y);
          const fleeing = pointerFresh && distance < 280;
          reacting ||= fleeing;
          let desired = swimmer.heading + Math.sin(now * 0.00042 + swimmer.phase) * 0.42;

          if (fleeing) {
            desired = Math.atan2(swimmer.y - pointer.y, swimmer.x - pointer.x);
          } else if (
            swimmer.x < 100 || swimmer.x > window.innerWidth - 100 ||
            swimmer.y < 120 || swimmer.y > window.innerHeight - 120
          ) {
            desired = Math.atan2(window.innerHeight / 2 - swimmer.y, window.innerWidth / 2 - swimmer.x);
          }

          swimmer.heading += angleDelta(swimmer.heading, desired) * Math.min(1, delta * (fleeing ? 5.8 : 0.72));
          const targetSpeed = swimmer.cruise * (fleeing ? 2.65 : 1);
          swimmer.speed += (targetSpeed - swimmer.speed) * Math.min(1, delta * (fleeing ? 4.8 : 1.2));
          swimmer.x += Math.cos(swimmer.heading) * swimmer.speed * delta;
          swimmer.y += Math.sin(swimmer.heading) * swimmer.speed * delta;
          swimmer.x = Math.max(swimmer.clearance, Math.min(window.innerWidth - swimmer.clearance, swimmer.x));
          swimmer.y = Math.max(swimmer.clearance, Math.min(window.innerHeight - swimmer.clearance, swimmer.y));
          swimmer.container.position.set(swimmer.x, swimmer.y);
          swimmer.container.rotation = swimmer.heading + Math.PI / 2;
          swimmer.shadow.position.set(swimmer.x + 5, swimmer.y + 9);
          swimmer.shadow.rotation = swimmer.container.rotation;

          const vertices = swimmer.buffer.data as Float32Array;
          const effort = swimmer.speed / swimmer.cruise;
          for (let index = 0; index < vertices.length; index += 2) {
            const tail = swimmer.baseVertices[index + 1] / swimmer.textureHeight;
            vertices[index] = swimmer.baseVertices[index] + Math.sin(now * 0.007 * effort + swimmer.phase + tail * 3.2) * Math.pow(tail, 2.35) * 30;
          }
          swimmer.buffer.update();

          if (now - swimmer.lastWake > (fleeing ? 58 : 110)) {
            wakes.push({
              born: now,
              life: fleeing ? 760 : 1050,
            });
            swimmer.lastWake = now;
          }
        }

        wakes = wakes.filter((wake) => now - wake.born < wake.life);

        let filtersChanged = false;
        ripples = ripples.filter((ripple) => {
          const age = now - ripple.born;
          if (age < 0) return true;
          if (age >= ripple.life) {
            ripple.filter.destroy();
            filtersChanged = true;
            return false;
          }
          ripple.filter.time = age / 1000;
          return true;
        });
        if (filtersChanged) syncFilters();

        frameCount += 1;
        if (frameCount % 12 === 0) {
          host.dataset.fishPositions = swimmers.map((fish) => `${fish.x.toFixed(1)},${fish.y.toFixed(1)}`).join(";");
          host.dataset.fishReacting = String(reacting);
          host.dataset.rippleCount = String(ripples.length);
          host.dataset.wakeCount = String(wakes.length);
          host.dataset.frame = String(frameCount);
        }
      });

      const visibility = () => {
        if (document.hidden) {
          app.stop();
          host.dataset.pixiState = "paused";
        } else {
          app.start();
          host.dataset.pixiState = "running";
        }
      };

      layout();
      pond.dataset.renderer = "pixi";
      host.dataset.pixiState = "running";
      window.addEventListener("resize", layout);
      window.addEventListener("pointermove", move, { passive: true });
      window.addEventListener("pointerdown", press, { passive: true });
      document.addEventListener("visibilitychange", visibility);

      teardown = () => {
        window.removeEventListener("resize", layout);
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerdown", press);
        document.removeEventListener("visibilitychange", visibility);
        app.destroy(true, { children: true });
      };
    })().catch((error: unknown) => {
      console.error("PixiJS pond renderer failed", error);
      host.dataset.pixiState = "fallback";
      pond.dataset.renderer = "fallback";
    });

    return () => {
      disposed = true;
      teardown();
    };
  }, [reduced]);

  return (
    <div ref={pondRef} className={styles.pond} data-renderer="fallback" aria-hidden="true">
      <div className={styles.pondImage} />
      <div ref={pixiHostRef} className={styles.pixiHost} data-pixi-state="idle" data-ripple-count="0" data-wake-count="0" data-fish-reacting="false" />
      <div className={styles.pondGrade} />
      <div className={`${styles.koi} ${styles.koiOne}`}>
        <Image src="/images/portfolio/koi-kohaku.webp" alt="" fill sizes="180px" priority />
      </div>
      <div className={`${styles.koi} ${styles.koiTwo}`}>
        <Image src="/images/portfolio/koi-ogon.webp" alt="" fill sizes="140px" priority />
      </div>
      <div className={styles.surfaceLight} />
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
  const [direction, setDirection] = useState(1);
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
        className={styles.projectExplorer}
        initial={{ opacity: 0, scale: 0.985, y: 22 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true, amount: 0.12 }}
        transition={{ duration: reduced ? 0 : 0.56, ease: EASE_OUT }}
      >
        <div className={styles.projectNav} role="list" aria-label="Featured projects">
          {portfolioProjects.map((project, index) => {
            const active = project.id === activeProject.id;
            return (
              <motion.button
                type="button"
                key={project.id}
                onClick={() => {
                  setDirection(index >= activeIndex ? 1 : -1);
                  setActiveId(project.id);
                }}
                className={active ? styles.activeProject : ""}
                aria-pressed={active}
                whileTap={reduced ? undefined : { scale: 0.985 }}
                transition={{ duration: 0.1 }}
              >
                {active && <motion.i className={styles.projectMarker} layoutId="project-marker" transition={{ duration: reduced ? 0 : 0.24, ease: EASE_OUT }} />}
                <span>0{index + 1}</span>
                <strong>{project.name}</strong>
                <small>{project.category}</small>
              </motion.button>
            );
          })}
        </div>

        <div className={styles.projectStage} aria-live="polite">
          <AnimatePresence mode="sync" initial={false} custom={direction}>
            <motion.article
              className={styles.projectPanel}
              key={activeProject.id}
              custom={direction}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.24, ease: EASE_OUT }}
            >
              <motion.div
                className={styles.projectVisual}
                initial={{ clipPath: direction > 0 ? "inset(0 11% 0 0)" : "inset(0 0 0 11%)", scale: 1.025 }}
                animate={{ clipPath: "inset(0 0 0 0)", scale: 1 }}
                exit={reduced ? undefined : { opacity: 0, scale: 0.99 }}
                transition={{ duration: reduced ? 0 : 0.34, ease: EASE_OUT }}
              >
                <ProjectArtwork project={activeProject} />
              </motion.div>
              <motion.div
                className={styles.projectCopy}
                initial={{ opacity: 0, x: direction * 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduced ? undefined : { opacity: 0, x: direction * -10 }}
                transition={{ duration: reduced ? 0 : 0.3, delay: reduced ? 0 : 0.035, ease: EASE_OUT }}
              >
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
              </motion.div>
            </motion.article>
          </AnimatePresence>
        </div>
      </motion.div>
    </section>
  );
}

export function SignalDesk() {
  const reducedMotion = Boolean(useReducedMotion());
  const [scrolled, setScrolled] = useState(false);

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

      <motion.header
        className={`${styles.header} ${scrolled ? styles.headerScrolled : ""}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.42, ease: EASE_OUT }}
      >
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
      </motion.header>

      <main id="main">
        <section className={styles.hero} aria-labelledby="hero-title">
          <motion.div
            className={styles.heroCopy}
            variants={reducedMotion ? { hidden: {}, visible: {} } : HERO_SEQUENCE}
            initial="hidden"
            animate="visible"
          >
            <motion.span variants={HERO_REVEAL} transition={{ duration: reducedMotion ? 0 : 0.62, ease: EASE_OUT }} className={styles.eyebrow}><Sparkles aria-hidden="true" /> Lu / software engineer</motion.span>
            <motion.h1 variants={HERO_REVEAL} transition={{ duration: reducedMotion ? 0 : 0.62, ease: EASE_OUT }} id="hero-title">I make stubborn software <em>behave.</em></motion.h1>
            <motion.p variants={HERO_REVEAL} transition={{ duration: reducedMotion ? 0 : 0.62, ease: EASE_OUT }}>I build Orchid.ai’s native Android app, agent systems, and Linux tools that do the useful part without making a fuss.</motion.p>
            <motion.div variants={HERO_REVEAL} transition={{ duration: reducedMotion ? 0 : 0.62, ease: EASE_OUT }} className={styles.heroActions}>
              <a href="#work">See the work <ArrowDown aria-hidden="true" /></a>
              <a href={portfolioIdentity.email}>Start a conversation <Mail aria-hidden="true" /></a>
            </motion.div>
          </motion.div>

          <motion.aside
            className={styles.pondNote}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.48, delay: reducedMotion ? 0 : 0.43, ease: EASE_OUT }}
          >
            <MousePointer2 aria-hidden="true" />
            <span><strong>Touch the water</strong><small>Move your pointer through the pond.</small></span>
          </motion.aside>
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
            <div className={styles.profileLine}>
              <Image src="/images/portfolio/lu-avatar.jpg" alt="Lu's illustrated avatar wearing a pink cap" width={64} height={64} />
              <span><strong>Lu</strong><small>@x6c75 · United Kingdom</small></span>
            </div>
          </motion.div>

          <motion.article
            className={styles.iniuriaCard}
            initial={{ opacity: 0, scale: 0.965, y: 24 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true, amount: 0.32 }}
            transition={{ duration: reducedMotion ? 0 : 0.56, ease: EASE_OUT }}
          >
            <span className={styles.projectEyebrow}>Independent work / Iniuria.us</span>
            <h3>Automation with an actual job to do.</h3>
            <p>Discord automation, internal admin panels, and AI-assisted support triage built around the daily realities of an active community.</p>
            <div className={styles.proofRow}><span>Discord systems</span><span>Admin tooling</span><span>AI triage</span></div>
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
          <span className={styles.eyebrow}>Open channel</span>
          <h2 id="contact-title">Got a useful problem?</h2>
          <p>Native apps, agent infrastructure, strange systems, and software that needs to behave.</p>
          <a href={portfolioIdentity.email}>Start a conversation <ArrowUpRight aria-hidden="true" /></a>
        </motion.section>
      </main>

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
