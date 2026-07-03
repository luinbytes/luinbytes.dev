"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function HomeCommandChoreography() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap
        .timeline({ defaults: { ease: "power3.out" } })
        .from("[data-command-intro]", {
          y: 24,
          opacity: 0,
          duration: 0.72,
          stagger: 0.08,
        })
        .from(
          "[data-primary-surface]",
          {
            y: 20,
            opacity: 0,
            duration: 0.58,
          },
          "-=0.3"
        )
        .from(
          "[data-active-case]",
          {
            x: 34,
            opacity: 0,
            duration: 0.68,
          },
          "-=0.42"
        );

      gsap.from("[data-proof-signal]", {
        scrollTrigger: {
          trigger: "[data-active-case]",
          start: "top 68%",
          once: true,
        },
        y: 16,
        opacity: 0,
        duration: 0.44,
        stagger: 0.05,
        ease: "power2.out",
      });

      gsap.utils.toArray<HTMLElement>("[data-command-section]").forEach((section) => {
        gsap.from(section, {
          scrollTrigger: {
            trigger: section,
            start: "top 78%",
            once: true,
          },
          y: 28,
          opacity: 0,
          duration: 0.62,
          ease: "power2.out",
        });
      });
    });

    return () => ctx.revert();
  }, []);

  return null;
}
