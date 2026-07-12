# Animation Motion Polish Tickets

## 01 — Shared motion contract
**Blocked by:** None
**What it delivers:** The site has explicit shared easing and duration tokens plus a small helper/class seam for visual transitions, with reduced-motion behavior preserved.

## 02 — Scoped theme and global transitions
**Blocked by:** 01
**What it delivers:** Theme switching and the shared transition convention animate only intentional visual properties, without broad `transition: all` layout/paint surprises.

## 03 — Case switch choreography
**Blocked by:** 01
**What it delivers:** Selecting a portfolio case produces a responsive, interruptible content transition at the existing case selector boundary.

## 04 — Search and filter result motion
**Blocked by:** 01
**What it delivers:** Project search and category filtering use a restrained result transition that remains stable during rapid typing and respects reduced motion.

## 05 — Integrated verification
**Blocked by:** 02, 03, 04
**What it delivers:** Full tests/typecheck/build pass and a manual browser feel-check confirms theme, case, search/filter, keyboard, and reduced-motion behavior.
