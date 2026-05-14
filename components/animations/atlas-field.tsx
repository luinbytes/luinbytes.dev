"use client";

import { motion, useReducedMotion } from "framer-motion";

const rings = [
  "h-72 w-72 border-nd-interactive/45",
  "h-52 w-52 border-nd-accent/55",
  "h-32 w-32 border-nd-warning/55",
];

export function AtlasField() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="theme-atlas-field pointer-events-none absolute right-[-8rem] top-1/2 hidden h-[34rem] w-[34rem] -translate-y-1/2 lg:block"
    >
      <motion.div
        className="absolute inset-0 rounded-full border border-nd-border-visible/40"
        animate={
          prefersReducedMotion
            ? undefined
            : { rotate: 360, scale: [1, 1.025, 1] }
        }
        transition={
          prefersReducedMotion
            ? undefined
            : { rotate: { duration: 40, repeat: Infinity, ease: "linear" }, scale: { duration: 8, repeat: Infinity } }
        }
      />
      <motion.div
        className="absolute left-10 top-10 h-[28rem] w-[28rem] rounded-full border border-dashed border-nd-interactive/45"
        animate={prefersReducedMotion ? undefined : { rotate: -360 }}
        transition={
          prefersReducedMotion
            ? undefined
            : { duration: 54, repeat: Infinity, ease: "linear" }
        }
      />
      {rings.map((ring, index) => (
        <motion.div
          key={ring}
          className={`absolute left-1/2 top-1/2 rounded-full border ${ring}`}
          style={{ marginLeft: index * -18 - 144, marginTop: index * -14 - 144 }}
          animate={
            prefersReducedMotion
              ? undefined
              : { x: [0, index % 2 ? -16 : 18, 0], y: [0, index % 2 ? 12 : -14, 0] }
          }
          transition={
            prefersReducedMotion
              ? undefined
              : { duration: 5 + index * 1.3, repeat: Infinity, ease: "easeInOut" }
          }
        />
      ))}
      <motion.div
        className="absolute left-[13rem] top-[14rem] h-4 w-4 border-2 border-nd-accent bg-nd-surface"
        animate={prefersReducedMotion ? undefined : { rotate: [0, 45, 0] }}
        transition={
          prefersReducedMotion
            ? undefined
            : { duration: 3.4, repeat: Infinity, ease: "easeInOut" }
        }
      />
      <div className="absolute left-[11.7rem] top-[15.7rem] h-px w-48 -rotate-12 bg-nd-border-visible/70" />
      <div className="absolute left-[23rem] top-[11rem] font-mono text-[10px] uppercase tracking-label-tight text-nd-text-secondary">
        build vector
      </div>
    </div>
  );
}
