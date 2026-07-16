import Link from "next/link";
import type { CSSProperties } from "react";
import styles from "../core-product.module.css";

const SOURCE_URL = "https://github.com/luinbytes/linux-sonar";

export function LinuxSonarPage() {
  return <main className={`${styles.page} ${styles.sonar}`}>
    <section className={styles.sonarHero} aria-labelledby="sonar-title">
      <div className={styles.wrap}>
        <Link href="/#builds" className={styles.back}>← Back to projects</Link>
        <p className={styles.eyebrow}>PipeWire / open source / Linux</p>
        <h1 id="sonar-title" className={`${styles.title} ${styles.sonarTitle}`}>linux-sonar<span>.</span></h1>
        <p className={styles.lede}>SteelSeries Sonar for Linux: per-app audio routing, ChatMix, and microphone effects on PipeWire.</p>
        <div className={styles.buttonRow}><a className={styles.button} href={SOURCE_URL} target="_blank" rel="noopener noreferrer">View on GitHub</a></div>
        <div className={styles.channels} aria-label="Five virtual audio channels">
          <span style={{"--level":"78%"} as CSSProperties}>Game</span><span style={{"--level":"52%"} as CSSProperties}>Chat</span><span style={{"--level":"68%"} as CSSProperties}>Media</span><span style={{"--level":"35%"} as CSSProperties}>Aux</span><span style={{"--level":"62%"} as CSSProperties}>Mic</span>
        </div>
      </div>
    </section>

    <section className={styles.sonarSection} aria-labelledby="sonar-does">
      <div className={styles.wrap}>
        <h2 id="sonar-does" className={styles.sectionTitle}>What it does</h2>
        <div className={styles.sonarGrid}>
          <article className={styles.sonarCard}><h3>Route</h3><p>Five virtual channels let apps move independently to a stereo output sink.</p></article>
          <article className={styles.sonarCard}><h3>Balance</h3><p>ChatMix balances game and chat, including direct support for a hardware USB-HID wheel.</p></article>
          <article className={styles.sonarCard}><h3>Clean</h3><p>The microphone chain combines RNNoise, a gate, 8-band EQ, compressor, and limiter.</p></article>
        </div>
      </div>
    </section>

    <section className={styles.sonarSection} aria-labelledby="sonar-hood">
      <div className={styles.wrap}>
        <h2 id="sonar-hood" className={styles.sectionTitle}>Under the hood</h2>
        <div className={styles.sonarGrid}>
          <article className={styles.sonarCard}><h3>PipeWire</h3><p>Filter-chain modules provide the virtual sinks and isolated microphone effects process.</p></article>
          <article className={styles.sonarCard}><h3>Routing daemon</h3><p>A Python daemon checks wpctl and pactl and restores each app to its expected channel.</p></article>
          <article className={styles.sonarCard}><h3>Control surface</h3><p>GTK4 and libadwaita provide the native Wayland-friendly panel, with waybar integration.</p></article>
        </div>
      </div>
    </section>

    <section id="get-it" className={styles.sonarSection} aria-labelledby="sonar-get">
      <div className={styles.wrap}>
        <h2 id="sonar-get" className={styles.sectionTitle}>Get it</h2>
        <p className={styles.lede}>Clone the source, install PipeWire, WirePlumber, GTK4, libadwaita, and Python 3.11+, then run the repository’s install script. EasyEffects’ output pipeline must be disabled for per-channel routing.</p>
        <div className={styles.buttonRow}><a className={styles.button} href={SOURCE_URL} target="_blank" rel="noopener noreferrer">View on GitHub</a></div>
      </div>
    </section>
  </main>;
}

export default LinuxSonarPage;
