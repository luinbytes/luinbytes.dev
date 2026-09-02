# luinbytes.dev

Lu's interactive personal portfolio, built around the living pixel pond version of Signal Desk.

The homepage focuses on Lu's current work at [Orchid.ai](https://orchid.ai), selected public projects, and an interactive procedural pond rather than a catalogue of product pages.

The site intentionally has one public route: `/`. Retired concept and product URLs resolve to the pond-themed 404 instead of preserving stale copies of older portfolios.

The portfolio features [HomeBot](https://github.com/luinbytes/HomeBot), [rakazo-android](https://github.com/luinbytes/rakazo-android), [Linux Sonar](https://github.com/luinbytes/linux-sonar), [bongocat](https://github.com/luinbytes/bongocat), and [cursor-barrier](https://github.com/luinbytes/cursor-barrier).

## Stack

- Next.js 16 with static export for GitHub Pages
- React 19 and TypeScript
- Tailwind CSS v4
- Framer Motion for interface motion
- PixiJS and Yuka for the procedural pond ecosystem
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
