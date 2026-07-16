import Image from "next/image";
import { ArrowUpRight, Crosshair, Github, ScanLine } from "lucide-react";
import styles from "./ballhammer.module.css";

const overlayFeatures = [
  "All-enemy ESP with bone-projected boxes",
  "Distinct special-enemy names, SPECIAL flags, distances, outlines, and health bars",
  "Distance fading and visibility behavior",
  "Compact world-space horde grouping with separate horizontal and elevation limits, buffered off-screen membership, aim-bone dots, and reversible join/split animation",
  "Pickup ESP labels plasteel, diamantine, ammo, grenades, deployables, stimms, mission items, and other interactable pickups, with configurable range and distance fading",
];

const aimFeatures = [
  "A configurable normal aimbot chooses the visible target closest to the crosshair",
  "Head or torso aim, configurable distance and field of view, interpolated smoothing, and aim curvature",
  "A configurable magnet triggerbot uses separate aim and fire radii with smoothing",
  "Rage mode selects visible on-screen targets using danger, range, and crosshair weighting",
  "Optional timed repeat fire supports press-driven non-automatic weapons",
  "Optional local recoil and spread suppression works without camera compensation",
];

export default function BallHammerPage() {
  return (
    <article className={styles.page}>
      <section className={styles.hero} aria-labelledby="ballhammer-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>Darktide mod / Lua 5.1</p>
          <h1 id="ballhammer-title">
            BallHammer<span>.</span>
          </h1>
          <p className={styles.lede}>
            All-enemy and pickup ESP with configurable aim modes for Darktide.
          </p>
          <a
            className={styles.primaryCta}
            href="https://github.com/luinbytes/BallHammer"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Github aria-hidden="true" />
            View source on GitHub
            <ArrowUpRight aria-hidden="true" />
          </a>
        </div>

        <figure className={styles.heroFrame}>
          <div className={styles.imageFrame}>
            <Image
              src="/images/ballhammer/hero.png"
              alt="Darktide gameplay with BallHammer enemy overlays"
              width={1672}
              height={941}
              unoptimized
              priority
              sizes="(max-width: 900px) 100vw, 60vw"
            />
          </div>
          <figcaption>Gameplay proof / overlay view</figcaption>
        </figure>
      </section>

      <section className={styles.section} aria-labelledby="what-it-does">
        <header className={styles.sectionHeading}>
          <span>01</span>
          <div>
            <p>Field capability</p>
            <h2 id="what-it-does">What it does</h2>
          </div>
        </header>
        <div className={styles.featureGrid}>
          <article className={styles.featureCard}>
            <ScanLine aria-hidden="true" />
            <h3>Enemy overlays</h3>
            <ul>
              {overlayFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </article>
          <article className={styles.featureCard}>
            <Crosshair aria-hidden="true" />
            <h3>Aim controls</h3>
            <ul>
              {aimFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="under-the-hood">
        <header className={styles.sectionHeading}>
          <span>02</span>
          <div>
            <p>Runtime</p>
            <h2 id="under-the-hood">Under the hood</h2>
          </div>
        </header>
        <div className={styles.techPanel}>
          <p>
            BallHammer is a Darktide Mod Framework mod written for Lua 5.1.
          </p>
          <p>
            Weighted Arbites and Skitarii orders account for special type,
            distance, and health. Native companion-rescue states override those
            weights, and retargeting waits for companion damage.
          </p>
          <p>
            An optional charged Arbites dog EMP sends press, hold, and release
            through Darktide networked input frames when the dog connects.
          </p>
          <p>
            Configuration has separate ESP, Pickup ESP, Aimbot, Magnet
            Triggerbot, Rage Mode, Weapon, and Companion option groups.
          </p>
          <dl>
            <div>
              <dt>Platform</dt>
              <dd>Warhammer 40,000: Darktide</dd>
            </div>
            <div>
              <dt>Framework</dt>
              <dd>Darktide Mod Framework</dd>
            </div>
            <div>
              <dt>Language</dt>
              <dd>Lua 5.1</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className={`${styles.section} ${styles.getIt}`} aria-labelledby="get-it">
        <header className={styles.sectionHeading}>
          <span>03</span>
          <div>
            <p>Source-first install</p>
            <h2 id="get-it">Get it</h2>
          </div>
        </header>
        <div className={styles.installGrid}>
          <div>
            <h3>Requirements</h3>
            <ul className={styles.requirements}>
              <li>Darktide Mod Loader</li>
              <li>Darktide Mod Framework</li>
            </ul>
          </div>
          <div>
            <h3>Manual installation</h3>
            <ol className={styles.steps}>
              <li>Copy the repository to the game mods directory as BallHammer.</li>
              <li>Add BallHammer to mod_load_order.txt.</li>
              <li>Restart Darktide after installing or replacing mod files.</li>
            </ol>
            <p>Configure BallHammer in Darktide mod options.</p>
          </div>
        </div>
        <a
          className={styles.sourceLink}
          href="https://github.com/luinbytes/BallHammer"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open the source repository
          <ArrowUpRight aria-hidden="true" />
        </a>
      </section>
    </article>
  );
}
