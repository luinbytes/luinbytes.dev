import type { ComponentType } from "react";
import siteConfig from "@/site.config.json";
import Home from "./page";
import PrivacyPage from "./privacy/page";
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
  themeColor?: { light: string; dark: string };
};

export type SiteRoute = {
  path: "/" | "/privacy" | "/404";
  output: "index.html" | "privacy.html" | "404.html";
  Component: ComponentType;
  metadata: RouteMetadata;
};

const homeMetadata: RouteMetadata = {
  title: "Lu — I make stubborn software behave",
  socialTitle: "Lu — I make stubborn software behave",
  description: "Lu makes stubborn software behave: native Android apps, agent systems, Linux tools, and practical software.",
  socialDescription: "I make stubborn software behave. Native Android, agent systems, Linux tools, and practical software.",
  canonical: siteConfig.siteUrl,
  image: `${siteConfig.siteUrl}/share-cards/luinbytes-dev-pond.png`,
  imageAlt: "luinbytes.dev share card: the line “I get annoyed, then I build the missing thing.” beside a pixel-art pond with koi, lily pads and stepping stones.",
  themeColor: { light: "#f5f0e6", dark: "#242d26" },
};

const notFoundRoute: SiteRoute = {
  path: "/404",
  output: "404.html",
  Component: NotFound,
  metadata: { ...homeMetadata, themeColor: undefined, noindex: true },
};

export const siteRoutes: readonly SiteRoute[] = [
  { path: "/", output: "index.html", Component: Home, metadata: homeMetadata },
  {
    path: "/privacy",
    output: "privacy.html",
    Component: PrivacyPage,
    metadata: {
      title: "Privacy Policy | Lu",
      socialTitle: "Privacy Policy",
      description: "Privacy policy for Lu's personal software on luinbytes.dev.",
      socialDescription: "Privacy policy for Lu's personal software on luinbytes.dev.",
      canonical: `${siteConfig.siteUrl}/privacy`,
      image: `${siteConfig.siteUrl}/share-cards/luinbytes-dev-pond.png`,
      imageAlt: homeMetadata.imageAlt,
      noindex: true,
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
      <meta name="color-scheme" content="light dark" />
      {metadata.themeColor && <>
        <meta name="theme-color" media="(prefers-color-scheme: light)" content={metadata.themeColor.light} />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content={metadata.themeColor.dark} />
      </>}
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
