import type { Metadata } from "next";
import { MeteorPage } from "./MeteorPage";

export const metadata: Metadata = {
  title: "Meteor",
  description:
    "Tasks and habits, unified. A local-first Android app with streaks, heatmaps, and a home screen widget. No account required.",
  openGraph: {
    title: "Meteor — Tasks & Habits",
    description:
      "Tasks and habits, unified. Local-first Android app with streaks, heatmaps, and a home screen widget.",
    url: "https://luinbytes.dev/meteor",
    siteName: "Luinbytes",
    images: [{ url: "https://luinbytes.dev/share-cards/meteor.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: "https://luinbytes.dev/share-cards/meteor.png" },
};

export default function Page() {
  return <MeteorPage />;
}
