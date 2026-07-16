import type { Metadata } from "next";
import BallHammerPage from "./BallHammerPage";

const description =
  "A Darktide Mod Framework Lua 5.1 mod with enemy overlays and configurable aim controls.";

export const metadata: Metadata = {
  title: "BallHammer",
  description,
  alternates: {
    canonical: "https://luinbytes.github.io/ballhammer",
  },
  openGraph: {
    title: "BallHammer — Darktide overlays and aim controls",
    description,
    url: "https://luinbytes.github.io/ballhammer",
    siteName: "Luinbytes",
    images: [
      {
        url: "https://luinbytes.github.io/images/ballhammer/hero.png",
        width: 1672,
        height: 941,
        alt: "Darktide gameplay with BallHammer enemy overlays",
      },
    ],
  },
};

export default function Page() {
  return <BallHammerPage />;
}
