import Image from "next/image";
import { ArrowUpRight, Crosshair, Github, ScanLine, ShieldAlert } from "lucide-react";
import styles from "./ballhammer.module.css";

const overlayFeatures = [
  "Bone-projected boxes for all enemies, including enemies spawned or respawned after the mod loads",
  "Distinct special-enemy names, SPECIAL flags, distances, outlines, and health bars",
  "Distance fading and a visibility check that turns visible ESP white",
  "Compact world-space horde grouping with separate horizontal and elevation limits, buffered off-screen membership, aim-bone dots, and reversible join/split animation",
  "Collision-spaced pickup cards with compact stacking, fixed screen sizing, category accents, distance fading, category presets, custom per-pickup filters, and distinct Med, Concentration, Combat, and Celerity Stimm labels",
];

const aimFeatures = [
  "Normal aimbot and triggerbot keep an in-FOV target locked, then replace it when it leaves the FOV, dies, or becomes occluded",
  "Head or torso aim, configurable distance and field of view, interpolated smoothing, and aim curvature",
  "Distance-scaled target preview follows the armor-aware or configured aim bone nearest the crosshair and becomes the activation target",
  "Left mouse, right mouse, either mouse button, or a custom keyboard activation key",
  "Configurable magnet triggerbot with aim radius, fire radius, and smoothing",
  "Rage mode selects visible on-screen targets using danger, range, and crosshair weighting",
  "Melee-aware aim range limits mouse-one targeting to enemies inside the current weapon sweep reach",
  "Optional timed repeat fire for press-driven, non-automatic weapons whenever mouse one is held",
  "Optional local weapon recoil and spread suppression without camera compensation",
];

const tacticalFeatures = [
  "Weighted Arbites and Skitarii companion orders based on special type, distance, and remaining health without moving the camera; native companion-rescue states override normal weights, retargeting waits for companion damage, and an optional charged Arbites dog EMP sends its press, hold, and release through Darktide's networked input frames when the dog connects",
  "Armor and Weakspot Director ranks visible hit zones using the current weapon damage profile, live armor overrides, shields, and weakspot finesse; triggerbot skips invulnerable shots and rage mode can choose another target",
  "Threat Interceptor marks committed hound, trapper, mutant, rager, sniper, flamer, grenade, and verified overhead attacks while a HUD shows the planned reaction and impact countdown",
  "Opt-in defensive reactions use bounded safe-window timing, preserve held attacks until the final dodge window, keep the player's movement direction, and dodge committed specialist, rager, and overhead attacks",
  "Opt-in Guard Brain preserves a configurable stamina reserve and pushes only when at least three nearby melee threats cover the available retreat directions",
  "Opt-in Warp and Heat Governor predicts the next resource increase, stops unsafe generated shots, and can use the current weapon's native quell or non-damaging vent input when no nearby threat exists",
  "Diagnostic logging records threat timing and reaction decisions for live compatibility checks without changing the safe defaults",
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
            All-enemy and pickup ESP, configurable aim and fire controls, and
            opt-in tactical systems for Darktide.
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
            <h3>Overlay and pickup intelligence</h3>
            <ul>
              {overlayFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </article>
          <article className={styles.featureCard}>
            <Crosshair aria-hidden="true" />
            <h3>Aim and fire controls</h3>
            <ul>
              {aimFeatures.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          </article>
          <article className={styles.featureCard}>
            <ShieldAlert aria-hidden="true" />
            <h3>Tactical systems</h3>
            <ul>
              {tacticalFeatures.map((feature) => (
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
            Configure separate ESP, Pickup ESP, Aimbot, Magnet Triggerbot, Rage
            Mode, Armor and Weakspot Director, Threat Interceptor, Guard Brain,
            Warp and Heat Governor, Weapon, and Companion sections in Darktide
            Mod Options.
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
