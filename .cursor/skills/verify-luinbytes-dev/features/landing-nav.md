# Landing page and navigation

The home page introduces Lu, offers three header anchors (Work, More, Contact) that scroll to sections and mark the current one, and lists four featured projects.

## Sub-features

- `hero` shows `Hi, I’m Lu.` as the h1 and `I make stubborn software behave.` as the statement.
- `nav-anchors` moves to `#work`, `#about`, `#contact` and sets `aria-current="location"` on the matching link.
- `hero-cta` links `Things I’ve made` (to `#work`) and `Say hello` (mailto).
- `project-cards` shows four cards, each with a heading and an external `View project <name>` link.

## How to get to it (user POV)

- Open `/`.
- Click `Work`, `More`, or `Contact` in the `Portfolio navigation` header.
- Click `Things I’ve made` in the hero.

## Driving it with drive.sh (Playwright)

Preconditions: doctor passes; fresh context at 1440x900.

- **Load.** `bin/drive.sh landing-nav`. `/?pond-seed=verify-skill` loads, h1 text is `Hi, I’m Lu.`, the statement heading is visible. Screenshot `01-hero-initial.png`.
- **Nav.** For each of `Work`, `More`, `Contact`, click the link in the `Portfolio navigation` header. `location.hash` becomes `#work` / `#about` / `#contact` and that link has `aria-current="location"`. Screenshots `02`-`04`.
- **Cards.** Click hero `Things I’ve made`. `#work article` count is 4; headings `HomeBot`, `Rakazo`, `linux-sonar`, `ConnectorMap` each have a `View project <name>` link whose `href` starts with `https://`. Screenshot `05-work-cards.png`, ARIA `landing-work.aria.txt`.

## Gotchas

- Card headings come from `lib/portfolio-content.ts` (`name`), not the repo names: `Rakazo`, not `rakazo-android`. Update `drive.py` when that file changes.
- `aria-current` is set by a scroll listener; assert it after the hash change, and expect `Contact` to win at the very bottom of the page.
- Section headings use curly quotes (`“Mostly works” is still broken.`); typing straight quotes will not match.
