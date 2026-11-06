# luinbytes.dev

Lu's interactive personal portfolio, built around the living pixel pond version of Signal Desk.

The homepage focuses on Lu's selected public projects and an interactive procedural pond rather than a catalogue of product pages.

The site has two public routes: `/`, the interactive portfolio, and `/privacy`, a short personal-use privacy policy. Retired concept and product URLs resolve to the pond-themed 404.

The portfolio features [HomeBot](https://github.com/luinbytes/HomeBot), [rakazo-android](https://github.com/luinbytes/rakazo-android), [Linux Sonar](https://github.com/luinbytes/linux-sonar), [bongocat](https://github.com/luinbytes/bongocat), and [cursor-barrier](https://github.com/luinbytes/cursor-barrier).

The interface follows the system light/dark preference. The pond, fish,
feeding controls, and portrait foil retain their existing behavior in both modes.
Navigation is available at every screen size, including without JavaScript.

## Stack

- Vite 8 with React prerendering for GitHub Pages
- React 19 and TypeScript
- ui-stack shadcn/Radix components, Lavender Glass tokens, CSS Modules, and Tailwind CSS v4
- Framer Motion for interface motion
- Three.js and Yuka for the procedural pond ecosystem
- Lucide React for interface icons

## Development

```bash
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

Run the production checks:

```bash
npm run lint
npm run build
npm run test:pond
```

The browser suite uses Python Playwright. Install its dependency and Chromium once, then run:

```bash
python3 -m pip install -r requirements-test.txt
python3 -m playwright install chromium
npm run test:e2e
```

`npm run test:e2e:setup` runs both setup commands. Set `E2E_PORT` to use a specific isolated test-server port; otherwise the harness allocates one.

`npm run preview` serves the built `out` directory at http://127.0.0.1:3004 with real 404 responses. The browser suite uses this production export.

## Deployment

Pushes to `master` build and deploy the static export to [luinbytes.dev](https://luinbytes.dev/) through GitHub Pages.

## Social preview

Open Graph and Twitter large-image cards use the checked-in 1200 x 630 PNG
`public/share-cards/luinbytes-dev-pond.png` for the homepage. The versioned filename
avoids reusing the old pink card's cached image URL. The old PNG remains available
for existing links, but no current metadata references it.

The editable layout is `scripts/share-card.html` for the homepage. It uses local assets/fonts and renders
offline. To regenerate after an intentional design edit, use the browser-test
setup above, then:

```bash
npm run build
python3 scripts/generate-share-card.py
python3 -m unittest discover -s tests/browser -p '*_test.py' -k ShareCardStaticExportTests -v
```

The generator embeds the original card fonts from installed Fontsource packages, renders offline, and checks loaded
fonts plus a 32px text-safe inset. Review the PNG at full size and at typical
embed size before updating the expected SHA-256 values in
`ShareCardStaticExportTests` to the generator's printed value. The browser suite builds once and checks the metadata, asset dimensions/hash and absence of old
image references in exported HTML. Normal Pages builds need no Python, browser,
image service or runtime route: Vite copies the checked-in PNGs into the static export.

## Credits

- Built by Lu
- Powered by caffeine and spite

## Security and page loading

Home, privacy, and the 404 page have separate HTML and client entries. Vite generates
their stylesheet and preload links. Run `node scripts/measure-page-assets.mjs`
after a build to inspect each page's initial uncompressed JavaScript and CSS.

Each production page receives a Content Security Policy that allows scripts and
connections from this site. Inline JavaScript, embedded frames, plugins, and form
submissions are blocked. Inline styles remain allowed for React and animation
styles. Blob images remain allowed for local pond textures.

The preview server also sends `X-Content-Type-Options`, `X-Frame-Options`, and
`Referrer-Policy`. These server headers apply to local previews. GitHub Pages and
Cloudflare control the public response headers. In particular, public frame
embedding restrictions require a response header at the hosting layer; an HTML
meta policy cannot enforce `frame-ancestors`.

Pull requests run dependency auditing, lint, unit tests, and the production browser
suite. Deployment actions use pinned commits, and only the deployment job receives
Pages write and identity-token permissions.
