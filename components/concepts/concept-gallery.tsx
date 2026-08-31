"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Github } from "lucide-react";
import styles from "./concept-gallery.module.css";

const concepts = [
  {
    number: "01",
    title: "Signal Desk",
    label: "Tactile / warm / systems-minded",
    description:
      "A studio patchbay where each repository becomes a live channel and the selected work routes into a central readout.",
    href: "/concepts/signal-desk",
    className: styles.desk,
    motif: <DeskMotif />,
  },
  {
    number: "02",
    title: "TRACE",
    label: "Editorial / bold / identity-led",
    description:
      "A personal field recorder built around the instinct to follow friction until the annoying bit becomes software.",
    href: "/concepts/trace",
    className: styles.trace,
    motif: <TraceMotif />,
  },
  {
    number: "03",
    title: "Signal Field",
    label: "Spatial / playful / exploratory",
    description:
      "A navigable map of open-source work where visitors plot routes from Lu to the tools, systems, and strange edges he builds for.",
    href: "/concepts/signal-field",
    className: styles.field,
    motif: <FieldMotif />,
  },
] as const;

export function ConceptGallery() {
  const reducedMotion = useReducedMotion();

  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <span>LU / PORTFOLIO STUDY</span>
        <span>THREE DIRECTIONS / ONE DECISION</span>
        <a href="https://github.com/luinbytes" target="_blank" rel="noopener noreferrer">
          GitHub <Github aria-hidden="true" />
        </a>
      </header>

      <section className={styles.intro} aria-labelledby="gallery-title">
        <motion.p initial={reducedMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          Interactive portfolio concepts for Lu
        </motion.p>
        <motion.h1 id="gallery-title" initial={reducedMotion ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.5 }}>
          Three completely different ways in.
        </motion.h1>
        <motion.div initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.18 }}>
          <p>
            Each route is a fully responsive MVP with its own identity, motion
            language, and interactive repository experience. Open all three.
            Pick the one that feels most like you.
          </p>
          <span>Software engineer at Orchid.ai</span>
        </motion.div>
      </section>

      <section className={styles.concepts} aria-label="Portfolio concepts">
        {concepts.map((concept, index) => (
          <motion.article
            key={concept.title}
            className={`${styles.card} ${concept.className}`}
            initial={reducedMotion ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06, duration: 0.45 }}
          >
            <div className={styles.cardTopline}>
              <span>{concept.number}</span>
              <span>{concept.label}</span>
            </div>
            <div className={styles.motif} aria-hidden="true">{concept.motif}</div>
            <div className={styles.cardCopy}>
              <h2>{concept.title}</h2>
              <p>{concept.description}</p>
            </div>
            <Link href={concept.href}>
              Enter concept <ArrowUpRight aria-hidden="true" />
            </Link>
          </motion.article>
        ))}
      </section>

      <footer className={styles.footer}>
        <span>Built for comparison, not consensus.</span>
        <a href="mailto:0x6c75@protonmail.com">0x6c75@protonmail.com</a>
      </footer>
    </div>
  );
}

function DeskMotif() {
  return (
    <svg viewBox="0 0 600 260">
      <path d="M38 130C112 130 118 54 197 54s81 153 165 153 84-77 199-77" />
      {[70, 190, 310, 430, 550].map((x) => <circle key={x} cx={x} cy={130} r="17" />)}
    </svg>
  );
}

function TraceMotif() {
  return (
    <svg viewBox="0 0 600 260">
      <path d="M38 45h122v55h112v61h126v54h164" />
      <circle cx="160" cy="100" r="9" />
      <circle cx="398" cy="215" r="9" />
    </svg>
  );
}

function FieldMotif() {
  return (
    <svg viewBox="0 0 600 260">
      <path d="M44 188C130 40 193 239 282 94s151 135 273-30" />
      <path d="M61 211C143 76 213 250 302 121s143 104 239-14" />
      <circle cx="302" cy="121" r="22" />
      <circle cx="103" cy="151" r="8" />
      <circle cx="497" cy="89" r="8" />
    </svg>
  );
}
