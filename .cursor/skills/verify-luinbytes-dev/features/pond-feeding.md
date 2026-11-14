# Feed the fish

Clicking open water in the background pond drops food; a koi reserves a pellet, swims to it, and eats.

## Sub-features

- `feed-drop` a click on feedable water drops exactly one pellet group where clicked.
- `feed-reserve` a fish reserves the food (`data-food-reservations` non-empty).
- `feed-eat` a fish completes the cycle (`data-fish-fed-count` > 0), never leaves the water, and food on screen never exceeds 8.

## How to get to it (user POV)

- Open `/`, move the pointer over open water (the hint reads `Stay a while. Feed the fish. Click or tap the water`), and click.
- Touch/tap works the same on mobile (not driven by this skill yet).

## Driving it with drive.sh (Playwright)

Preconditions: doctor passes; page loaded at `/?pond-seed=verify-skill` and `[data-pond-state]` has `data-fish-positions`.

- **Find water.** `bin/drive.sh pond-feeding`. The harness hovers a 55 px grid until `[data-pond-state]` reports `data-food-affordance="true"`. Screenshot `01-before-click-pond.png`.
- **Click.** Real `mouse.click` at that point. `data-food-dropped-count` goes from N to N+1 and `data-food-count` > 0; `data-food-last-drop` equals `data-food-requested-at`. Screenshot `02-food-dropped.png`.
- **Reserve and eat.** `data-food-reservations` becomes non-empty (≤20 s), then `data-fish-fed-count` > 0 (≤40 s). Screenshots `03-fish-reserved-food.png`, `04-fish-fed.png`; final counters in `pond-state.json`.
- **Invariants.** `data-fish-water-violation="false"`, `data-food-max-count` ≤ 8.

## Gotchas

- The hero card and nav obscure the pond (`data-pond-obscures`); clicks there do nothing. That is why the harness searches for an affordance instead of using fixed coordinates.
- The `data-*` counters exist only when `window.__POND_TEST_DIAGNOSTICS__` is true. Without it the pond still works but is unobservable through attributes.
- Eating can take 10-30 s; do not shorten the 40 s wait. Do not weaken the journey if a fish never eats: report a failure with `pond-state.json`.
- A right-click must not drop food (covered by the repo's own e2e `test_food_drop_reservation_and_feeding`, not by this journey).
