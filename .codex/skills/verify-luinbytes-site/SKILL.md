---
name: verify-luinbytes-site
description: Drive and verify the luinbytes.dev Next.js portfolio, its interactive pond, responsive project explorer, and pond-themed 404 in a real browser.
---

# Verify luinbytes.dev

## Launch

Install the lockfile once with `npm ci --no-audit --no-fund`.

For the maintained browser suite, run `npm run test:e2e`. The harness selects an unused loopback port, starts its own Next.js development server, waits for the `Ready in` log line and a successful HTTP response, then tears down the exact process group it created.

For collaborative browser inspection, start `npm run dev -- --hostname 0.0.0.0 --port 4173 --webpack` in a PTY. Keep the returned session ID. Wait for `Ready in`, then open environment port 4173 with the T3 preview.

## Doctor

For the suite, read `test-results/dev-server.log` after a failure. Confirm the owned server reached `Ready in` and did not report `EADDRINUSE`.

For a collaborative preview, run `curl --fail --silent --show-error http://127.0.0.1:4173/ >/dev/null` and poll the PTY session. Stop if the process exited or the response fails.

## Drive

Read [features/README.md](features/README.md) and the feature file for the behavior under test. Use `npm run test:e2e` for full regression coverage. Use the T3 preview for a focused visual pass after the last visible change.

Prefer semantic browser locators. The stable handles include the `Featured projects` group, project buttons named `Orchid.ai`, `Rakazo`, `linux-sonar`, and `HomeBot`, the `Feed the fish` button, and the `Back to the pond` link.

## Evidence

The browser suite writes desktop and mobile screenshots plus `dev-server.log` to `test-results/`. Keep those artifacts after teardown. A valid proof exercises the public route through a browser, changes a project selection, checks pond input, and loads an unknown route. A build or source inspection does not replace this proof.

After the final visible change, capture fresh desktop and mobile T3 preview snapshots. Inspect the screenshots for clipping, overlap, unreadable contrast, missing artwork, and broken focus or active states. Record `PASS`, `REVISE`, or `BLOCK`.

## Cleanup

The browser suite cleans up its own server in `tearDownClass`. If it is interrupted, identify the child process created by that test run from `test-results/dev-server.log` and the current process tree. Do not kill by process name.

For a collaborative preview, send Ctrl-C to the exact PTY session started under Launch. Poll it until it exits, then verify `curl http://127.0.0.1:4173/` fails. Keep `test-results/` as evidence. Remove `.next-e2e/` only when it is no longer needed for diagnosis.

## Helpers

`tests/browser/browser_test.py` is the maintained harness. Run it through `npm run test:e2e` so the repository command remains the source of truth.
