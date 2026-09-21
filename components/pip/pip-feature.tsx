import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { PipLogo } from "./pip-logo";
import deskStyles from "@/components/concepts/signal-desk/signal-desk.module.css";
import styles from "./pip-feature.module.css";

export function PipFeature() {
  return (
    <section className={styles.section} id="pip" aria-labelledby="homepage-pip-title">
      <div className={styles.card}>
        <div className={styles.identity}>
          <PipLogo className={styles.logo} />
          <span className={deskStyles.eyebrow}>YOUR TELEGRAM MATE</span>
        </div>
        <div className={styles.copy}>
          <h2 id="homepage-pip-title">A little help. <span>A little banter.</span></h2>
          <p>Meet Pip, your AI mate on Telegram. Quick questions, useful reminders, and a little everyday company.</p>
        </div>
        <div className={styles.actions}>
          <Link href="/pip" className={deskStyles.primaryAction}>
            <span className={styles.actionContent}>Meet Pip <ArrowUpRight aria-hidden="true" /></span>
          </Link>
          <span>Built on Keiki. Made by Lu.</span>
        </div>
      </div>
    </section>
  );
}
