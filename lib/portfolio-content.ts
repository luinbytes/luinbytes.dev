export type PortfolioProjectId =
  | "orchid-android"
  | "rakazo-android"
  | "linux-sonar"
  | "homebot";

export type PortfolioProject = {
  id: PortfolioProjectId;
  name: string;
  category: string;
  eyebrow?: string;
  summary: string;
  detail: string;
  href: string;
  image?: string;
  imageAlt?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  proof?: string[];
};

export const portfolioProjects: PortfolioProject[] = [
  {
    id: "orchid-android",
    name: "Orchid.ai",
    category: "Native Android",
    eyebrow: "Current work / channel 01",
    summary: "Building the native Android home for an assistant that gets things done.",
    detail:
      "I am building Orchid's native Android app, bringing its message-first assistant into a platform-native experience that feels at home on the device.",
    href: "https://orchid.ai",
    image: "/images/portfolio/orchid-desk.jpg",
    imageAlt: "Orchid's public campaign artwork showing a softly lit working desk",
    secondaryHref: "https://orchid.ai/blog/introducing-keiki",
    secondaryLabel: "Meet Orchid",
    proof: ["Native Android", "Message-first UX", "In active development"],
  },
  {
    id: "rakazo-android",
    name: "Rakazo",
    category: "Android + upstream",
    eyebrow: "Open source / channel 02",
    summary: "A native Android client, plus the upstream work needed to make it honest.",
    detail:
      "I built the community Android client and landed upstream fixes for delegated replies, Android parity, scheduled group work, and long-chat performance.",
    href: "https://github.com/luinbytes/rakazo-android",
    image: "/images/portfolio/rakazo-icon.png",
    imageAlt: "Rakazo Android application icon",
    secondaryHref: "https://github.com/elie222/rakazo/pulls?q=is%3Apr+author%3Aluinbytes+is%3Amerged",
    secondaryLabel: "Merged work",
    proof: ["Native client", "4 highlighted merged PRs", "Reliability + performance"],
  },
  {
    id: "linux-sonar",
    name: "linux-sonar",
    category: "Linux audio",
    eyebrow: "Systems / channel 03",
    summary: "Per-app audio routing, ChatMix, and microphone effects for Linux.",
    detail:
      "A GTK control surface over PipeWire and WirePlumber, with five virtual channels, hardware ChatMix, microphone effects, and systemd lifecycle management.",
    href: "https://github.com/luinbytes/linux-sonar",
    proof: ["5 virtual channels", "USB-HID ChatMix", "PipeWire + WirePlumber"],
  },
  {
    id: "homebot",
    name: "HomeBot",
    category: "Agent systems",
    eyebrow: "Personal system / channel 04",
    summary: "An open-source home for persistent AI teammates.",
    detail:
      "A Rust server, native desktop client, and Android app built around durable conversations, tools, routines, permissions, checkpoints, and user-owned state.",
    href: "https://github.com/luinbytes/HomeBot",
    image: "/images/portfolio/homebot-chat.png",
    imageAlt: "HomeBot native desktop chat interface",
    proof: ["Rust workspace", "Native desktop + Android", "Durable state + recovery"],
  },
];

export const portfolioIdentity = {
  calendar: "https://cal.com/luinbytes",
  github: "https://github.com/luinbytes",
  x: "https://x.com/x6c75",
  orchid: "https://orchid.ai",
} as const;
