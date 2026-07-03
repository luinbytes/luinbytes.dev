# Design QA

## Issue

#29 Refresh luinbytes.github.io as the Obsidian Pink link dock

## Implementation Screenshots

- Desktop link dock: `/tmp/luinbytes-linkdock-desktop.png`
- Mobile link dock: `/tmp/luinbytes-linkdock-mobile.png`

## State

- Link dock remains a static site in `/mnt/hdd/github/luinbytes.github.io`.
- Visual system now matches Obsidian Pink: dark grid, pink focus, compact command tiles.
- Keyboard shortcut `3` triggers the Discord copy toast.

## Findings

- Passed: five link tiles render on mobile and desktop.
- Passed: email tile fits on mobile.
- Passed: reduced-motion mode skips pointer pings.

## Verification

- Static server at `http://localhost:4174`
- Playwright desktop and mobile screenshots
- Playwright keyboard shortcut check for copy toast

final result: passed

---

## Issue

#28 Align case routes with the Proof Loop

## Implementation Screenshots

- Linux Sonar desktop proof loop: `/tmp/luinbytes-case-proof-linux-desktop-v2.png`
- Meteor mobile proof loop: `/tmp/luinbytes-case-proof-meteor-mobile-v3.png`

## State

- All nine case route components render the shared `CaseProofLoop` block after the hero.
- Each block uses the same four labels: Problem, Build, Verify, Ship.

## Findings

- Passed: `CaseProofLoop` appears in all case routes.
- Passed: desktop proof loop avoids the fixed case HUD.
- Passed: sampled mobile route renders four cards and keeps Ship reachable.

## Verification

- `npm run lint`
- `npx tsc --noEmit`
- `npx next build`
- `rg -n "CaseProofLoop" app components`
- Playwright screenshots for Linux Sonar desktop and Meteor mobile

final result: passed

---

## Issue

#27 Add GSAP Hybrid choreography

## Implementation Screenshots

- Normal motion desktop: `/tmp/luinbytes-gsap-normal-desktop.png`
- Reduced-motion mobile: `/tmp/luinbytes-gsap-reduced-mobile.png`

## State

- GSAP drives the homepage entry, active case entrance, proof signal reveal, and section reveal timelines.
- CSS and React still handle hover, focus, tab, search, and button states.
- `prefers-reduced-motion: reduce` skips the GSAP timelines.

## Findings

- Passed: normal desktop route renders the choreographed homepage with the active case visible.
- Passed: reduced-motion mobile route renders static, visible content.
- Passed: the old constant active-card drift was removed before adding GSAP.

## Verification

- `npm run lint`
- `npx tsc --noEmit`
- `npx next build`
- Playwright normal-motion desktop screenshot
- Playwright reduced-motion mobile screenshot

final result: passed

---

## Issue

#26 Add Proof Rail and Proof Tabs for selected work

## Implementation Screenshots

- Desktop active case: `/tmp/luinbytes-active-case-lean-desktop.png`
- Mobile active case: `/tmp/luinbytes-active-case-lean-mobile.png`

## State

- Active case redesigned as a compact proof inspection surface.
- Desktop uses a four-step Proof Rail grid.
- Mobile uses tappable Proof Tabs.

## Findings

- Passed: active case no longer reads like a mini case study; text is reduced to selected artifact, one problem line, four proof signals, tags, and actions.
- Passed: mobile Verify tab switches to the compact `Source linked` proof signal.
- Passed: old orbit preview CSS and selectors were removed.

## Verification

- `npm run lint`
- `npx tsc --noEmit`
- `rg -n "anomaly-orbit|anomaly-node" app components || true`
- Playwright desktop and mobile screenshots
- Playwright mobile Proof Tab interaction

final result: passed

---

## Issue

#25 Ship the homepage Annoyance Promise with Primary Surface

## Implementation Screenshots

- Desktop: `/tmp/luinbytes-home-primary-desktop.png`
- Mobile: `/tmp/luinbytes-home-primary-mobile.png`

## State

- Home route loaded at `http://localhost:4173`
- Hero includes the Annoyance Promise plus a visible command/search Primary Surface in the first viewport.
- Searching `meteor` in `#hero-command-search` updates the active case title to `Meteor`.

## Findings

- Passed: command/search surface is visible on desktop and mobile without needing to scroll.
- Passed: command list is wired to the same selected-case state as the active case surface.
- Passed: mobile keeps the first viewport focused on the promise and command interaction without text overlap.
- Deferred to issue #26: full Proof Rail/Tabs treatment will replace the interim compact proof-loop cards.

## Verification

- `npm run lint`
- `npx tsc --noEmit`
- Playwright desktop and mobile screenshots
- Playwright interaction check for hero search selection

final result: passed

---

## Issue

#24 Establish the Obsidian Pink shell

## Source Visual Truth

- `/tmp/luinbytes-source-final-lock-desktop.png`
- The source is the final direction-selection screen, so QA is against visual language, shell tone, surface treatment, and motion-ready structure rather than literal page layout.

## Implementation Screenshots

- Desktop: `/tmp/luinbytes-impl-shell-desktop-v3.png`
- Mobile: `/tmp/luinbytes-impl-shell-mobile-v3.png`

## Comparison Evidence

- Desktop side-by-side: `/tmp/luinbytes-designqa-comparison-desktop.png`

## Viewports

- Desktop: 1280 x 900
- Mobile: 390 x 844

## State

- Home route loaded at `http://localhost:4173`
- Default `anomaly` theme coerced to the Obsidian Pink dark shell
- Reduced-motion protections remain present in global CSS

## Findings

- Passed: base page, header, chips, buttons, and primary case surface now use the dark obsidian palette with pink/cyan accents.
- Passed: stale light-theme token scan found no old pastel, light color-scheme, Precision label, or AI-attribution strings in `app` and `components`.
- Passed: mobile keeps the shell tone and spacing without text overlap in the first viewport.
- Deferred to later issues: source mock's proof-loop command stack and homepage structure are not expected to match yet; those belong to issues #25 and #26.

## Patches Since Previous QA Pass

- Darkened `.anomaly-lens` from translucent pale glass to an opaque obsidian surface.
- Reduced lens conic wash intensity to keep pink/cyan highlights without brightening the panel.
- Removed public AI-attribution easter egg text and data attribute from the root shell.

## Verification

- `npm run lint`
- `npx tsc --noEmit`
- stale-token scan for legacy light/pastel/AI-attribution strings
- Playwright desktop and mobile screenshots

final result: passed
