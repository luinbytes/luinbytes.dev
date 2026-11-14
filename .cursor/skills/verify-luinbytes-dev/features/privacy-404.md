# Privacy page and pond 404

`/privacy` is the short personal-use privacy policy, reached from the footer. Any retired or unknown URL renders the pond-themed 404 with a way back.

## Sub-features

- `privacy-page` footer `Privacy` link opens `/privacy` with h1 `Privacy Policy`.
- `privacy-back` `Back to luinbytes.dev` returns to `/`.
- `not-found` a retired route such as `/pip` returns HTTP 404 and shows `Nothing surfaced here.`.
- `not-found-back` `Return to the pond` returns to `/`.

## How to get to it (user POV)

- On `/`, click `Privacy` in the footer. Or type `/privacy` directly.
- Type a removed URL (`/pip`, `/meteor`, `/linux-sonar`, ...) or any unknown path.

## Driving it with drive.sh (Playwright)

Preconditions: doctor passes (it already checks `GET /privacy` and unknown-route 404 over HTTP).

- **Privacy.** `bin/drive.sh privacy-404`. Click footer `Privacy` -> URL is `<BASE>/privacy`, h1 `Privacy Policy`. Screenshot `01-privacy-page.png`, ARIA `privacy.aria.txt`.
- **Back.** Click `Back to luinbytes.dev` -> URL `<BASE>/`.
- **404.** `goto(<BASE>/pip)`: response status 404, heading `Nothing surfaced here.` visible. Screenshot `02-not-found-page.png`, ARIA `not-found.aria.txt`.
- **Home.** Click `Return to the pond` -> `/`, h1 `Hi, I’m Lu.`. Screenshot `03-back-home.png`.

## Gotchas

- The 404 navigation logs a browser console error (`Failed to load resource ... 404`). The journey filters exactly that one message; any other console or page error fails the run.
- The preview server maps unknown paths to `404.html` with status 404; `/404` and `/404.html` also return 404. Static hosting on GitHub Pages behaves similarly but is not exercised here.
- The footer is far down the page; use role+name `Privacy` (exact) to avoid matching the privacy text elsewhere.
