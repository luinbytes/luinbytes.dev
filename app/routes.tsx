import type { ComponentType } from "react";
import siteConfig from "@/site.config.json";
import Home from "./page";
import PipPage from "./pip/page";
import NotFound from "./not-found";

type RouteMetadata = {
  title: string;
  socialTitle: string;
  description: string;
  socialDescription: string;
  canonical: string;
  image: string;
  imageAlt: string;
  noindex?: boolean;
};

export type SiteRoute = {
  path: "/" | "/pip" | "/404";
  output: "index.html" | "pip.html" | "404.html";
  Component: ComponentType;
  metadata: RouteMetadata;
};

const homeMetadata: RouteMetadata = {
  title: "Lu | Software Engineer",
  socialTitle: "Lu | Software Engineer",
  description: "Lu makes stubborn software behave: Orchid.ai's native Android app, agent systems, Linux tools, and practical software.",
  socialDescription: "I make stubborn software behave. Native Android, agent systems, Linux tools, and practical software.",
  canonical: siteConfig.siteUrl,
  image: `${siteConfig.siteUrl}/share-cards/luinbytes-dev-pond.png`,
  imageAlt: "Lu | Software Engineer",
};

const pipDescription = "A little help, one message away. Pip is your warm, easygoing Telegram agent for questions, web searches, reminders, and everyday life. Built on Keiki.";

const notFoundRoute: SiteRoute = {
  path: "/404",
  output: "404.html",
  Component: NotFound,
  metadata: { ...homeMetadata, noindex: true },
};

export const siteRoutes: readonly SiteRoute[] = [
  { path: "/", output: "index.html", Component: Home, metadata: homeMetadata },
  {
    path: "/pip",
    output: "pip.html",
    Component: PipPage,
    metadata: {
      title: "Pip - Your Telegram mate | Lu",
      socialTitle: "Pip - Your Telegram mate",
      description: pipDescription,
      socialDescription: pipDescription,
      canonical: `${siteConfig.siteUrl}/pip`,
      image: `${siteConfig.siteUrl}/share-cards/luinbytes-dev-pip.png`,
      imageAlt: "Pip - Your Telegram mate",
    },
  },
  notFoundRoute,
];

export function routeForPath(pathname: string): SiteRoute {
  const path = pathname.replace(/\/+$/, "") || "/";
  return siteRoutes.find((route) => route.path === path || `/${route.output}` === path) ?? notFoundRoute;
}

export function RouteHead({ route }: { route: SiteRoute }) {
  const metadata = route.metadata;

  return (
    <>
      <title>{metadata.title}</title>
      <meta name="description" content={metadata.description} />
      <meta name="keywords" content="Software Engineer,Next.js,TypeScript,Android,Kotlin,Orchid.ai,AI Agents,HomeBot,Rakazo,Linux,PipeWire,CLI Tool,Open Source" />
      {metadata.noindex && <meta name="robots" content="noindex" />}
      <link rel="canonical" href={metadata.canonical} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="en_GB" />
      <meta property="og:url" content={metadata.canonical} />
      <meta property="og:title" content={metadata.socialTitle} />
      <meta property="og:description" content={metadata.socialDescription} />
      <meta property="og:site_name" content="Luinbytes" />
      <meta property="og:image" content={metadata.image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/png" />
      <meta property="og:image:alt" content={metadata.imageAlt} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={metadata.socialTitle} />
      <meta name="twitter:description" content={metadata.socialDescription} />
      <meta name="twitter:creator" content="@x6c75" />
      <meta name="twitter:image" content={metadata.image} />
      <meta name="twitter:image:alt" content={metadata.imageAlt} />
    </>
  );
}
