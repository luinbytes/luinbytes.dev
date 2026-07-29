# Motion-Led Radical Redesign Plan

Date: 2026-07-02
Status: Discovery plan for user direction choice

## Starting Assumption

This redesign should be motion-led: the site should feel original because of how it behaves, transitions, and responds, not because it has decorative animation sprinkled over a static portfolio.

Keep the professional signal intact. The motion should clarify the work, make the site memorable, and make the portfolio feel like a living technical instrument.

## Live Inspection Summary

### https://luinbytes.dev

- Strong current content spine: hero, active case, problem selector, origin, status, contact.
- Current first impression is polished but soft: pink grid, rounded instrument card, gentle glassy panels.
- The headline is memorable, but the visual system now reads more cute/pastel than sharp/original.
- The active-case lens is the most promising interaction, but it is still mostly a card with orbital decoration.
- Mobile works structurally, but the page becomes a long stacked version of the desktop rather than a distinct motion experience.
- Console inspection showed only Electron/in-app-browser warnings, not site runtime errors.
- No images are used, so the entire identity depends on layout, typography, color, and motion.

### https://luinbytes.github.io

- Separate dark link hub with a much stronger immediate identity.
- The giant `luinbytes` wordmark, dark backdrop, numbered dock cards, and compact social/contact purpose feel more memorable than the main site.
- It is simple, focused, and professional enough, but not deep enough to serve as the main portfolio.
- The best move is to absorb its darker, heavier, more cinematic confidence into `luinbytes.dev`, while keeping the GitHub Pages page as a clean link dock or redirect-adjacent satellite.

## Existing Repo Constraints

- The homepage entrypoint is `app/page.tsx` -> `components/sections/anomaly-home.tsx`.
- Homepage content lives mainly in `lib/homepage.ts`.
- Styling and motion surface lives in `app/globals.css`, existing components, and Framer Motion.
- `framer-motion` is already installed.
- Do not rewrite the app stack just to get motion. Next, React, Tailwind, and Framer Motion are already enough for most concepts.
- Add GSAP only if the chosen direction needs scroll-scrubbed choreography, pinned timelines, or deterministic multi-section animation sequencing.
- Add Three.js or canvas only if the chosen direction genuinely needs an interactive visual field, not just because it would look expensive.

## Animation Review

| Before | After |
| --- | --- |
| Main site uses a constant soft instrument-card mood | Give each major section a distinct motion state in one coherent system |
| Active case gently floats forever | Make motion mostly user/scroll-driven, with idle motion only where it adds life |
| Pink glass aesthetic carries most of the identity | Let spatial transitions, typography, dark contrast, and interactive systems carry the identity |
| Mobile stacks desktop components | Design mobile as a compact tactile sequence with intentional reveal timing |
| Existing Framer Motion use is enough for light motion | Use Framer Motion plus CSS for most options; add GSAP only for cinematic scroll timelines |
| Reduced motion exists and must stay | Every new motion path needs a reduced-motion equivalent from the start |

## Five Design Directions

### 1. Signal Observatory

A dark, cinematic portfolio built around a living signal map. Projects appear as signals orbiting or clustering around problem domains. Selecting a signal focuses the viewport, reveals the case, and draws connective lines to tech, outcome, and source.

- Look: deep charcoal/black, cream text, one hot pink or electric cyan accent, thin grid/radar geometry.
- Motion: scroll-driven zooms, signal acquisition, focus rings, line traces, case panels sliding from spatial positions.
- Framework: Next/Tailwind/Framer for baseline; GSAP recommended if we want pinned scroll sections and timeline precision.
- Risk: can become decorative if the signal map does not clearly map to real projects.
- Best for: original, technical, memorable, still professional.

### 2. Command Deck

Turn the site into a professional operator console. The homepage is a full-screen command surface: type/search/filter, inspect projects, switch domains, and launch cases from a fast keyboard-first interface.

- Look: darker version of the GitHub link dock meets Raycast/terminal palette; compact, sharp, tactile.
- Motion: command palette transitions, instant result morphing, selected-row crossfade, active pane slides under 200ms.
- Framework: current stack is enough; no new animation framework needed.
- Risk: less "wow" if we avoid a larger visual centerpiece.
- Best for: professional, fast, developer-power-user energy.

### 3. Failure Atlas

Keep the current "problem selector" idea but make it radical: the whole page is an atlas of failure surfaces. Linux, Android, reverse engineering, automation, and desktop utilities become regions. The user pans or scrolls through them like a technical map.

- Look: field manual, topographic map, dark ink, sharp labels, measured accent colors per surface.
- Motion: map drift, route drawing, region focus, selected problem expands into a case sheet.
- Framework: Framer Motion is enough for region focus; GSAP helps if the atlas is pinned and scroll-choreographed.
- Risk: map metaphors can get heavy if every item needs bespoke positioning.
- Best for: preserving current content while making the interaction feel new.

### 4. Build Autopsy

Make each project feel like a teardown. The homepage opens with a broken workflow, then animates through diagnosis -> build -> proof. Cases are presented as layers, logs, diffs, screenshots, and outcomes.

- Look: forensic engineering notebook, dark paper, bright annotations, code/log fragments, precise dividers.
- Motion: layer peels, evidence cards snapping into place, before/after transitions, proof markers.
- Framework: current stack is enough; CSS/Framer handles it.
- Risk: needs excellent copy discipline or it can feel text-heavy.
- Best for: strong professional trust and "I solve real ugly problems" positioning.

### 5. Living Link Dock

Merge the GitHub Pages identity into the main site: giant wordmark, numbered dock, and link-card confidence become the portfolio shell. Each dock item expands into a project lane or case overlay.

- Look: dark, glossy, high-contrast, big typography, numbered objects, minimal copy.
- Motion: dock cards expand, wordmark scales out of the way, project lanes unfold below.
- Framework: Framer Motion is enough.
- Risk: may feel more like a personal link page than a full engineering portfolio unless the project expansion is substantial.
- Best for: the fastest path to something original without adding a new dependency.

## Recommendation

Choose either:

1. **Signal Observatory** if the goal is the boldest, most motion-led redesign.
2. **Failure Atlas** if the goal is radical but still close to the current content architecture.
3. **Living Link Dock** if the goal is to preserve the strongest existing visual cue from `luinbytes.github.io` and ship faster.

My taste pick: **Signal Observatory** with a restrained Command Deck underlayer. That gives the site a unique visual memory while keeping navigation, search, and project inspection fast.

## Motion System

- Use CSS transitions for hover, focus, and button press feedback.
- Use Framer Motion for state changes, active-case morphs, selected project transitions, and route/page reveals.
- Use GSAP only if the selected concept includes pinned scroll scenes, scrubbed timelines, or precise multi-section choreography.
- Avoid animating layout-heavy properties. Prefer `transform` and `opacity`.
- Keep normal UI transitions under 300ms.
- Use `ease-out` for entering/exiting elements.
- Use `ease-in-out` for visible objects moving between states.
- Avoid bounce except for rare tactile interactions.
- Disable or simplify all motion through `prefers-reduced-motion`.

## Proposed Site Structure

1. Hero motion scene
   - Brand/wordmark or core headline appears as part of the motion system.
   - Primary action: inspect work.
   - Secondary action: command/search.

2. Interactive work surface
   - The chosen core concept lives here: signal map, command deck, atlas, autopsy, or dock.
   - Selecting a project changes the visual state and exposes summary, outcome, tech, case, and source.

3. Case proof section
   - Stronger evidence presentation for selected builds.
   - Keep this curated, not a repository dump.

4. Origin/status strip
   - Short, sharp, not a long timeline.

5. Contact
   - Minimal and confident.

## Implementation Plan After Direction Choice

1. Freeze the chosen direction in a design spec.
2. Build one static visual prototype of the first viewport.
3. Add the motion prototype only after the static composition is strong.
4. Port existing homepage content from `lib/homepage.ts`.
5. Implement reduced-motion behavior alongside every motion path.
6. Test desktop, mobile, keyboard flow, reduced motion, console logs, and deployed live site.

## Questions For Direction Choice

1. Which direction should be the base: Signal Observatory, Command Deck, Failure Atlas, Build Autopsy, or Living Link Dock?
2. Should the palette move dark/cinematic, stay pink but sharper, or become dark with pink as only an accent?
3. How much motion do you want?
   - Medium: state transitions and polished scroll reveals.
   - Heavy: pinned scroll scenes and choreographed section transitions.
   - Very heavy: interactive visual field, possibly GSAP and/or canvas.
4. Should `luinbytes.github.io` remain a separate link dock, redirect to `luinbytes.dev`, or become the visual seed for the main site?
5. Should the site feel more like a portfolio, a technical product, or an interactive artifact?

## Goal Prompt

Use this with `/goal` after choosing a direction:

```text
Using docs/superpowers/plans/2026-07-02-motion-led-radical-redesign.md as the source plan, design and implement the selected motion-led redesign direction for luinbytes.dev. Inspect the existing Next/Tailwind/Framer code first, reuse the existing homepage data and components where they fit, avoid unnecessary new dependencies, add GSAP or canvas only if the chosen direction truly requires it, preserve accessibility and prefers-reduced-motion behavior, then verify with lint/build plus live browser QA across desktop and mobile.
```
