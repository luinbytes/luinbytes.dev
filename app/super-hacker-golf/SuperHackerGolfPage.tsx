import Link from "next/link";
import styles from "../game-tooling.module.css";

export default function SuperHackerGolfPage() {
  return (
    <div className={`${styles.page} ${styles.golf}`}>
      <main className={styles.main}>
        <Link className={styles.back} href="/#builds">← Back to projects</Link>
        <header className={styles.hero}><div><p className={styles.eyebrow}>Super Battle Golf / Client-side mod</p><h1 className={styles.title}>SuperHackerGolf<span>.</span></h1><p className={styles.lede}>Golf trajectory and physics assistance, plus aim, ESP, combat, and item tools for Super Battle Golf.</p></div><div className={styles.mark} aria-hidden="true" /></header>
        <section className={`${styles.section} ${styles.shotSection}`} aria-labelledby="golf-does">
          <h2 id="golf-does">What it does</h2>
          <p>Golf assist reads wind and terrain settings to predict ball flight, bounce, roll, and crosswind drift. The mod also includes weapon aim modes, an ESP overlay, force shield, item spawning, bunnyhop, and client-side kick resistance.</p>
          <ol className={styles.shotFlow}>
            <li><span>Line</span>Golf aim assist</li>
            <li><span>Flight</span>Trajectory prediction</li>
            <li><span>Sight</span>Weapon aim and ESP</li>
            <li><span>Play</span>Combat and item tools</li>
          </ol>
        </section>
        <section className={`${styles.section} ${styles.physicsStrip}`} aria-labelledby="golf-hood">
          <h2 id="golf-hood">Under the hood</h2>
          <div><p>MelonLoader hosts the mod, HarmonyX patches the Unity game at runtime, and cached reflection reads the game state used by its tools. The ball model comes from static analysis of GameAssembly.dll.</p><p className={styles.detail}>C# · MelonLoader 0.7.2 · HarmonyX · Unity · .NET 8</p></div>
        </section>
        <section className={styles.section} aria-labelledby="golf-get"><h2 id="golf-get">Get it</h2><div className={styles.copy}><p>Install MelonLoader 0.7.2 in the Super Battle Golf folder. Under Proton, set WINEDLLOVERRIDES for version.dll, then place the release DLL in the game&apos;s Mods folder.</p><div className={styles.actions}><a className={styles.button} href="https://github.com/luinbytes/SuperHackerGolf/releases">Open releases</a><a className={styles.button} href="https://github.com/luinbytes/SuperHackerGolf">View source on GitHub</a></div></div></section>
      </main>
    </div>
  );
}
