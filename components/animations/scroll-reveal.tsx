"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { type ReactNode } from "react";

type ScrollRevealProps = HTMLMotionProps<"div"> & {
  children: ReactNode;
  delay?: number;
  distance?: number;
};

export function ScrollReveal({
  children,
  className,
  delay = 0,
  distance = 18,
  ...props
}: ScrollRevealProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px -10% 0px" }}
      transition={{ duration: 0.28, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
