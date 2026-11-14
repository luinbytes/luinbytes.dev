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
.venv/bin/python -m playwright install --with-deps chromium
```

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

The default branch is `master`. Pushes to `master` run checks, then build and deploy to GitHub Pages.
