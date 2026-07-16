import Link from "next/link";
import styles from "../game-tooling.module.css";

export default function BrcTrainerPage() {
  return (
    <div className={`${styles.page} ${styles.brc}`}>
      <main className={styles.main}>
        <Link className={styles.back} href="/#builds">← Back to projects</Link>
        <header className={styles.hero}>
          <div><p className={styles.eyebrow}>Bomb Rush Cyberfunk / Trainer</p><h1 className={styles.title}>BrcTrainer<span>.</span></h1><p className={styles.lede}>A BepInEx 5 Mono trainer with an IMGUI sidebar, built to keep its input and fonts working under Proton and Wine.</p></div>
          <div className={styles.mark} aria-hidden="true" />
        </header>
        <section className={`${styles.section} ${styles.brcStack}`} aria-labelledby="brc-does">
          <h2 id="brc-does">What it does</h2>
          <p>The five-tab sidebar provides movement, health, cops, economy, and world controls, including infinite boost, speed, god mode, no heat, REP editing, and time scale.</p>
          <ol className={styles.setupLadder}>
            <li><span>01</span><strong>Open</strong><em>Five-tab IMGUI sidebar</em></li>
            <li><span>02</span><strong>Navigate</strong><em>L3 + R3 menu shortcut · D-pad navigation</em></li>
            <li><span>03</span><strong>Adapt</strong><em>Rebindable keys</em></li>
          </ol>
        </section>
        <section className={`${styles.section} ${styles.brcEnvironment}`} aria-labelledby="brc-hood">
          <h2 id="brc-hood">Under the hood</h2>
          <div className={styles.environmentStack}>
            <p>HarmonyLib patches Reptile namespace types through cached reflection. Gamepad state is sampled outside IMGUI for Proton, and embedded TTF files are registered through the Wine font system before Unity resolves them.</p>
            <p className={styles.detail}>C# · BepInEx 5 Mono · HarmonyLib · Unity IMGUI · .NET Standard 2.1</p>
          </div>
        </section>
        <section className={styles.section} aria-labelledby="brc-get"><h2 id="brc-get">Get it</h2><div className={styles.copy}><p>Public source and releases are not currently available.</p><p>Use the BepInEx 5 Mono x64 pack—not the IL2CPP variant. After the first launch creates BepInEx/plugins, place BrcTrainer.dll there; r2modmanPlus is also supported.</p></div></section>
      </main>
    </div>
  );
}
