# Pip browsing illustration

Lu selected the "Pip beside you" draft. A large Pip avatar sits beside a miniature browser in the Web search card. The illustrative sequence finds a notebook, adds it to a basket, fills example postage details, and reviews checkout.

## Design

Two architecture sketches compared a complete Three scene with a textured browser against HTML browser content with a transparent Three layer. The implementation keeps browser text in HTML for readable copy and static export. Three owns the lit depth, cursor, and click effects. Both use one scene coordinate system.

The existing Web search copy and other features stay in place. The selected illustration fills the empty lower area of the card. The page continues to use the shared Lavender theme.

## Ownership

One implementation worker owns the illustration component, renderer, and CSS. The parent owns route integration, existing browser tests, visual inspection, evidence, and PR delivery. A typed timeline gives all phases one clock. No renderer owns a second animation loop.

## Acceptance

- Inspect the rendered illustration at 320px, 390px, and 1440px in both color schemes.
- Verify a real Three canvas, phase progression, manual pause, offscreen suspension, and remount cleanup.
- Verify reduced motion and WebGL failure retain a static illustration.
- Run lint, production build, browser tests, and the Pip contact contract.
- Keep one branch and PR #58. Stop all temporary validation servers.

## Rendered proof

The parent inspected the real production illustration in both themes at 320px, 390px, and 1440px. The first check reproduced a clipped Continue button at 320px. Compact form spacing fixed it. The final bounds probe checks every action against the browser window at all three widths in both themes. All 30 phase/layout combinations pass.

The initial browser run found a live reduced-motion transition that stopped frames without restoring the static view. The frame loop now reconciles the motion preference before it stops. The focused transition test passes. A separate pond touch check in that initial run missed its double-tap deadline while other probes ran. No pond code changed. The final full suite passed with probes run sequentially.

Manual playback intent is separate from automatic offscreen suspension. The control retains its intended action after the stage leaves view. A context-loss probe removes the canvas, returns to the static view, and records no page errors.

Run the existing browser suite with `npm run test:e2e`. To reproduce the additional geometry checks after a build, run `python3 review-previews/ui-stack/checks/pip-demo-phase-probe.py`. Run `python3 review-previews/ui-stack/checks/pip-demo-probe.py` for both-theme screenshots, context loss, and a recording. These probes use the repository's owned loopback server fixture and stop it afterward.

PASS. The final production build and all 29 browser tests pass. Lint and all 3 Pip contact contract tests pass. The six screenshots cover 320px, 390px, and 1440px in both themes. Physical iPad Safari motion remains unverified.

See the [browser results](checks/pip-demo-browser.log), [phase geometry](checks/pip-demo-phase-layout.json), [desktop screenshot](screenshots/pip-demo-1440-dark.png), [narrow screenshot](screenshots/pip-demo-320-dark.png), and [normal-speed recording](videos/pip-beside-you.mp4).
