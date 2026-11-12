# Browser verification after design PR 92

Base: `d3bb71254ae1e6de4c0a0c248827cbee5812b284`.

The original [verification run](https://github.com/luinbytes/luinbytes.dev/actions/runs/42925766714)
ran 48 tests and reported 18 failures and 8 errors, including subtests.
The diagnosis compares those failures with [PR 92's stated intent](https://github.com/luinbytes/luinbytes.dev/pull/92)
and the merged source. No changes from PR 93 are included.

| Original failure | First divergence | Resolution and retained coverage |
| --- | --- | --- |
| `test_copyright_year_hydrates_when_the_visitors_clock_differs` | Instrument Serif's data URL violates `font-src 'self'` | Actual regression. Extract the identical 21,032 font bytes into `app/fonts`, bundled by Vite. Keep CSP and console assertions unchanged; add explicit font loading coverage. |
| `test_homepage_is_responsive_and_routes_featured_work` at desktop and mobile | Project buttons no longer exist | Inspect all four cards, headline figure, project actions and event isolation. |
| `test_project_marker_is_centered_for_every_selection` at 1440, 390 and 320 | Removed selection buttons and marker | Replace with all four cards visible without selection, readable headings and visible project actions at all three sizes. Wrapping is allowed; horizontal text overflow is not. |
| `test_homepage_preserves_layout_and_world_state_across_viewport_matrix` at nine sizes | Removed tab selectors yield zero targets | Check card action target sizes, one column or two column grid geometry and heading containment. Preserve fish continuity, separation, water bounds, pond size and overflow checks. |
| `test_mobile_navigation_hero_viewport_and_system_color_modes` at 320 and 390 | About is now More | Match More to the existing `#about` anchor; retain focus, touch target, visibility, contrast and theme assertions. |
| `test_navigation_and_bordered_controls_keep_their_visual_hierarchy` | About label, then tabbed project assumptions | Match More and inspect card labels, project links, illustrations and proof tags directly. Scope illustration selectors to artwork, since actions now precede the illustration and their 15px link icons are the first SVGs. |
| `test_actions_captions_privacy_and_immediate_navigation` | About locator never matches | Use More; retain immediate active section, privacy, caption and layout checks. |
| `test_pointer_stirs_the_pond` | Page selection is now auto | Expect restored page selection; preserve pointer reaction, ripple, wake, water safety and clean console assertions. |
| `test_hero_copy_does_not_block_pointer_water_reaction` | Hero paper card intentionally owns pointer input and is marked `data-pond-obscures` | Check selectable copy blocks food input and affordance. Open water still has dedicated pointer coverage. |
| `test_pixel_food_pause_and_reduced_motion` | Right click no longer feeds | Use single primary click; retain Pixel food, reduced motion, pause and resume checks. |
| `test_food_drop_reservation_and_feeding` | Right click no longer feeds or suppresses context menu | Assert context menu is allowed and does not feed, then primary click feeds at requested coordinates. Retain reservation, completed feeding, capacity and water safety checks. |
| `test_reduced_motion_preserves_the_ecosystem_at_low_speed` | Right click no longer feeds | Use primary click; retain fish motion, water motion, live renderer and clean console checks. |
| `test_mobile_touch_disturbs_the_shared_pond` | Single tap now reports tap-food and drops food | Require one pellet and one splash from one real touch tap. Retain coordinate agreement, UI isolation and rejection of moved, cancelled and multiple touch gestures. |
| `test_every_scoped_route_exports_a_production_large_image_card` | Share card alt intentionally changed | Match descriptive alt. Preserve PNG dimensions, hash and metadata consistency checks. |

## Scope and limits

No design, interaction implementation, security policy, workflow or feeding access
changes. Font bytes are identical to the embedded source; existing OFL license
remains in `app/fonts`. Verification uses the production export on loopback,
not a deployment. Mac Chromium evidence does not establish Linux Actions or
physical mobile device results.

## Verification on 11 November 2026

Confirmed font cause locally before the fix: production build followed by
`python -m unittest discover -s tests/browser -p '*_test.py' -k copyright -v`
failed with the same CSP console error as Actions. After the fix that test and
the explicit font loading test both pass.

Final `npm run test:e2e` passed all 49 tests in 214.724 seconds, with no skips.
This includes a fresh production build. All original failing cases, including
the replaced project selection case, are covered in the full rerun. The first
updated suite exposed one further stale selector: the new project link icon
preceded the HomeBot artwork. Scoping the selector to `projectIllustration`
restored the original meaningful width assertion; the final suite passes it.

`npm run lint`, `npm run test:pond` (54 tests), `npm audit --audit-level=high`,
and `git diff --check` also pass. Audit reports seven existing moderate
vulnerabilities. Dependencies are unchanged. Environment: macOS, Node 26.5.0,
Python 3.14.7, Playwright 1.61.0 and Chromium 1228. Actions uses Node 22 on Linux;
that environment was not run locally.

The extracted font SHA256 is
`5eb09b5ac0e28b67c2f041c8ba6d244604ca0c0980d65912ab2d47fed84ddc31`,
matching the decoded data URI on the base commit.

Local evidence is retained beside the isolated checkout in
`design-baseline-local.log`, `design-e2e-first.log`, `design-e2e-final.log`,
`design-lint-final.log`, `design-pond.log`, and `design-audit.log`.
Generated `test-results/project-grid-{320,390,1440}.png` and
`test-results/portfolio-final-{desktop,mobile}.png` show the restored font
and grid. Reviewed those screenshots for heading readability and horizontal
containment. Full page captures include fixed element and offscreen animation
artifacts and do not replace the viewport assertions.

Change Review: no findings in the final diff. No tests disabled, security
assertions loosened, or shared interaction code changed. Temporary Python
environment removed after verification. Local dependencies, production export,
and evidence files remain for review; generated sitemap date changes are excluded.
