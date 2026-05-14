# Field Atlas Redesign Design

Date: 2026-05-11
Status: Implemented on `surprise-field-atlas-redesign`

## Summary

This branch replaces the previous black industrial portfolio theme with a warm, editorial field-atlas identity.

The new direction keeps the factual homepage content and interactions, but changes the visual brand language completely:

- Warm parchment and paper surfaces instead of OLED black.
- Deep ink text instead of white-on-black.
- Tomato red, blueprint cyan, brass, and olive accents instead of neon pink.
- Atlas/grid marks, field-note labels, artifact rows, and paper shadows.
- More expressive, professional motion: animated orbit field, scanline hover passes, scroll-reveal blur/scale, floating map marks, and a sticky field-route readout.

Reference concept: `docs/superpowers/specs/assets/field-atlas-redesign-concept.png`

## Motion Direction

The user specifically prefers professional-looking, eye-catching animations. The implementation uses motion to make the page feel alive without faking terminal output, metrics, or biography.

Key motion surfaces:

- Hero atlas field with slow orbital motion and drifting rings.
- Scroll reveal with blur, scale, and position easing.
- Scanline hover/focus sweep on primary controls, problem rows, artifact rows, and contact links.
- Floating selected-builds map mark.
- Sticky journey rail progress and active chapter states.

All motion remains guarded by `prefers-reduced-motion`.

## Content Constraints

The redesign does not invent new personal facts, dates, companies, metrics, or history. It reuses the existing homepage data and copy.
