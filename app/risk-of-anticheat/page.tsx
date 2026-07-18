import type { Metadata } from "next";
import RiskOfAnticheatPage from "./RiskOfAnticheatPage";

export const metadata: Metadata = {
  title: "Risk of Anticheat",
  description:
    "BepInEx mod for Risk of Rain 2. ESP, legitbot, ragebot, projectile prediction, auto-pickup, and an 8-tab custom IMGUI menu. Personal singleplayer/coop replacement for the abandoned Aerolt mod.",
  openGraph: {
    title: "Risk of Anticheat — BepInEx mod for Risk of Rain 2",
    description:
      "ESP, legitbot, ragebot, projectile prediction, auto-pickup, and an 8-tab custom IMGUI menu. Harmony-patched on BepInEx 5.",
    url: "https://luinbytes.dev/risk-of-anticheat",
    siteName: "Luinbytes",
    images: [{ url: "https://luinbytes.dev/share-cards/risk-of-anticheat.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: "https://luinbytes.dev/share-cards/risk-of-anticheat.png" },
};

export default function Page() {
  return <RiskOfAnticheatPage />;
}
