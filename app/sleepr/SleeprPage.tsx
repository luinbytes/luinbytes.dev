import Link from "next/link";
import styles from "../core-product.module.css";

export default function SleeprPage() {
  return <main className={`${styles.page} ${styles.sleepr}`}>
    <section className={styles.sleeprHero} aria-labelledby="sleepr-title">
      <div className={styles.wrap}>
        <div>
          <Link href="/#builds" className={styles.back}>← Back to projects</Link>
          <p className={styles.eyebrow}>Android / local-first / bedtime</p>
          <h1 id="sleepr-title" className={styles.title}>Sleepr<span className="text-nd-success">.</span></h1>
          <p className={styles.lede}>A quiet sleep companion for cycle-aware wake windows, optional live notifications, and private rhythm learning on your phone.</p>
          <div className={styles.buttonRow}><a className={styles.button} href="#get-it">Get Sleepr</a></div>
        </div>
        <div className={styles.sleeprSignal} aria-label="Sleepr uses a 90 minute cycle base for cycle-aware wake windows, with an optional ticker and private local learning.">
          <div className={styles.sleeprOrbit} aria-hidden="true">
            <span className={styles.sleeprOrbitValue}>90m</span>
            <span className={styles.sleeprOrbitLabel}>cycle base</span>
          </div>
          <p className={styles.sleeprSignalWake}>Cycle-aware<br />wake windows</p>
          <p className={styles.sleeprSignalTicker}>Optional<br />ticker</p>
          <p className={styles.sleeprSignalLocal}>Private local<br />learning</p>
        </div>
      </div>
    </section>

    <section className={styles.sleeprSection} aria-labelledby="sleepr-does">
      <div className={styles.wrap}>
        <h2 id="sleepr-does" className={styles.sectionTitle}>What it does</h2>
        <div className={styles.sleeprTimeline}>
          <article><span aria-hidden="true">01</span><h3>At bedtime</h3><p className={styles.copy}>Suggests wake windows around sleep-cycle timing and the alarm you already chose.</p></article>
          <article><span aria-hidden="true">02</span><h3>Through the night</h3><p className={styles.copy}>Keeps an optional minute-aware notification ticker available when you enable it.</p></article>
          <article><span aria-hidden="true">03</span><h3>In the morning</h3><p className={styles.copy}>Uses simple rested-or-groggy feedback to tune its personal cycle estimate gradually.</p></article>
        </div>
      </div>
    </section>

    <section className={`${styles.sleeprSection} ${styles.sleeprPanel}`} aria-labelledby="sleepr-hood">
      <div className={styles.wrap}>
        <h2 id="sleepr-hood" className={styles.sectionTitle}>Under the hood</h2>
        <div className={styles.sleeprTechGrid}>
          <article>
            <p className={styles.eyebrow}>Native Android</p>
            <p className={styles.copy}>Kotlin and Jetpack Compose shape the Android interface. Room and DataStore keep learning state and settings locally, while WorkManager schedules background reminders.</p>
          </article>
          <article>
            <p className={styles.eyebrow}>Local-first</p>
            <p className={styles.copy}>Optional Android usage access can infer likely sleep and wake windows from screen activity. The core sleep model needs no account or cloud service.</p>
          </article>
        </div>
      </div>
    </section>

    <section id="get-it" className={styles.sleeprSection} aria-labelledby="sleepr-get">
      <div className={styles.wrap}>
        <div className={styles.sleeprComingSoon}>
          <div>
            <p className={styles.eyebrow}>Android / coming soon</p>
            <h2 id="sleepr-get" className={styles.sectionTitle}>Get it</h2>
          </div>
          <p className={styles.lede}>Sleepr is coming to Android. Its launch page is still in progress, so there is no download link to offer yet.</p>
          <p className={styles.sleeprAvailability} aria-label="Availability: no download yet"><span aria-hidden="true"></span>No download yet</p>
        </div>
      </div>
    </section>
  </main>;
}
