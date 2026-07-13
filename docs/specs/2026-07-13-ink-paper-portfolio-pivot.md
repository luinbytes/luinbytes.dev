# Ink-and-Paper Portfolio Pivot

## Problem Statement

The current portfolio visual system is a pink-noir cinematic direction. Lu has chosen a complete art-direction pivot based on the saved ink-and-paper pixel-print reference. The entire retained site needs one distinct visual language rather than a partial homepage skin or a theme toggle.

## Solution

Redesign the homepage and every retained case page as an editorial pixel-print portfolio. Use an ink-black and warm-paper palette, hard graphic frames, dithered print texture, compact mono labels, and alternating paper/ink sections. Preserve all current truthful project content, retained routes, accessibility, and the production-export phone-preview approval gate.

## User Stories

1. As a visitor, I immediately understand that Lu's portfolio has a deliberate, distinctive visual point of view.
2. As a hiring manager, I can scan the homepage and case pages comfortably despite the expressive display treatment.
3. As a mobile visitor, I can read all content and use all CTAs from first paint without waiting through a decorative sequence.
4. As a visitor moving between pages, I see one coherent system instead of a new homepage pasted onto unrelated case pages.
5. As Lu, I can review the new direction on a real phone preview before anything reaches the live site.
6. As a returning visitor, I see the canonical ink-and-paper direction without a legacy theme preference or switcher.
7. As a keyboard or reduced-motion user, I retain visible focus, semantic navigation, and an immediate static state.

## Implementation Decisions

- The saved reference image is the visual source of truth, used as direction rather than copied branding.
- The palette uses near-ink black, warm paper yellow, faded mustard, and a small dark-brown supporting tone. Pink bloom, glass effects, rounded dashboard surfaces, and soft gradient worlds are removed.
- Pixelify Sans is reserved for display posters and route titles. Space Grotesk remains the readable body face. Space Mono carries labels, coordinates, and utility metadata.
- The page system alternates paper and ink backgrounds where that improves hierarchy. It does not alternate mechanically or create unreadable low-contrast content.
- A single registration-plate motif, using crop marks, small square registration points, and restrained dither texture, is reused across home and case pages.
- Motion is print-like: small positional registration, pixel/dither resolution, and CTA underline settling. It never hides essential copy, blocks interaction, or relies on timed content visibility.
- The homepage, header, footer, command surface, and retained case-page template share the same tokens and utility language.
- The removed theme switcher does not return. Legacy stored theme state remains cleared.

## Testing Decisions

- Tests observe production-export behaviour and rendered pages, not CSS implementation details.
- Browser checks cover homepage, every retained route, navigation, keyboard focus, and reduced-motion mode.
- Full-page screenshots at desktop and 390px mobile are the visual acceptance seam. They must be compared against the saved reference for contrast, hard-frame hierarchy, print texture restraint, route consistency, and absence of the old pink-noir language.
- Mobile checks verify immediate readable headings, body copy, and CTAs, no horizontal overflow, and a subtle visible registration sequence.
- Existing route availability remains unchanged: retained routes render, deleted routes remain absent.
- Typecheck, lint, production export, route/link smoke, browser console checks, and screenshot review must pass before preview delivery.

## Out of Scope

- New project claims, invented evidence, or copywriting beyond presentation edits required by the design.
- Restoring deleted routes or the theme switcher.
- Publishing, pushing, or changing the live site before Lu approves a real Tailscale phone preview.

## Further Notes

Reference: `docs/design-references/ink-paper-pixel-print-reference.jpg`.

The new branch begins from the reviewed theme-and-route cleanup baseline. The prior pink-noir work is preserved only on the local archive branch and is not the implementation base.
