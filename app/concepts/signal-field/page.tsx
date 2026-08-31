import type { Metadata } from "next";
import { SignalField } from "@/components/concepts/signal-field/signal-field";

export const metadata: Metadata = {
  title: "Signal Field | Lu portfolio concept",
  description: "A spatial, interactive portfolio concept for Lu's work at Orchid.ai and in open source.",
};

export default function SignalFieldPage() {
  return <SignalField />;
}
