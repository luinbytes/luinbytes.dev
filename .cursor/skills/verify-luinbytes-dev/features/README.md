# luinbytes.dev verification map

Maintained source for verifying what a visitor of luinbytes.dev can do. Read this index, then the matching feature file, then drive it with `bin/drive.sh <feature-id>`.

## Baseline preconditions

- Run `bin/setup.sh` once, then `bin/launch.sh`; require `bin/doctor.sh` to print `DOCTOR: PASS`.
- The instance is `http://127.0.0.1:<random port>` serving the production export. `drive.sh` reads the URL from the state file; do not hard-code a port.
- No data to seed. Every journey starts from a fresh browser context at 1440x900, default (ASCII) pond view, no reduced-motion preference.
- Never drive an instance this run did not start, and never touch https://luinbytes.dev.

## Driving conventions

- Prefer ARIA roles and accessible names. Stable handles: navigation `Portfolio navigation`, group `Pond view`, button `Copy email address`, headings by text.
- The pond is canvas-like and decorative (`aria-hidden`); observe it through `[data-pond-state]` `data-*` counters (available because the harness sets `window.__POND_TEST_DIAGNOSTICS__ = true`) plus screenshots.
- Use `?pond-seed=verify-skill` on `/` for a repeatable pond.
- External links are asserted by `href`, never followed.

## Proof and skip reporting

- Screenshot the action and the resulting state; save an ARIA snapshot where text structure matters.
- Record the feature ID with every artifact (the evidence folder is named by feature ID).
- Report an unreachable path with the attempted command and the unmet precondition. Do not report a skipped entry point as verified through a different path.
- The run fails on any console error or uncaught page error (the deliberate 404 navigation in `privacy-404` is the only filtered one).

## Features

- [landing-nav](./landing-nav.md): hero, header nav anchors with active-section state, and the four project cards.
- [pond-feeding](./pond-feeding.md): click open water, a pellet drops, a fish reserves it and eats it.
- [pond-view](./pond-view.md): ASCII / Pixel pond view switch.
- [contact-email](./contact-email.md): copy the email address, mailto and book-a-call links.
- [privacy-404](./privacy-404.md): footer Privacy page, retired URLs rendering the pond 404, and the way back home.

Not mapped yet (add when needed): responsive/mobile layouts (320/390 px), `prefers-reduced-motion`, light/dark system color modes, no-JavaScript navigation, share-card/OG metadata. The repo's own `npm run test:e2e` already covers these.
