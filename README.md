# luinbytes.dev

Lu's personal portfolio: software built from annoying gaps, shipped as useful tools.

The homepage keeps the personal intro up front, then puts the current main release—[Hermes Android](https://github.com/luinbytes/hermes-android)—on its own feature plate. The rest of the work stays in the build index and dedicated case pages.

![Hermes Android](public/images/hermes-android/banner.png)

## What is featured

Hermes Android is an independent native Kotlin and Jetpack Compose client for the Hermes Dashboard. It brings real sessions, profiles, skills, tools, models, providers, automations, voice, files, and Command Center workflows to Android. It is built toward first-party quality, but is not an official Nous Research release.

- [Source repository](https://github.com/luinbytes/hermes-android)
- [Latest release](https://github.com/luinbytes/hermes-android/releases/latest)
- Current featured release: `v1.1.0`

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
