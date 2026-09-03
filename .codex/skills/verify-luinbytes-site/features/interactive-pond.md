# Interactive pond

## Sub-features

Pointer disturbance, right-click feeding, touch feeding, fish food reservation, cat hunting, loading state, WebGL fallback, and lifecycle cleanup.

## How to get to it (user POV)

Open `/?pond-seed=<stable-test-seed>`. Move the pointer over open water. Right-click open water on desktop, or double-tap it on touch devices, to feed the fish.

## Driving it with Playwright and T3 preview

Run `npm run test:e2e` for deterministic pond interaction coverage and `npm run test:pond` for seeded simulation rules. For a focused visual check, use the `Feed the fish` button and confirm the pond remains animated and responsive.

## Gotchas

Rocks and foreground art are not open water. The browser harness probes the pond's `data-food-affordance` attribute before clicking. Keep the `pond-seed` query parameter stable when comparing runs.
