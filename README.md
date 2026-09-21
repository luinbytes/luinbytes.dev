# luinbytes.dev

Lu's interactive personal portfolio, built around the living pixel pond version of Signal Desk.

The homepage focuses on Lu's current work at [Orchid.ai](https://orchid.ai), selected public projects, and an interactive procedural pond rather than a catalogue of product pages.

The site has two public routes: `/`, the interactive portfolio, and `/pip`, a static product page for Pip, Lu's warm, easygoing Telegram agent. The Pip page is a deliberate standalone exception to the portfolio's homepage-first structure. Retired concept and product URLs resolve to the pond-themed 404 instead of preserving stale copies of older portfolios.

The portfolio features [HomeBot](https://github.com/luinbytes/HomeBot), [rakazo-android](https://github.com/luinbytes/rakazo-android), [Linux Sonar](https://github.com/luinbytes/linux-sonar), [bongocat](https://github.com/luinbytes/bongocat), and [cursor-barrier](https://github.com/luinbytes/cursor-barrier).

Pip has a dedicated introduction below the homepage hero, a **Meet Pip** link to
`/pip`, and a desktop navigation link. Both pages share the Pip speech-bubble
logo and Pixelify wordmark from `components/pip/pip-logo.tsx`.

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
npm run test:pip
```

The browser suite uses Python Playwright. Install its dependency and Chromium once, then run:

```bash
python3 -m pip install -r requirements-test.txt
python3 -m playwright install chromium
npm run test:e2e
```

`npm run test:e2e:setup` runs both setup commands. Set `E2E_PORT` to use a specific isolated test-server port; otherwise the harness allocates one.

The `/pip` page is exported with the rest of the site and keeps its contact action
available as static, readable HTML. Its Telegram target is defined in
`PIP_TELEGRAM_HANDLE` in `lib/pip.ts`; rebuild after changing it so the
configured Telegram handle and contact controls are rendered into the exported
page. Message Pip and copy-handle fallback are available directly, while the
remote QR image is requested from `api.qrserver.com` only after Show QR. The
page's canonical URL is
`https://luinbytes.dev/pip`, and it uses a Pip-specific share card so embeds keep
the product page's identity.

## Deployment

Pushes to `master` build and deploy the static export to [luinbytes.dev](https://luinbytes.dev/) through GitHub Pages.

## Social preview

Open Graph and Twitter large-image cards use checked-in 1200 x 630 PNGs:
`public/share-cards/luinbytes-dev-pond.png` for the homepage and
`public/share-cards/luinbytes-dev-pip.png` for `/pip`. The versioned filenames
avoid reusing the old pink card's cached image URL. The old PNG remains available
for existing links, but no current metadata references it.

The editable layouts are `scripts/share-card.html` for the homepage and
`scripts/pip-share-card.html` for Pip. They use local assets/fonts and render
offline. To regenerate after an intentional design edit, use the browser-test
setup above, then:

```bash
npm run build
python3 scripts/generate-share-card.py
python3 scripts/generate-pip-share-card.py
python3 -m unittest discover -s tests/browser -p '*_test.py' -k ShareCardStaticExportTests -v
```

The generators embed fonts from the built site, render offline, and check loaded
fonts plus a 32px text-safe inset. Review both PNGs at full size and at typical
embed size before updating the expected SHA-256 values in
`ShareCardStaticExportTests` to the generators' printed values. The static-export
test rebuilds and checks the metadata, asset dimensions/hash and absence of old
image references in exported HTML. Normal Pages builds need no Python, browser,
image service or runtime route: Next.js simply exports the checked-in PNGs.

## Credits

- Built by Lu
- Powered by caffeine and spite
