import type { Metadata } from "next";
import { Pixelify_Sans, Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import siteConfig from "@/site.config.json";

const { siteUrl } = siteConfig;

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
    "Lu makes stubborn software behave: Orchid.ai's native Android app, agent systems, Linux tools, and practical software.",
  metadataBase: new URL(siteUrl),
  twitter: {
    card: "summary_large_image",
    title: "Lu | Software Engineer",
    description:
      "I make stubborn software behave. Native Android, agent systems, Linux tools, and practical software.",
    creator: "@x6c75",
    images: `${siteUrl}/share-cards/luinbytes-dev-pink-print.png`,
  },
  openGraph: {
    type: "website",
    locale: "en_GB",
    url: siteUrl,
    title: "Lu | Software Engineer",
    description:
      "I make stubborn software behave. Native Android, agent systems, Linux tools, and practical software.",
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
    "Next.js",
    "TypeScript",
    "Android",
    "Kotlin",
    "Orchid.ai",
    "AI Agents",
    "HomeBot",
    "Rakazo",
    "Linux",
    "PipeWire",
    "CLI Tool",
    "Open Source",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${spaceGrotesk.variable} ${pixelify.variable} ${spaceMono.variable} font-body bg-nd-black text-nd-text-primary antialiased`}
      >
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[200] focus:border-2 focus:border-dark-brown focus:bg-paper focus:px-4 focus:py-3 focus:font-mono focus:text-[12px] focus:font-bold focus:uppercase focus:tracking-[0.08em] focus:text-dark-brown focus:outline focus:outline-3 focus:outline-paper focus:outline-offset-3"
        >
          Skip to content
        </a>
        <main id="main" tabIndex={-1}>{children}</main>
      </body>
    </html>
  );
}
