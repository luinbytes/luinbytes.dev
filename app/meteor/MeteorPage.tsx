import Link from "next/link";
import styles from "../core-product.module.css";

export function MeteorPage() {
  return <main className={styles.page}>
    <section className={styles.meteorHero} aria-labelledby="meteor-title">
      <div className={`${styles.wrap} ${styles.meteorHeroGrid}`}>
        <Link href="/#builds" className={styles.back}>← Back to projects</Link>
        <div className={styles.meteorIntro}>
          <p className={styles.eyebrow}>Android / local-first / daily</p>
          <h1 id="meteor-title" className={styles.title}>Meteor<span className="text-nd-accent">.</span></h1>
          <p className={styles.lede}>Tasks and habits in one clean daily view, with streaks, reminders, heatmaps, and a home screen widget.</p>
          <div className={styles.buttonRow}>
            <Link className={styles.button} href="/meteor/privacy">Privacy Policy</Link>
          </div>
        </div>
        <div className={styles.meteorMark} aria-label="Today at a glance">
          <span><b>Today</b><b>one view</b></span>
          <span><b>Habits</b><b>streaks + heatmap</b></span>
          <span><b>Tasks</b><b>priority + subtasks</b></span>
        </div>
      </div>
    </section>

    <section className={styles.meteorSection} aria-labelledby="meteor-does">
      <div className={styles.wrap}>
        <h2 id="meteor-does" className={styles.sectionTitle}>What it does</h2>
        <ul className={styles.meteorCards}>
          <li><strong>One Today view</strong>See tasks, habit targets, and current streaks without switching apps.</li>
          <li><strong>Flexible routines</strong>Repeat daily, on chosen weekdays, a set number of times per week, or every N days.</li>
          <li><strong>Fast task capture</strong>Use priorities, due dates, notes, subtasks, tags, search, and swipe actions.</li>
        </ul>
      </div>
    </section>

    <section className={`${styles.meteorSection} ${styles.meteorTech}`} aria-labelledby="meteor-hood">
      <div className={`${styles.wrap} ${styles.meteorContent}`}>
        <h2 id="meteor-hood" className={styles.sectionTitle}>Under the hood</h2>
        <div className={styles.meteorProse}>
          <p className={styles.copy}>Meteor is a native Android app built with Kotlin and Jetpack Compose. Room keeps tasks, habits, and completions on the device; DataStore holds settings, WorkManager handles background work, and Glance powers the widget.</p>
          <p className={styles.copy}>No account is required. The release app sends anonymous crash reports to Sentry, without task or habit content.</p>
        </div>
      </div>
    </section>

    <section id="get-it" className={styles.meteorSection} aria-labelledby="meteor-get">
      <div className={styles.wrap}>
        <div className={styles.meteorAction}>
          <h2 id="meteor-get" className={styles.sectionTitle}>Get it</h2>
          <div><p className={styles.copy}>A public Google Play listing is not currently available. The privacy policy explains local storage, export, and crash reporting.</p><div className={styles.buttonRow}><Link className={styles.button} href="/meteor/privacy">Privacy Policy</Link></div></div>
        </div>
      </div>
    </section>
  </main>;
}

export default MeteorPage;
