import Link from "next/link";
import styles from "../game-tooling.module.css";

export default function DaggerFallPage() {
  return (
    <div className={`${styles.page} ${styles.dagger}`}>
      <main className={styles.main}>
        <Link className={styles.back} href="/#builds">← Back to projects</Link>
        <header className={styles.hero}><div><p className={styles.eyebrow}>Devil Daggers / External Linux trainer</p><h1 className={styles.title}>DaggerFall<span>.</span></h1><p className={styles.lede}>External gameplay tooling for movement, aim, and live dagger landing prediction—without injecting into the game.</p></div><div className={styles.mark} aria-hidden="true" /></header>
        <section className={`${styles.section} ${styles.fieldKit}`} aria-labelledby="dagger-does">
          <div><h2 id="dagger-does">What it does</h2><p>Auto-bhop and configurable air control sit alongside sticky aim assist with lead prediction. A click-through overlay projects where live daggers will meet the floor.</p></div>
          <dl className={styles.interactionMap}>
            <div><dt>Movement</dt><dd>Auto-bhop · Full air control</dd></div>
            <div><dt>Aim</dt><dd>Sticky aim assist</dd></div>
            <div><dt>Projection</dt><dd>Landing prediction overlay</dd></div>
          </dl>
        </section>
        <section className={`${styles.section} ${styles.externalSetup}`} aria-labelledby="dagger-hood">
          <h2 id="dagger-hood">Under the hood</h2>
          <div><p>The single-file GNU99 program uses Linux process_vm_readv and process_vm_writev for external memory access. GTK3, gtk-layer-shell, and Cairo provide the Wayland-compatible overlay; pointer and physics values live in a plaintext configuration file.</p><p className={styles.detail}>C · process_vm_readv/writev · GTK3 · Cairo · gtk-layer-shell · Xlib</p></div>
        </section>
        <section className={styles.section} aria-labelledby="dagger-get"><h2 id="dagger-get">Get it</h2><div className={styles.copy}><p>Build it on Linux with its GTK3, Cairo, X11, and gtk-layer-shell dependencies. The required game offsets are not distributed and must be supplied in the configuration.</p><div className={styles.actions}><a className={styles.button} href="https://github.com/luinbytes/dagger-fall/releases">Open releases</a><a className={styles.button} href="https://github.com/luinbytes/dagger-fall">View source on GitHub</a></div></div></section>
      </main>
    </div>
  );
}
