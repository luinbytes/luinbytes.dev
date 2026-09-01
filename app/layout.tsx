import type { Metadata } from "next";
import { Pixelify_Sans, Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { SiteFrame } from "@/components/layout/site-frame";
import { siteUrl } from "@/site.config";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const pixelify = Pixelify_Sans({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-pixelify",
  display: "swap",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Lu | Software Engineer",
    template: "%s | Lu",
  },
  description:
    "Lu builds Orchid.ai's native Android app, agent systems, Linux tools, and stubbornly practical software.",
  metadataBase: new URL(siteUrl),
  twitter: {
    card: "summary_large_image",
    title: "Lu | Software Engineer",
    description:
      "I make computers do the useful part. Native Android, agent systems, Linux tools, and practical software.",
    creator: "@x6c75",
    images: `${siteUrl}/share-cards/luinbytes-dev-pink-print.png`,
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: siteUrl,
    title: "Lu | Software Engineer",
    description:
      "I make computers do the useful part. Native Android, agent systems, Linux tools, and practical software.",
    siteName: "Luinbytes",
    images: [
      {
        url: `${siteUrl}/share-cards/luinbytes-dev-pink-print.png`,
        width: 1200,
        height: 630,
        alt: "Lu | Software Engineer",
      },
    ],
  },
  keywords: [
    "Software Engineer",
    "Raycast Extensions",
    "Next.js",
    "TypeScript",
    "Android",
    "Kotlin",
    "Meteor",
    "Sleepr",
    "Sleep App",
    "Habit Tracker",
    "Task App",
    "Linux",
    "PipeWire",
    "Game Mod",
    "BepInEx",
    "CLI Tool",
    "Go",
    "Open Source",
    "Game Development",
  ],
};

import { ConsoleEgg } from "@/components/easter-eggs/console-egg";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="scroll-smooth"
      suppressHydrationWarning
    >
      {/*
        ╔═══════════════════════════════════════════════════════════╗
        ║                                                           ║
        ║   If you're reading this, you're either:                  ║
        ║   a) A curious developer (hi!)                            ║
        ║   b) Lu debugging something I broke (sorry)               ║
        ║   c) A recruiter snooping for code quality (it's good!)   ║
        ║                                                           ║
        ║   Welcome to the aquarium. Please do not tap the glass.      ║
        ║   The fish are unionised and have excellent lawyers.         ║
        ║                                                           ║
        ╚═══════════════════════════════════════════════════════════╝
      */}
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(() => {
  try {
    localStorage.removeItem("lu-theme");
  } catch {}
  document.documentElement.dataset.theme = "ink-paper";
  document.documentElement.style.colorScheme = "dark";
})();`,
          }}
        />
      </head>
      <body
        className={`${spaceGrotesk.variable} ${pixelify.variable} ${spaceMono.variable} font-body bg-nd-black text-nd-text-primary antialiased`}
        suppressHydrationWarning
      >
        <ConsoleEgg />
        <a
          href="#main"
          className="registration-plate sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:border-2 focus:border-dark-brown focus:bg-paper focus:px-4 focus:py-3 focus:font-mono focus:text-[12px] focus:font-bold focus:uppercase focus:tracking-[0.08em] focus:text-dark-brown focus:outline focus:outline-3 focus:outline-paper focus:outline-offset-3"
        >
          Skip to content
        </a>
        <SiteFrame>{children}</SiteFrame>
      </body>
    </html>
  );
}
