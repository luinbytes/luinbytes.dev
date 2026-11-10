export type PortfolioProjectId =
  | "rakazo-android"
  | "linux-sonar"
  | "homebot"
  | "connectormap";

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
  /** One headline number shown as a figure on the project card. */
  figure?: { value: string; label: string };
};

export const portfolioProjects: PortfolioProject[] = [
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
    figure: { value: "4", label: "highlighted merged PRs upstream" },
    proof: ["Native client", "Reliability + performance"],
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
    figure: { value: "5", label: "virtual audio channels" },
    proof: ["USB-HID ChatMix", "PipeWire + WirePlumber"],
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
  {
    id: "connectormap",
    name: "ConnectorMap",
    category: "Agent directory",
    eyebrow: "Live directory / channel 05",
    summary: "Which AI agents can actually use which apps.",
    detail:
      "A directory comparing app connections across AI agents, with read and act capabilities, clearly marked inferences, and links to sources.",
    href: "https://connectormap.luinbytes.dev",
    image: "/images/portfolio/connectormap-card.webp",
    imageAlt: "ConnectorMap matrix of AI agents and apps",
    proof: ["Read + act", "Marked inferences", "Source links"],
  },
];

export const portfolioIdentity = {
  email: "0x6c75@gmail.com",
  calendar: "https://cal.com/luinbytes",
  github: "https://github.com/luinbytes",
  x: "https://x.com/x6c75",
} as const;
