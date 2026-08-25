# luinbytes.dev

Lu's personal portfolio: software built from annoying gaps, shipped as useful tools.

The homepage keeps the personal intro up front, then gives [HomeBot](https://github.com/luinbytes/HomeBot) its own feature section. The rest of the work stays in the build index and dedicated case pages.

## What is featured

HomeBot is an open-source Rust desktop, server, and Android home for persistent AI teammates. It keeps authenticated chats, tools, routines, and repository workspaces server-owned while native desktop and Android clients share the same state.

- [Source repository](https://github.com/luinbytes/HomeBot)
- Current status: pre-v1 development

The homepage's retained build index also covers:

- [Linux Sonar](https://github.com/luinbytes/linux-sonar) — per-app PipeWire routing, ChatMix, and mic effects for Linux.
- Meteor — local-first Android tasks and habits.
- Sleepr — cycle-aware wake guidance and on-device sleep rhythm learning.
- Game Systems — overlays, hooks, trainers, and runtime instrumentation.

Dedicated case pages cover BallHammer, Risk of Anticheat, BrcTrainer, DaggerFall, and SuperHackerGolf.

## Stack

- Next.js 16 with static export for GitHub Pages
- React 19 and TypeScript
- Tailwind CSS v4
- Framer Motion and GSAP for motion
- Lucide React for interface icons

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Run the production checks:

```bash
npm run lint
npm run build
```

The browser suite uses Python Playwright. Install its dependency and Chromium once, then run:

```bash
python3 -m pip install -r requirements-test.txt
python3 -m playwright install chromium
npm run test:e2e
```

`npm run test:e2e:setup` runs both setup commands. Set `E2E_PORT` to use a specific isolated test-server port; otherwise the harness allocates one.

## Deployment

Pushes to `master` build and deploy the static export to [luinbytes.dev](https://luinbytes.dev/) through GitHub Pages.

## Credits

- Built by Lu
- Debugging by Lumi
- Powered by caffeine and spite
