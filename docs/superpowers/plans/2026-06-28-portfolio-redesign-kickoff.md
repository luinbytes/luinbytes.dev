# Portfolio Redesign Kickoff Plan

## Goal
Refresh `luinbytes.dev` into a sharper portfolio for hands-on engineering help: developer tools, automation workflows, Android apps, desktop utilities, and AI-assisted systems that turn messy technical work into shipped, verified outcomes.

## Current Repo Surface
- Homepage entry: `app/page.tsx` -> `components/sections/anomaly-home.tsx`
- Content source: `lib/homepage.ts`
- Design system/theme surface: `app/globals.css`, `components/theme-switcher.tsx`, `components/animations/*`
- Existing direction note: `docs/superpowers/specs/2026-05-11-field-atlas-redesign-design.md`

## Proposed Small Team Split
1. Design executor: implement the approved visual refresh on the homepage using the existing Next/Tailwind/framer-motion setup.
2. Content pass: tighten homepage copy around reliable AI execution, verified shipping, and technical founder/power-user outcomes without inventing new facts.
3. QA/release pass: run lint/build, check responsive rendering, reduced motion, and obvious accessibility regressions.

## Default Direction
Use the existing field-atlas/anomaly work as the base instead of starting over. Keep the real project inventory and current interaction model, but make the first viewport communicate: "I turn technical intent into verified shipped work."

## Acceptance Criteria For Implementation Tasks
- Homepage has a coherent redesigned first viewport and selected-work flow.
- Copy reflects luinbytes.dev company context directly: developer tools, automation, Android, desktop utilities, AI-assisted execution, verified outcomes.
- No fake metrics, client history, dates, or claims.
- Existing routes and project links remain intact.
- `npm run lint` and `npm run build` pass, or failures are documented with exact causes.
- A short visual QA note or screenshots are attached before final review.

## Approval Request
Approve this kickoff plan and create the implementation child issues. Reject or comment with changes if a different visual direction or scope is needed.
