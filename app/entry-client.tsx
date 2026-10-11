import { hydrateRoot } from "react-dom/client";
import "@fontsource-variable/pixelify-sans";
import "@fontsource/space-mono/latin-400.css";
import "@fontsource/space-mono/latin-700.css";
import "./globals.css";
import { App } from "./app";
import { routeForPath } from "./routes";

const root = document.getElementById("root");
if (!root) throw new Error("The page is missing its React root.");

hydrateRoot(root, <App route={routeForPath(window.location.pathname)} />);
