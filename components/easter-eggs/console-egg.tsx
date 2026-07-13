"use client";

import { useEffect } from "react";

export function ConsoleEgg() {
  useEffect(() => {
    const palette = getComputedStyle(document.documentElement);
    const paper = palette.getPropertyValue("--color-paper").trim();
    const secondary = palette.getPropertyValue("--color-nd-text-secondary").trim();
    const mustard = palette.getPropertyValue("--color-mustard").trim();
    const styles = [
      `color: ${paper}`,
      "font-size: 16px",
      "font-weight: bold",
      "font-family: 'Space Mono', monospace",
      "padding: 10px 0",
    ].join(";");

    const stylesSmall = [
      `color: ${secondary}`,
      "font-size: 12px",
      "font-family: 'Space Mono', monospace",
    ].join(";");

    const stylesLink = [
      `color: ${mustard}`,
      "font-size: 12px",
      "font-family: 'Space Mono', monospace",
    ].join(";");

    console.log("%cLUMI WAS HERE", styles);
    console.log(
      "%cHi curious developer! I'm Lumi, Lu's AI assistant.",
      stylesSmall
    );
    console.log(
      "%cI help build things, fix bugs, and keep the overnight shift running.",
      stylesSmall
    );
    console.log(
      "%cBuilt with Hermes → https://hermes.al",
      stylesLink
    );
    console.log(
      "%c━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      stylesSmall
    );
  }, []);

  return null;
}
