import { ArrowLeft, Waves } from "lucide-react";
import { useSyncExternalStore } from "react";

import { PondEnvironment } from "@/components/concepts/signal-desk/pond-environment";
import { Button } from "@/components/ui/button";
import styles from "./not-found.module.css";

const subscribe = (notify: () => void) => {
  const media = window.matchMedia("(prefers-reduced-motion: reduce)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
const snapshot = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const serverSnapshot = () => true;

export default function NotFound() {
  const reducedMotion = useSyncExternalStore(subscribe, snapshot, serverSnapshot);

  return (
    <section className={styles.page} aria-labelledby="not-found-title">
      <PondEnvironment reduced={reducedMotion} />
      <div className={styles.wash} aria-hidden="true" />

      <a className={styles.brand} href="/" aria-label="Lu, return to the portfolio">
        <span>LU / 6C75</span>
        <small>Software by Lu</small>
      </a>

      <div className={styles.card}>
        <span className={styles.code} aria-hidden="true">404</span>
        <h1 id="not-found-title">Nothing surfaced here.</h1>
        <p>That route drifted out of the pond. The fish deny everything.</p>

        <div className={styles.actions}>
          <Button asChild><a
            href="/"
            className={styles.primaryAction}
          >
            Return to the pond <Waves aria-hidden="true" />
          </a></Button>
          <Button
            variant="outline"
            type="button"
            onClick={() => {
              window.history.back();
            }}
            className={styles.secondaryAction}
          >
            <ArrowLeft aria-hidden="true" /> Go back
          </Button>
        </div>
      </div>
    </section>
  );
}
