export type PortfolioProjectId =
  | "spectra"
  | "rakazo-android"
  | "linux-sonar"
  | "homebot"
  | "connectormap";

export type PortfolioProject = {
  id: PortfolioProjectId;
  name: string;
  category: string;
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
    id: "spectra",
    name: "Spectra",
    category: "Linux-first browser",
    summary: "A Linux-first browser with AI designed into the whole stack.",
    detail:
      "Built on Helium and Chromium, Spectra is designed for full browser extension support, Arc-style Spaces, and AI that can see page context, think across tabs, organise them, and act in a tab. The design puts AI in the page and the command centre, with no AI sidebar. Spectra is early and in active development. There are no releases yet.",
    href: "https://github.com/luinbytes/spectra",
    secondaryHref: "https://github.com/luinbytes/spectra-linux",
    secondaryLabel: "Linux packaging",
    figure: { value: "4", label: "planned AI capabilities" },
  },
  {
    id: "rakazo-android",
    name: "Rakazo",
    category: "Android + upstream",
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
