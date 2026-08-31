export type PortfolioProject = {
  id: string;
  name: string;
  category: string;
  summary: string;
  detail: string;
  stack: string[];
  href: string;
};

export const portfolioProjects: PortfolioProject[] = [
  {
    id: "homebot",
    name: "HomeBot",
    category: "AI systems",
    summary: "An open-source home for persistent AI teammates.",
    detail:
      "A Rust server and desktop runtime with native Android access, built around durable conversations, tools, routines, and user-owned state.",
    stack: ["Rust", "Kotlin", "WebSocket"],
    href: "https://github.com/luinbytes/HomeBot",
  },
  {
    id: "rakazo-android",
    name: "rakazo-android",
    category: "Native Android",
    summary: "A community native Android client for Rakazo.",
    detail:
      "A proper mobile surface for agent conversations and tools, shaped for Android rather than squeezed into a wrapped web view.",
    stack: ["Kotlin", "Compose", "Android"],
    href: "https://github.com/luinbytes/rakazo-android",
  },
  {
    id: "linux-sonar",
    name: "linux-sonar",
    category: "Linux audio",
    summary: "Per-app audio routing, ChatMix, and microphone effects for Linux.",
    detail:
      "A native PipeWire and WirePlumber workflow for the headset controls Linux users are usually expected to live without.",
    stack: ["Python", "PipeWire", "GTK4"],
    href: "https://github.com/luinbytes/linux-sonar",
  },
  {
    id: "bongocat",
    name: "bongocat",
    category: "Desktop utility",
    summary: "A small desktop companion animated by keyboard activity.",
    detail:
      "Thirty-one GitHub stars and proof that practical engineering is allowed to produce something charming for its own sake.",
    stack: ["Python", "Linux", "Open source"],
    href: "https://github.com/luinbytes/bongocat",
  },
  {
    id: "cursor-barrier",
    name: "cursor-barrier",
    category: "Systems utility",
    summary: "Pointer control at Linux workspace and monitor edges.",
    detail:
      "A focused C utility that removes one deeply irritating multi-monitor desktop edge case without becoming a platform of its own.",
    stack: ["C", "Linux", "Wayland"],
    href: "https://github.com/luinbytes/cursor-barrier",
  },
  {
    id: "ballhammer",
    name: "BallHammer",
    category: "Runtime tooling",
    summary: "Darktide overlays and configurable aim controls.",
    detail:
      "Runtime instrumentation, visual feedback, and tactical systems built inside the constraints of the Darktide Mod Framework.",
    stack: ["Lua", "DMF", "Game systems"],
    href: "https://github.com/luinbytes/BallHammer",
  },
];

export const portfolioIdentity = {
  name: "Lu",
  role: "Software engineer at Orchid.ai",
  location: "United Kingdom",
  email: "mailto:0x6c75@protonmail.com",
  github: "https://github.com/luinbytes",
  x: "https://x.com/x6c75",
  orchid: "https://orchid.ai",
} as const;
