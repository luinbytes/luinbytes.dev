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

## PR profile-card feedback

The user requested axis tilt and avatar-local reflection in [PR comment 6105578449](https://github.com/luinbytes/luinbytes.dev/pull/58#issuecomment-6105578449). Two local Swarm workers own the component fix and browser checks. Their starting head is `632154cd4718a652d23cec69e88108d957854c4a`. The parent owns integration and final production verification.

The user released the iPad QA server. The parent stopped its exact process and confirmed that port 3006 has no listener. Earlier statements that this server remains running describe prior checks.

The confirmed input gap was that touch and pen pointer movement was ignored. Real desktop mouse input already tilted the card. The fix adds direct touch contact, pen movement, and cancellation reset while preserving the orientation fallback. Card coordinates drive tilt. Avatar coordinates drive the foil. The card-wide moving reflection now lives inside the avatar.

The implementation worker checked the local Vite page with Chromium and browser-dispatched touch events. TypeScript, targeted lint, and whitespace checks passed. The comment review found no added comments or proven issues. The browser-test worker did not deliver edits within its bounded task and was interrupted. The parent took ownership of the test and added actual matrix-axis, avatar-center foil, touch, pen, release, cancellation, and reduced-motion checks. Physical iPad input remains unverified.

The parent inspected production screenshots at 320px, 390px, and 1440px. T3 recorded real mouse sweeps at 2× preview zoom. A 25-second crop at normal playback speed was shared in this thread. The recording proves browser mouse behavior, not physical touch or sensor behavior.

PASS. The final production export passes all 26 browser tests, including the strengthened profile-card check. Lint, build, 11 pond tests, and 3 Pip tests pass. The [browser log](checks/profile-browser.log) retains the rebuilt export and test results. [Source hashes and Swarm coverage](checks/profile-motion.json) identify the tested uncommitted inputs. All additional preview servers and the owned T3 tab were stopped.

## Recording feedback correction

The first recording still let card-wide pointer movement update the avatar foil. User review caught this missed boundary. The follow-up gates foil input to the avatar bounds and cancels its spring immediately outside those bounds or when the pointer leaves the card. Card-wide axis tilt remains. A production browser check now moves across the text and asserts that both the foil target and rendered view remain at the neutral value.

The first recording used system light appearance. A static Swarm check confirmed that theme values had not changed between `632154cd4718a652d23cec69e88108d957854c4a` and `f7a8de6a60926244d05070abd2dae6041126fbdc`. The corrected T3 recording explicitly uses dark appearance and reads `--site-bg` as `#252031`. The 2× close-up includes a cursor highlight and stays at normal playback speed. The dark Lavender theme and its system-light variant remain in the stylesheet.

PASS. The final avatar-boundary correction and immediate exit reset pass lint, production build, and all 26 browser tests. The retained profile browser log now contains this final run. The unchanged pond and Pip domain contracts passed their separate suites earlier in this follow-up. The user accepted the corrected recording before raising the separate navbar corner-shape question. That question is under read-only How investigation.

## Navbar corner alignment

The user approved the How recommendation. The navbar now uses a local 20px radius and 7px CSS padding. Together with its 1px border, the desktop profile card has an even measured 8px inset on its left, top, and bottom. Its existing 12px corners match the outer curve. The two-row mobile navbar uses the same radius and padding. Other pill controls, Lavender theme values, profile motion, and avatar reflection behavior are unchanged.

Parent-observed T3 checks pass at 1440px, 320px, and 390px. The desktop radius and inset were read from computed styles and bounding boxes. Both narrow layouts keep all navigation links in the viewport with zero horizontal overflow. The parent inspected fresh dark-appearance screenshots at all three widths. Final production browser verification is pending.

PASS. The final navbar adjustment passes lint, production build, and all 26 browser tests. [Browser results](checks/navbar-browser.log) and [computed geometry](checks/navbar-layout.json) retain the checks. Fresh production captures cover [desktop](screenshots/navbar-1440-dark.png), [320px](screenshots/navbar-320-dark.png), and [390px](screenshots/navbar-390-dark.png). The parent inspected all captures. The independent comment review found no issues in the three changed CSS declarations. All owned preview servers and tabs were stopped.
