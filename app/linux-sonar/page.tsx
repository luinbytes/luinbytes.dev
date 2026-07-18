import type { Metadata } from "next";
import LinuxSonarPage from "./LinuxSonarPage";

export const metadata: Metadata = {
  title: "linux-sonar",
  description:
    "SteelSeries Sonar for Linux. Five virtual PipeWire sinks for per-app audio routing, ChatMix balancing, and a full mic effects chain (RNNoise, gate, EQ, compressor, limiter). GTK4 GUI with waybar integration.",
  openGraph: {
    title: "linux-sonar — Sonar for Linux on PipeWire",
    description:
      "Per-app audio routing, ChatMix, and mic effects on PipeWire. Full Sonar feature parity on Linux without SteelSeries software.",
    url: "https://luinbytes.dev/linux-sonar",
    siteName: "Luinbytes",
    images: [{ url: "https://luinbytes.dev/share-cards/linux-sonar.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: "https://luinbytes.dev/share-cards/linux-sonar.png" },
};

export default function Page() {
  return <LinuxSonarPage />;
}
