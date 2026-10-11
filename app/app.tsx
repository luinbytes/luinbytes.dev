import RootLayout from "./layout";
import type { SiteRoute } from "./routes";

export function App({ route }: { route: SiteRoute }) {
  const Page = route.Component;
  return <RootLayout><Page /></RootLayout>;
}
