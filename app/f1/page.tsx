import type { Metadata } from "next";
import F1CommandCentre from "./F1CommandCentre";

export const metadata: Metadata = {
  title: "F1 Command Centre",
  description: "A private, real-data Formula 1 race engineering command centre.",
  alternates: { canonical: "https://luinbytes.dev/f1" },
  robots: { index: false, follow: false, nocache: true },
};

export default function Page() {
  return <F1CommandCentre />;
}
