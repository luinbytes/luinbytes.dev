import Link from "next/link";
import styles from "../game-tooling.module.css";

export default function RiskOfAnticheatPage() {
  return (
    <div className={`${styles.page} ${styles.risk}`}>
      <main className={styles.main}>
        <Link className={styles.back} href="/#builds">← Back to projects</Link>
        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Risk of Rain 2 / BepInEx mod</p>
            <h1 className={styles.title}>Risk of Anticheat<span>.</span></h1>
            <p className={styles.lede}>ESP, legitbot, ragebot, projectile prediction, auto-pickup, and a custom IMGUI menu for Risk of Rain 2.</p>
          </div>
          <div className={styles.mark} aria-hidden="true" />
        </header>
        <section className={styles.section} aria-labelledby="risk-does">
          <div className={styles.riskHeading}>
            <h2 id="risk-does">What it does</h2>
            <p>A personal singleplayer and co-op replacement for the abandoned Aerolt mod. It exposes players, enemies, pickups, chests, teleporters, and interactables, with shared targeting and projectile prediction for its aim tools.</p>
          </div>
          <ol className={styles.signalFlow}>
            <li><span>Observe</span>Five ESP providers</li>
            <li><span>Assess</span>Projectile lead prediction</li>
            <li><span>Act</span>Legitbot and ragebot</li>
            <li><span>Control</span>Eight-tab IMGUI menu</li>
          </ol>
        </section>
        <section className={styles.section} aria-labelledby="risk-hood">
          <div className={styles.riskAssessment}>
            <h2 id="risk-hood">Under the hood</h2>
            <div>
              <p>BepInEx 5 and Harmony patches instrument the Risk of Rain 2 runtime. MMHOOK.RoR2 typed hooks sit alongside stock Harmony patches, while RiskOfOptions provides pause-menu integration.</p>
              <p className={styles.detail}>C# · BepInEx · Harmony · Unity IMGUI · RiskOfOptions</p>
            </div>
          </div>
        </section>
        <section className={styles.section} aria-labelledby="risk-get">
          <h2 id="risk-get">Get it</h2>
          <div className={styles.copy}>
            <p>Public source and releases are not currently available.</p>
            <p>Install BepInEx and the required RiskOfOptions dependency first. Releases are packaged for an r2modman profile or its BepInEx/plugins directory.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
