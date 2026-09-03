# Pond-themed not found page

## Sub-features

Unknown-route response, retired-route handling, pond background, and return navigation.

## How to get to it (user POV)

Open `/definitely-not-a-route` or one of the retired paths listed in `tests/browser/browser_test.py`.

## Driving it with Playwright and T3 preview

Run `npm run test:e2e`. For a focused check, open an unknown route, confirm the pond-themed message appears, then activate `Back to the pond` and verify the browser returns to `/`.

## Gotchas

The static export owns one public route. Retired paths must resolve through the shared 404 instead of exporting stale route HTML.
