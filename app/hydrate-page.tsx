import type { ComponentType } from "react";
import { hydrateRoot } from "react-dom/client";
import "@fontsource-variable/pixelify-sans";
import "@fontsource/space-mono/latin-400.css";
import "@fontsource/space-mono/latin-700.css";
import "./globals.css";
import { App } from "./app";

export function hydratePage(Page: ComponentType) {
  const root = document.getElementById("root");
  if (!root) throw new Error("The page is missing its React root.");

  hydrateRoot(root, <App Page={Page} />);
}
