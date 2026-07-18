import type { Metadata } from "next";
import { MeteorPrivacyPage } from "./MeteorPrivacyPage";

export const metadata: Metadata = {
  title: "Meteor — Privacy Policy",
  description: "Privacy policy for Meteor, the task and habit tracking app for Android.",
  openGraph: {
    title: "Meteor — Privacy Policy",
    description: "Privacy policy for Meteor, a local-first Android task and habit tracker.",
    url: "https://luinbytes.dev/meteor/privacy",
    siteName: "Luinbytes",
    images: [{ url: "https://luinbytes.dev/share-cards/meteor-privacy.png", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image", images: "https://luinbytes.dev/share-cards/meteor-privacy.png" },
};

export default function Page() {
  return <MeteorPrivacyPage />;
}
