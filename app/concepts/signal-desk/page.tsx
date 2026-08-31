import type { Metadata } from "next";
import { SignalDesk } from "@/components/concepts/signal-desk/signal-desk";

export const metadata: Metadata = {
  title: "Signal Desk | Lu portfolio concept",
  description: "A tactile, interactive portfolio concept for Lu's work at Orchid.ai and in open source.",
};

export default function SignalDeskPage() {
  return <SignalDesk />;
}
