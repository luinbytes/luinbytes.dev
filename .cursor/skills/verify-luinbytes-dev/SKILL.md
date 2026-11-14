---
name: verify-luinbytes-dev
description: Launch, drive, and prove the luinbytes.dev personal portfolio (Vite 8 + React 19 static export with an interactive koi pond) in headless Chromium. Use when you need to verify a change to its routes (/, /privacy, 404), nav, pond feeding or ASCII/Pixel view switch, contact copy-email button, or to capture screenshot/ARIA evidence of the real site running locally.
---

# Verify luinbytes.dev

**Surface:** a static website visitors use in a browser. Routes: `/` (portfolio + live pond), `/privacy`, and a pond-themed 404 (`out/404.html`). No backend, no auth, no database. The only state is the browser page.
**What gets verified:** the production export (`npm run build` -> `out/`) served by the repo's own `npm run preview` (`scripts/serve-preview.mjs`, loopback only). This is the same artifact CI tests and GitHub Pages ships. `npm run dev` (vite, port 5173) exists for authoring but is not what this skill drives.
**Never** deploy, push, or drive the live https://luinbytes.dev from this skill; every journey runs against `127.0.0.1`.

All paths below are relative to the repo root; helpers are in `.cursor/skills/verify-luinbytes-dev/bin/` (abbreviated `$S`):

```bash
S=.cursor/skills/verify-luinbytes-dev/bin
```

Read `features/README.md` first, then the feature file for what you are verifying.

## Launch

```bash
$S/setup.sh     # once per checkout: npm ci (if no node_modules), .venv + Python Playwright 1.61, Chromium. Idempotent.
$S/launch.sh    # builds, starts preview on a free 127.0.0.1 port, prints BASE_URL=http://127.0.0.1:<port>
```

- `launch.sh` runs `npm run build` (tsc + vite client + SSR + prerender; ~5 s warm), then `npm run preview -- --host 127.0.0.1 --port <free>` under `setsid` and records pid/port/HEAD in `/tmp/verify-luinbytes-dev-<hash-of-repo-path>/state.env`.
- **Ready** means: server log shows `Ready in`, `GET /` contains the hero copy, and `GET /privacy` contains `Privacy Policy`. Not just a listening socket.
- It starts from an empty state every time (nothing to seed; the site has no data store).
- `SKIP_BUILD=1 $S/launch.sh` reuses an existing `out/` (doctor warns if HEAD moved). Do not use it after editing source.
- **Isolation:** one instance per checkout, because `out/` is a single shared build directory. `launch.sh` exits 2 if this checkout's instance is still alive. Two checkouts get separate state dirs and ports and can run side by side. Never drive an instance this run did not start.
- `npm run build` rewrites `public/sitemap.xml` (`prebuild` stamps `lastmod` with the last commit date). That shows up as a modified file in `git status`; `cleanup.sh` restores it. Do not commit it.

## Doctor

```bash
$S/doctor.sh    # read-only; exit 0 + "DOCTOR: PASS" means worth driving
```

Checks: server pid alive, port owned by our process group, build is from current HEAD, `/` serves hero, `/privacy` serves the policy, unknown route returns 404, `.venv` Playwright imports, headless Chromium launches, evidence dir writable. Run it first whenever anything looks off.

## Drive

```bash
$S/drive.sh all [run-id]            # every mapped journey
$S/drive.sh pond-feeding [run-id]   # one journey
```

Journey ids = feature ids: `landing-nav`, `pond-feeding`, `pond-view`, `contact-email`, `privacy-404`. Each is a headless Chromium (1440x900) context driven by ARIA role/name locators (`get_by_role("navigation", name="Portfolio navigation")`, `get_by_role("radio", name="Pixel")`, `get_by_role("button", name="Copy email address")`, ...) with real mouse/keyboard input. Exit 0 only if every selected journey passed **and** logged no console errors or page errors. The pond journey additionally reads `data-*` attributes on `[data-pond-state]` (food and fish counters) that the site exposes when `window.__POND_TEST_DIAGNOSTICS__` is true (set by the harness; read-only, same hook the repo's own e2e uses). The click that feeds fish is a real mouse click.

For ad-hoc exploration, reuse `drive.py`'s helpers or write a throwaway Playwright script against `BASE_URL` from `state.env`; use `?pond-seed=<text>` on `/` for a deterministic pond. Prefer role locators; the pond is a canvas, so water points are found by hovering until `data-food-affordance="true"`.

## Evidence

Written to `<repo parent>/evidence/luinbytes.dev/<run-id>/` (override with `VERIFY_EVIDENCE_ROOT`; `<run-id>` defaults to a timestamp). For this checkout that is `/workspace/qa/evidence/luinbytes.dev/<run-id>/`. It is outside the repo and outside the `/tmp` state dir, so `cleanup.sh` never removes it.

Per journey `<feature-id>/`: numbered screenshots (`NN-<step>.png`: the action and the resulting state), `*.aria.txt` ARIA snapshots, `result.json` (checks, console/page errors, base URL, HEAD sha), `traceback.txt` + `NN-FAILURE.png` on failure. Run-level `summary.json`.

Proof standards:
- Exercise the real user path: clicks on the real nav links, real water, real button. No internal setters, no direct calls to app state.
- Capture the action *and* the resulting state, not just the final screen (e.g. before-click pond, food-dropped, fish-fed).
- Verify side effects alongside what is visible: pellet counters in the pond model, clipboard contents after Copy, the URL hash and `aria-current` after nav, HTTP status for 404s.
- The site makes no network calls beyond its own origin (strict CSP in `scripts/security-policy.mjs`), so there is nothing to mock. External links (GitHub, cal.com, X, mailto) are asserted by `href` only; never click them out.
- A skipped entry point is reported as skipped, never as verified through another path.

## Cleanup

```bash
$S/cleanup.sh   # idempotent
```

Kills only the process group `launch.sh` created (pid recorded in state.env; refuses if the pid is not our group leader), removes `out/` and `.prerender/` when launch built them, restores `public/sitemap.xml` (`git checkout --`; any manual edit to that file is lost), and deletes the `/tmp` state dir. **Evidence is not touched.** Run it after every attempt, including failed ones. After cleanup, `git status --short` should show only your intended changes, and `ss -ltn` should not list the recorded port.

## Helpers

| Script | Invocation | Purpose |
|---|---|---|
| `bin/setup.sh` | `$S/setup.sh` | one-time deps: node_modules, `.venv` (gitignored), Playwright Chromium |
| `bin/launch.sh` | `$S/launch.sh` (`SKIP_BUILD=1` optional) | build + start preview, print `BASE_URL` |
| `bin/doctor.sh` | `$S/doctor.sh` | read-only health gate |
| `bin/drive.sh` | `$S/drive.sh <feature-id\|all> [run-id]` | run journeys, write evidence |
| `bin/drive.py` | called by `drive.sh` only | Playwright journeys; add a function + `JOURNEYS` entry for a new feature |
| `bin/cleanup.sh` | `$S/cleanup.sh` | tear down what launch started; keep evidence |
| `bin/_common.sh` | sourced by the others | repo root, state dir, evidence root |

## Existing checks (run these too; they are what CI runs)

`npm ci`, `npm audit --audit-level=high`, `npm run lint`, `npm run test:pond` (54 node tests), `npm run check` (tsc), then `PATH="$PWD/.venv/bin:$PATH" npm run test:e2e` (builds, then 49 Python Playwright tests, ~3.5 min; it owns its own preview server and rebuilds `out/`, so **never run it while `launch.sh`'s instance is up**). CI is `.github/workflows/checks.yml`.

Keeping this map honest as the site changes: `/maintain-verification-skill`.
