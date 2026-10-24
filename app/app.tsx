import type { ComponentType } from "react";
import RootLayout from "./layout";

export function App({ Page }: { Page: ComponentType }) {
  return <RootLayout><Page /></RootLayout>;
}
