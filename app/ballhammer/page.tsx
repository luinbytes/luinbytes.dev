import type { Metadata } from "next";
import BallHammerPage from "./BallHammerPage";

const description =
  "A Darktide mod with all-enemy and pickup ESP, configurable aim and fire controls, and opt-in tactical systems.";

export const metadata: Metadata = {
  title: "BallHammer",
  description,
  alternates: {
    canonical: "https://luinbytes.dev/ballhammer",
  },
  openGraph: {
    title: "BallHammer — Darktide ESP, aim and fire controls, and tactical systems",
    description,
    url: "https://luinbytes.dev/ballhammer",
    siteName: "Luinbytes",
    images: [
      {
        url: "https://luinbytes.dev/share-cards/ballhammer.png",
        width: 1200,
        height: 630,
        alt: "BallHammer — Darktide ESP, aim and fire controls, and tactical systems",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: "https://luinbytes.dev/share-cards/ballhammer.png",
  },
};

export default function Page() {
  return <BallHammerPage />;
}
