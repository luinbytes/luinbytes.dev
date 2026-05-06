import type { Metadata } from "next";
import SleeprPage from "./SleeprPage";

export const metadata: Metadata = {
  title: "Sleepr",
  description:
    "A quiet Android sleep companion for cycle-aware wake windows, optional live notifications, and private on-device schedule learning.",
  openGraph: {
    title: "Sleepr - Sleep-cycle wake guidance",
    description:
      "A local-first Android sleep companion for wake windows, personal cycle tuning, and calm bedtime planning.",
    url: "https://luinbytes.github.io/sleepr",
    siteName: "Luinbytes",
  },
};

export default function Page() {
  return <SleeprPage />;
}
