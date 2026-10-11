# Built-site verification

The checks exercise the Vite static export rather than a development server. Browser verification uses the existing Python Playwright suite and T3 collaborative preview. No live Telegram message is sent.

## Completed checks

- TypeScript, ESLint, and client/server builds pass. Prerendering writes homepage, Pip, and 404 HTML.
- Pond domain tests pass all 11 cases. Pip contact tests pass all 3 cases.
- Both dependency audits report zero vulnerabilities, including the development toolchain.
- Parent-observed check. Both social-card generators render offline with the original fonts and copy. Outputs went to temporary files so the checked-in PNGs stay unchanged.
- Parent-observed HTTP check. The preview server returns 200 for public routes and HTML aliases, 404 for unknown routes, 400 for malformed or escaping paths, 405 for unsupported methods, and an empty body for HEAD.

## Browser integration

The first complete run executed 26 tests and found three failures. Theme-switch transitions temporarily reduced primary-button contrast, project labels were below the existing minimum, and a fixed-delay fade assertion sampled opacity at 0.998914. The fixes remove primary-button background color transitions, raise project proof labels to 11px, and wait for the literal final opacity of 1 within three seconds. The final rebuilt export passes all 26 tests.

Parent-observed collaborative browser check. The T3 browser confirmed real Three rendering, animated fish and cat, responsive layouts at 390 and 1440 widths, navigation to Pip, and a pond-backed 404 with noindex metadata. The T3 browser also selected HomeBot, confirmed its contained screenshot, and dropped food into open water. A forced context loss returned the pond to fallback with zero canvas. Development SSR was checked for homepage, Pip, and a real 404 response.

## Limits

WebGL2 is required for the live pond. Failed or unavailable WebGL uses the original static artwork. Browser checks prove the contact links and client behavior, not a live bot response. The user supplied an iPad Safari screenshot of the earlier preview. Automated checks remain Chromium-only. The final Safari interactions, deployment, and user acceptance remain unverified.

## Evidence

The checked-in [browser log](checks/browser.log) contains the final build and all 26 results. [Pond](checks/pond.log), [Pip](checks/pip.log), [lint](checks/lint.log), and [dependency audit](checks/audit.json) results are separate evidence. The [social-card results](checks/social-cards.json) retain font, copy, and crop measurements without changing the existing PNGs.

Fresh screenshots cover [desktop homepage](screenshots/home-1440-light.png), [390px dark homepage](screenshots/home-390-dark.png), [320px light homepage](screenshots/home-320-light.png), [desktop Pip](screenshots/pip-1440-light.png), [390px dark Pip](screenshots/pip-390-dark.png), and [404](screenshots/404-1440-light.png). These exact-size Playwright captures use reduced motion. The separate T3 interaction checks use normal motion. The final 1440px captures replace earlier T3 images that had been scaled to 1280px.

The build emits a size warning for the lazy Three.js renderer bundle. It remains separate from the primary page bundle. No performance improvement is claimed.

The supplemental [lifecycle probe](checks/pond-lifecycle.json) passes forced artwork HTTP 503, loading cancellation, and running cancellation. It records the aborted fetch, released contexts, cancelled animation frame, no callbacks after context loss, and a final single live canvas. It proves explicit cleanup, not heap or graphics-driver reclamation.

The [interrupted baseline](checks/baseline-interrupted.log) and [first browser failure log](checks/first-browser-failures.log) preserve the earlier limits and fixes. They are historical evidence rather than passing checks.

The iPad QA server binds to all local interfaces at port 3006. It serves the current verified export. An isolated source copy runs the additional all-page contrast checks so the QA server can stay available during builds. No extra branch or PR is created.

## iPad QA refinement

The hero now uses neutral translucent glass, white type, and neutral actions. The lower cards retain Lavender. One shared gap removes accumulated section padding. The [layout probe](checks/homepage-layout.json) measures equal gaps between all major card boundaries at 320, 390, 1180, and 1440px. The gaps are 20, 20, 29.5, and 32px respectively. The hero fits each viewport and horizontal overflow is zero.

PASS. All 26 browser tests and lint pass after the final hero and spacing change. The [LAN readback](checks/lan-preview.json) verifies that all three served pages match the isolated export. The final build runs in an isolated source copy. Its assets are copied to the existing preview, and HTML is replaced atomically. The LAN server stays running at the same address.

## Attention

The decision trail was independently audited by gpt-6-astra. The audit found mislabeled screenshot dimensions and temporary proof pointers. Final captures now have their named dimensions, failed-run logs are retained, and manual checks are labeled parent-observed. An earlier decision row described artifacts as committed before the commit existed. A later row corrects that status. No transcript directory was supplied.

## Almost transparent hero follow-up

The user requested still clearer glass. The hero now has 12% to 18% tint, reduced from 60% to 68%. Blur drops from 10px to 2px. Text shadows protect readability over moving artwork. The secondary action retains a local 32% tint. Lower panel styling and all spacing rules stay the same.

The parent inspected the new material in T3. The four-width layout probe and exact-size homepage screenshots were refreshed. The follow-up build briefly ran against the served output because the initial command used the repository working directory. The final browser run uses the isolated copy, and final publication copies assets before replacing HTML atomically. The server process stays running.

PASS. The almost transparent hero revision passes lint, the production build, and all 26 browser tests. The final LAN readback matches the isolated export. Refreshed layout measurements pass at all four widths.
