import type { Metadata } from "next";
import BrcTrainerPage from "./BrcTrainerPage";

export const metadata: Metadata = {
  title: "BrcTrainer",
  description:
    "Internal trainer for Bomb Rush Cyberfunk. BepInEx 5 Mono plugin with an IMGUI sidebar menu — infinite boost, speed multiplier, god mode, no heat, REP editor, time scale, and Proton-safe dynamic fonts.",
  openGraph: {
    title: "BrcTrainer — Trainer for Bomb Rush Cyberfunk",
    description:
      "BepInEx 5 Mono plugin with an IMGUI sidebar menu. Infinite boost, speed, god mode, no heat, REP editor, time scale. Works under Proton.",
    url: "https://luinbytes.dev/brc-trainer",
    siteName: "Luinbytes",
    images: [{ url: "https://luinbytes.dev/share-cards/brc-trainer.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: "https://luinbytes.dev/share-cards/brc-trainer.png" },
};

export default function Page() {
  return <BrcTrainerPage />;
}
