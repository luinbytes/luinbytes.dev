# Command Deck Full-Site Redesign Design

Date: 2026-07-03
Status: Approved direction, issue breakdown pending

## Summary

Redesign the luinbytes web presence as a motion-led **Command Deck** with a professional **Control Surface** interface, an **Obsidian Pink** visual system, and a **Proof Loop** content model.

The remembered sentence stays:

> I get annoyed, then I build the missing thing.

The redesign should make that sentence credible by showing the loop behind the work: problem, build, verify, ship. The final scope is a **Full Site Redesign**: homepage, case routes, `luinbytes.github.io` link dock, and shared global shell.

## Locked Decisions

- **Direction**: Command Deck
- **Variant**: Control Surface
- **Palette**: Obsidian Pink
- **Motion intensity**: Heavy Motion
- **Animation approach**: GSAP Hybrid
- **Homepage model**: Proof Loop
- **Hero promise**: Annoyance Promise
- **Case inspection shape**: Proof Rail
- **Command/search role**: Primary Surface
- **Mobile model**: Proof Tabs
- **Evidence depth**: Light Proof
- **Implementation scope**: Full Site Redesign

## Visual System

Use a dark cinematic base with pink as a precise recognition and focus signal. The site should feel sharper than the current soft pink/glass presentation while preserving enough pink to remain recognizably luinbytes.

Avoid pastel softness, fake terminal cosplay, and generic dashboard styling. The interface should feel like a polished command surface for inspecting shipped work.

## Motion System

Use the GSAP Hybrid approach from ADR `0001-use-gsap-for-motion-led-redesign.md`.

- GSAP is for choreographed hero, scroll, command-surface, and proof-rail timelines.
- CSS and Framer Motion stay responsible for ordinary hover, focus, press, and small state transitions.
- Routine UI interactions should remain fast.
- `prefers-reduced-motion` must provide a complete non-choreographed path.
- Avoid constant idle motion and toy-like animation.

## Homepage

The first viewport should combine the Annoyance Promise with a visible Primary Surface command/search panel.

The homepage should teach the Proof Loop:

1. Problem
2. Build
3. Verify
4. Ship

Selecting a build should reveal a Proof Rail with Light Proof: a concise outcome line and links, with at least one concrete proof signal per case.

## Case Routes

Case routes should be visually aligned with the new system and use the Proof Loop vocabulary. They do not need to become dense reports. They should feel like expanded versions of the homepage Proof Rail.

## Mobile

Mobile should not be a cramped desktop stack. It should use Proof Tabs as the primary exploration model, with command/search reduced to a compact launcher.

## Link Dock

`luinbytes.github.io` should remain a focused link dock, but it should adopt the Obsidian Pink identity so it feels like the same web presence rather than a separate personality.

## Non-Goals

- Do not turn the site into a literal terminal clone.
- Do not make GSAP the default animation layer for every interaction.
- Do not add canvas or a live visual field unless a later design pass proves it is meaningful.
- Do not expand Light Proof into dense case-study content on the homepage.
- Do not invent metrics, client claims, or proof points that are not backed by real work.

## Verification

The implementation should be verified with:

- Lint/type/build checks appropriate for this Next app.
- Browser QA on desktop and mobile widths.
- Reduced-motion QA.
- Keyboard navigation for command/search and Proof Rail/Tabs.
- Live deploy QA for both `luinbytes.dev` and `luinbytes.github.io` if both are changed.

## Goal Prompt

```text
Using docs/superpowers/specs/2026-07-03-command-deck-full-site-redesign-design.md as the source of truth, implement the approved full-site Command Deck redesign for luinbytes.dev and the luinbytes.github.io link dock. Preserve the locked glossary in CONTEXT.md and ADR 0001: Command Deck, Control Surface, Obsidian Pink, Heavy Motion, GSAP Hybrid, Proof Loop, Annoyance Promise, Proof Rail, Primary Surface, Proof Tabs, Light Proof, and Full Site Redesign. Inspect the existing Next/Tailwind/Framer architecture first, reuse existing homepage/case data where it fits, add GSAP only for choreographed timelines, keep ordinary UI interactions in CSS/Framer, support prefers-reduced-motion, then verify with lint/type/build plus Browser QA across desktop and mobile and live deployment checks.
```
