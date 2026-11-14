# luinbytes.dev

## Layout
- `app/`: application and rendering entries; `components/`: UI components; `lib/`: shared logic.
- `public/`: static assets; `scripts/`: generation, prerendering, and preview serving.
- `tests/`: pond Node tests and browser Playwright tests; `review-previews/`: review evidence.
- Configuration: `site.config.json`, `vite.config.ts`, and `eslint.config.mjs`.

## Setup
Use Node 22 and a repo-local Python environment for browser tests:

```sh
npm ci
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements-test.txt
npx playwright install chromium
```

CI's `.github/workflows/checks.yml` uses `--with-deps` to install system packages through sudo apt on the runner. Local/CLI setup must not use `--with-deps`. If Chromium still cannot start because system libraries are missing, those libraries are a host prerequisite; do not install them with sudo or apt as part of repo commands.

## Workflow and completion
- Work on a task branch; never commit to `master`.
- Use repo-local environments and dependencies; do not install packages or toolchains globally.
- Never print, log, or commit secrets, tokens, credentials, or auth-file contents.
- Before claiming done, run the required checks below from the repo root and report results and any blocked or skipped checks.
- Timing-sensitive tests must use a handshake or event, never sleep, extra retries, or a longer timeout to make a test pass.

## Required checks
All required checks must pass:

```sh
npm audit --audit-level=high
npm run lint
npm run test:pond
PATH="$PWD/.venv/bin:$PATH" npm run test:e2e
```

`test:e2e` already runs `npm run build` before the Python browser suite; a successful full gate covers the build without repeating it.

## Development and gotchas
```sh
npm run dev
npm run build
npm run preview
```

The build runs TypeScript checking, Vite client/SSR builds, and prerendering. Preview serves `out/` at http://127.0.0.1:3004 with real 404 responses; browser tests use this production export.

`npm run build` runs `prebuild` (`node scripts/generate-sitemap.js`), which rewrites the `lastmod` values in tracked `public/sitemap.xml`. This also happens during `npm run test:e2e`, since it runs the build. Commit the sitemap change only when the task is to update the sitemap; otherwise, revert it before finishing with `git restore -- public/sitemap.xml`.

The default branch is `master`. Pushes to `master` run checks, then build and deploy to GitHub Pages.
