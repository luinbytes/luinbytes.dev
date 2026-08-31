import type { Metadata } from "next";
import TracePortfolio from "@/components/concepts/trace/trace-portfolio";

export const metadata: Metadata = {
  title: "Trace | Lu",
  description:
    "Lu's interactive portfolio: software engineering, open-source systems, and useful weird little tools.",
};

export default function TracePage() {
  return <TracePortfolio />;
}
