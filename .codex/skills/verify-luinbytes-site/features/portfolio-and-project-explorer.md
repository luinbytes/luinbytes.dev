# Portfolio and project explorer

## Sub-features

Hero copy, featured project navigation, selected-project content, supporting work, external project links, and contact links.

## How to get to it (user POV)

Open `/`, then scroll to `Selected work / 2026`. Choose each project in the `Featured projects` control.

## Driving it with Playwright and T3 preview

Run `npm run test:e2e`. For a focused check, open `/`, click each project button by accessible name, and confirm its matching heading and actions appear. Capture desktop and mobile snapshots.

## Gotchas

Project panels animate. Wait for the selected heading before taking a snapshot. External links should not be followed during a local verification run.
