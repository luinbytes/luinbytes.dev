import type { Metadata } from "next";
import SuperHackerGolfPage from "./SuperHackerGolfPage";

export const metadata: Metadata = {
  title: "SuperHackerGolf",
  description:
    "Client-side cheat mod for Super Battle Golf. Aim assist, trajectory prediction, ESP, weapon aimbot, and client-side kick resistance built on MelonLoader.",
  openGraph: {
    title: "SuperHackerGolf — Client-side cheat mod for Super Battle Golf",
    description:
      "Aim assist with decompiled physics, weapon aimbot, ESP overlay, item spawner, and client-side kick resistance. Built on MelonLoader + HarmonyX.",
    url: "https://luinbytes.dev/super-hacker-golf",
    siteName: "Luinbytes",
    images: [{ url: "https://luinbytes.dev/share-cards/super-hacker-golf.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: "https://luinbytes.dev/share-cards/super-hacker-golf.png" },
};

export default function Page() {
  return <SuperHackerGolfPage />;
}
