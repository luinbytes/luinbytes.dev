import type { Transition } from "framer-motion";

/**
 * CSS in app/globals.css is the canonical motion-token source. This runtime
 * mirror uses seconds because Framer Motion does; update both files together.
 */
export const motionDuration = {
  quick: 0.16,
  standard: 0.22,
  enter: 0.36,
} as const;

export const motionEase = {
  standard: [0.2, 0.8, 0.2, 1],
  emphasized: [0.16, 1, 0.3, 1],
} as const;

export const caseContentTransition: Transition = {
  duration: motionDuration.standard,
  ease: motionEase.emphasized,
};
