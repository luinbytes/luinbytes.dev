"use client";

import Link from "next/link";
import { ArrowLeft, Waves } from "lucide-react";
import { useReducedMotion } from "framer-motion";

import { PondEnvironment } from "@/components/concepts/signal-desk/pond-environment";
import styles from "./not-found.module.css";

export default function NotFound() {
  const reducedMotion = useReducedMotion();

  return (
    <section className={styles.page} aria-labelledby="not-found-title">
      <PondEnvironment reduced={Boolean(reducedMotion)} />
      <div className={styles.wash} aria-hidden="true" />

      <Link className={styles.brand} href="/" aria-label="Lu, return to the portfolio">
        <span>LU / 6C75</span>
        <small>Software by Lu</small>
      </Link>

      <div className={styles.card}>
        <span className={styles.code} aria-hidden="true">404</span>
        <h1 id="not-found-title">Nothing surfaced here.</h1>
        <p>That route drifted out of the pond. The fish deny everything.</p>

        <div className={styles.actions}>
          <Link
            href="/"
            className={styles.primaryAction}
          >
            Return to the pond <Waves aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={() => {
              window.history.back();
            }}
            className={styles.secondaryAction}
          >
            <ArrowLeft aria-hidden="true" /> Go back
          </button>
        </div>
      </div>
    </section>
  );
}
