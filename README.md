# luinbytes.dev

Lu's personal portfolio, currently presented as three fully built interactive directions for review.

The homepage is a comparison gallery. Each concept reframes the site around Lu, his current work at [Orchid.ai](https://orchid.ai), and a curated group of public repositories rather than a catalogue of product pages.

## What is featured

- `/concepts/signal-desk` — a warm, tactile studio patchbay with animated repository channels.
- `/concepts/trace` — a bold editorial identity with a native range-driven project scrubber.
- `/concepts/signal-field` — a spatial topographic map with plotted repository routes and a list-view fallback.

All three feature [HomeBot](https://github.com/luinbytes/HomeBot), [rakazo-android](https://github.com/luinbytes/rakazo-android), [Linux Sonar](https://github.com/luinbytes/linux-sonar), [bongocat](https://github.com/luinbytes/bongocat), [cursor-barrier](https://github.com/luinbytes/cursor-barrier), and [BallHammer](https://github.com/luinbytes/BallHammer). Existing case-study routes remain available as an archive while a final direction is selected.

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
