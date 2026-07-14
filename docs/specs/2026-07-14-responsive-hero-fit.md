# Responsive Hero Fit Correction

## Problem Statement

On shorter desktop viewports, the homepage poster hero extends below the initial screen. The headline, calls to action, and proof strip are not visible together, which breaks the intended one-screen cinematic introduction.

## Solution

Make the desktop poster hero spend the viewport height available beneath the fixed header. Scale its typography, padding, panel proportions, and LU signal artwork with viewport height as well as viewport width, so the full desktop hero composition remains visible without cropping. Preserve the readable vertical phone composition instead of forcing all mobile content into one compressed fold.

## User Stories

1. As a desktop visitor on a short laptop screen, I want the complete hero poster visible on first load, so that I can understand the page and act without immediately scrolling.
2. As a desktop visitor, I want the hero type and LU artwork to remain expressive while adapting to my screen height, so that the poster still feels intentional.
3. As a phone visitor, I want the hero to remain readable and naturally stacked, so that responsive fitting does not turn the content into tiny text.
4. As a motion-sensitive visitor, I want this layout correction to preserve the existing reduced-motion experience.

## Implementation Decisions

- Desktop layout at the established wide breakpoint uses the actual dynamic viewport budget beneath the fixed header.
- The poster frame, headline, spacing, CTA row, signal plate, and proof strip scale through constrained height-aware CSS values rather than clipping, transforms, or JavaScript viewport listeners.
- The existing pink print visual system, content, and interaction behavior remain unchanged.
- Narrow mobile layout retains its readable vertical composition and is not forced into a single viewport.

## Testing Decisions

- The public browser seam tests a 1280px by 720px desktop viewport and asserts the header, entire hero poster, primary action, secondary action, LU visual region, and proof strip are visible within the initial viewport.
- Existing larger desktop and narrow-phone checks continue to verify no horizontal overflow and readable layout.
- Visual acceptance includes a screenshot at the short desktop viewport and a phone screenshot.

## Out of Scope

- Copy changes, content removal, palette changes, navigation changes, or a new visual direction.
- Making the phone hero a forced one-screen poster.
- Push or deployment before Lu reviews the corrected preview.
