# Pond view switch

A `Pond view` radio group in the bottom-right corner switches the pond between the ASCII renderer (default) and the Pixel (three.js) renderer.

## Sub-features

- `view-default` ASCII is checked on load.
- `view-pixel` choosing Pixel sets `data-view="pixel"` and the pond keeps running.
- `view-restore` choosing ASCII goes back with the pond still running.

## How to get to it (user POV)

- On `/`, use the `ASCII` / `Pixel` radio pair at the bottom-right of the viewport (group name `Pond view`). Visible at every screen size; hidden without JavaScript.

## Driving it with drive.sh (Playwright)

Preconditions: doctor passes; `/` loaded and the pond reporting `data-fish-positions`.

- **Default.** `bin/drive.sh pond-view`. Radio `ASCII` is checked, `[data-view]` has `data-view="ascii"`. Screenshot `01-ascii-default.png`.
- **Pixel.** `group.get_by_role("radio", name="Pixel").check()`. `[data-view]` becomes `pixel`, `[data-pond-state]` is `running`, fish positions reappear. Screenshot `02-pixel-selected.png`.
- **Back.** Check `ASCII`. `data-view="ascii"`, state `running`. Screenshot `03-ascii-restored.png`, ARIA `pond-view.aria.txt`.

## Gotchas

- Pixel mode loads its renderer lazily; assert with auto-waiting `expect(...)`, not an instant read.
- Pixel pond screenshots need a moment to settle (rely on the `data-view`/`data-pond-state` assertions first). Failure/context-loss recovery paths are covered by the repo's e2e, not this journey.
- Radios are visually styled labels; locate by role `radio` and name, not by the `<i>` stones.
