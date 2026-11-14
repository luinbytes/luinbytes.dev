# Contact: copy email and book a call

The Contact section shows Lu's email as a `mailto:` link with a `Copy` button that puts the address on the clipboard, plus a `Book a call` link to Cal.com.

## Sub-features

- `contact-mailto` the address is a `mailto:` link in `#contact`.
- `contact-copy` `Copy email address` copies it, flips to `Copied`, announces `Email address copied.`, and reverts after about 2.4 s.
- `contact-book` `Book a call` points at an https calendar page.

## How to get to it (user POV)

- Click `Contact` in the header (or scroll to the bottom), then press `Copy` beside the email.
- The footer `Email` link is a second mailto entry point (asserted by href in the ARIA snapshot only).

## Driving it with drive.sh (Playwright)

Preconditions: doctor passes; the context is granted `clipboard-read` and `clipboard-write` for `BASE_URL` (the journey does this).

- **Before.** `bin/drive.sh contact-email`. In `#contact`, the mailto link yields the address; button `Copy email address` reads `Copy`. Screenshot `01-contact-before-copy.png`.
- **Copy.** Click the button. It reads `Copied`; the `status` region reads `Email address copied.`; `navigator.clipboard.readText()` equals the mailto address. Screenshot `02-contact-after-copy.png`.
- **Revert.** Within 6 s the button text returns to `Copy`.
- **Book.** `Book a call` href starts with `https://` (not clicked). ARIA `contact.aria.txt`.

## Gotchas

- Without clipboard permission the site shows the fallback status `Couldn’t copy automatically...`; that is a precondition failure of the harness, not a site bug.
- The email is read from the page, never hard-coded, so the journey survives an address change.
- Never click `mailto:` or Cal.com links: they leave the site.
