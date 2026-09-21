---
name: site-verification
description: Verify luinbytes.dev route, metadata, interaction, and responsive UI changes against its Next.js static export and Python Playwright suite.
---

# Site verification

- Run `npm run lint`, `npm run build`, and `npm run test:e2e` after the final implementation. The browser suite includes a production rebuild and owns its loopback dev server; do not run competing builds or servers against its `.next-e2e` directory.
- Use `requirements-test.txt` with an isolated Python environment when the host lacks Playwright. Put its `bin` first in `PATH` for `npm run test:e2e`. Install Chromium with that environment's Playwright.
- Run `npm run test:pond` when shared site behavior changes, and `npm run test:pip` for the Pip contact contract.
- Inspect fresh screenshots from `test-results/` at desktop and mobile sizes after the last visual edit. Check at least 320px, 390px, and 1440px widths, readable copy, focus, overflow, reduced motion, and content without JavaScript. Record PASS, REVISE, or BLOCK with the evidence and remaining manual acceptance.
- `/` and `/pip` are the only sitemap entries. Keep retired routes in `LEGACY_ROUTES` removed. Check exported `out/pip.html`, page-specific canonical/OG metadata, and the existing shared PNG.
- Pip's Telegram username is configured once in `lib/pip.ts`. Verify link/clipboard/QR target agreement, clipboard denial, QR load failure, and invalid configuration handling. Never send a message as a browser test. A browser link assertion does not prove a live bot reply.
- The test harness stops its server and removes `.next-e2e`. Stop any additional servers or browsers you start; retain only intentional evidence and remove temporary validation environments/scripts. Report exact working-tree state.
