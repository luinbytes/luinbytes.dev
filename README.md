# luinbytes.github.io

My portfolio site. Built with Next.js, Tailwind, and too much caffeine.

🚀 Built with help from [Lumi](https://github.com/luinbytes) (AI assistant powered by Hermes)

## What's Inside

- **Brutalist design** - Dark mode, monospace fonts, neon accents
- **Interactive demos** - Raycast extensions, project showcases
- **Live GitHub stats** - Contribution graphs, language breakdown
- **Easter eggs** - Try the Konami code (↑↑↓↓←→BA) 😉

## Stack

- Next.js 16
- React 19
- Tailwind CSS v4
- TypeScript
- Space Mono font

## Development

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000)

### Browser tests

Install the Python test dependency and Chromium once, then run the browser suite:

```bash
python3 -m pip install -r requirements-test.txt
python3 -m playwright install chromium
npm run test:e2e
```

`npm run test:e2e:setup` runs both setup commands. Set `E2E_PORT` to use a
specific isolated test-server port; otherwise the harness allocates one.

## Deployment

Auto-deploys to GitHub Pages on push to master.

## Credits

- Built by Lu
- Debugging by Lumi 🐱
- Powered by caffeine and spite
