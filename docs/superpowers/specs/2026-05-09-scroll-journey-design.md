# Scroll Journey Design

Date: 2026-05-09
Status: Approved direction

## Summary

Add a scroll-driven journey layer to the redesigned homepage without changing the site's core identity or inventing new personal history.

The homepage should feel like a guided walk through Lu's developer reflex:

> Notice the annoying thing, understand the system, build the missing thing, ship the useful version.

The implementation should keep the current brutalist problem-index redesign intact and add interactive motion, chapter state, and scroll-linked context around it.

## Truth And Content Constraints

Do not add new biographical claims, dates, origin details, employers, education, project history, or personal milestones unless they already exist in the current site data/copy or Lu provides them directly.

Allowed narrative material for this pass:

- Existing hero thesis: "I get annoyed, then I build the missing thing."
- Existing project/problem data in `lib/homepage.ts`.
- Existing origin copy about PS3, jailbreaks, modding, firmware, and taking systems apart.
- Existing current-status/workbench fields.
- Existing contact framing around weird workflows, broken tools, and stuck ideas.

If the scroll experience needs a connective line, it should be abstract and process-oriented, not factual biography. Good examples:

- "Notice the friction."
- "Map the system."
- "Build the missing piece."
- "Ship the useful version."

Avoid invented specifics such as exact years, childhood details, companies, school history, first project names, or claims about impact that are not already present.

## Goals

- Make the site feel interactive as the visitor scrolls.
- Turn the homepage into a coherent journey through a developer life and working style.
- Preserve the recent redesign's stark black, border-driven, industrial personality.
- Keep the existing problem index useful and keyboard accessible.
- Make scroll interaction feel purposeful rather than decorative.
- Respect `prefers-reduced-motion`.

## Non-Goals

- Do not redesign the visual identity.
- Do not turn the homepage into a cinematic portfolio or generic timeline.
- Do not add fake metrics, fake terminal output, fake commit logs, or fabricated personal details.
- Do not remove the existing click and keyboard behavior from the problem index.
- Do not introduce a new animation library; use existing `framer-motion`.

## Recommended Direction

Use a **Problem-Solving Loop merged with an active Workbench layer**.

The visitor should feel the page moving through five chapters:

1. **Thesis**: the hero states the core pattern.
2. **Friction**: the problem index introduces concrete problems Lu refused to accept.
3. **Builds**: selected projects become shipped artifacts and proof of range.
4. **Origin**: the PS3/modding story explains where the instinct came from.
5. **Now**: the current workbench and contact section bring the journey back to the present.

This is more suitable than a pure chronological timeline because the current site already leads with problem-solving. It is also safer than a "live terminal" concept because fake terminal content could imply false work history.

The original take: make the site feel like a **workbench flight recorder**. As the visitor scrolls, the page does not pretend to run commands or expose fake logs. Instead, it shows the current chapter, active problem, project surface, stack, and outcome as live instrumentation derived from the real homepage data.

In plain terms: the story scrolls like a journey, but the interface reads like Lu's working desk.

## Homepage Structure

### 1. Hero

Keep the existing hero headline, support copy, CTAs, and workbench panel.

Add a subtle scroll cue that frames the page as a journey rather than a static stack. The cue can be a small monospace line near the bottom of the hero:

> scroll the build loop

This should not look like an extra hero eyebrow or marketing badge. It should behave like quiet interface chrome.

### 2. Journey Rail

Add a client component that tracks which homepage section is currently active.

Desktop behavior:

- Render a sticky rail on the right side of the viewport.
- Show five compact chapter labels: Thesis, Friction, Builds, Origin, Now.
- Show a segmented progress line that fills as the visitor scrolls.
- Include a small workbench readout for the active chapter.
- Highlight the active chapter based on visible section intersection.
- Allow clicking each chapter to scroll to the matching section.

Mobile behavior:

- Do not use a sticky side rail.
- Render compact chapter labels inside each section instead.
- Keep all content full-width and readable.

Accessibility:

- The rail is navigation, not required content.
- It should have an accessible label such as "Homepage journey".
- Respect reduced motion by disabling animated transitions and smooth scroll.

### 2a. Workbench Flight Recorder

The journey rail should double as a compact workbench panel.

For each active chapter, show real metadata:

- `mode`: one of `thesis`, `friction`, `build`, `origin`, or `now`.
- `surface`: derived from known project categories where possible, such as Linux, Android, reverse engineering, automation, CLI, or systems.
- `signal`: a short process-oriented line, not a biographical claim.
- `active`: the current project or section name when available.

Example readout for the problem index:

```text
mode    friction
surface linux/audio
active  linux-sonar
signal  problem -> build -> outcome
```

Example readout for origin:

```text
mode    origin
surface systems curiosity
active  PS3 / modding roots
signal  take apart -> understand -> rebuild
```

These readouts should feel like instrumentation, not roleplay. They should use existing data from `lib/homepage.ts` or copy already present in the site.

### 3. Problem Index Scroll Activation

Keep existing manual selection, arrow-key navigation, and tab semantics.

Add optional scroll-linked selection:

- As each problem row enters the center of the viewport, it can become the selected row.
- When the selected problem changes, the workbench rail readout updates with the selected build's real name, first two filters, and known outcome mode.
- Manual click/keyboard selection should still work.
- If scroll activation creates jumpy behavior in testing, disable it and keep scroll reveal only.

The problem index should continue to feel like a useful control, not a passive animation.

### 4. Section Reveals

Wrap major sections in a reusable scroll-reveal component.

Behavior:

- Content fades in and moves a short distance as it enters view.
- Motion is restrained and quick.
- Reveals should happen once per section.
- Reduced motion should show content immediately.

Use the existing `framer-motion` dependency and follow the style of `components/animations/fade-in.tsx`, but tune the motion for the sharper redesign.

### 5. Build Artifacts

Make selected build rows feel like shipped artifacts without changing their facts.

Possible treatment:

- Add a small workbench-style process label per row derived from existing data: `problem`, `stack`, `outcome`.
- Stagger row reveals as the section enters view.
- Keep all project names, summaries, tags, links, and outcomes from `lib/homepage.ts`.

Do not add fake dates, stars, user counts, downloads, or impact claims.

### 6. Origin And Status

Keep the existing origin copy.

Make it feel like a backstory chapter by:

- Revealing origin paragraphs in sequence.
- Pairing the section with a chapter label such as "Origin".
- Keeping the current status strip as the present-tense continuation.

The status strip should remain factual and driven by existing `workbenchItems`.

### 7. Contact

The contact section should feel like the journey's handoff:

- Keep existing contact copy.
- Add a final chapter label such as "Now".
- Keep the direct links unchanged.

## Component Plan

Expected implementation areas:

- `app/page.tsx`: wrap the homepage in the scroll journey provider/shell.
- `components/sections/hero.tsx`: add the subtle journey cue.
- `components/sections/problem-index.tsx`: add scroll reveal and optionally row activation.
- `components/sections/selected-builds.tsx`: add artifact-style reveal treatment.
- `components/sections/origin-status.tsx`: add chapter/reveal treatment.
- `components/sections/contact.tsx`: add final chapter/reveal treatment.
- `components/animations/scroll-reveal.tsx`: reusable reveal wrapper.
- `components/sections/scroll-journey.tsx`: journey rail and active-section tracking.
- `components/sections/workbench-readout.tsx`: optional small presentational component for active chapter metadata if `scroll-journey.tsx` becomes too large.
- `lib/homepage.ts`: add chapter metadata only if needed.

## Motion Rules

- Use motion to clarify where the visitor is in the journey.
- Keep distances small, around 12-24px.
- Keep durations short, around 180-320ms.
- Avoid looping animation.
- Avoid fake terminal typing unless the copy is already visible elsewhere on the site.
- Use `prefers-reduced-motion` to disable transforms and smooth behavior.

## Testing And Verification

Implementation should be verified with:

- `npm run lint`
- `npm run build`
- Desktop browser inspection of the homepage scroll journey.
- Mobile-width browser inspection of the homepage scroll journey.
- Keyboard navigation through the problem index after motion changes.
- Reduced-motion check, at least through emulated media or code review of the motion guard.

Browser testing must respect Lu's environment constraint: if a live browser is opened, move it silently to workspace 8 and do not use real mouse or keyboard control.

## Acceptance Criteria

- The homepage feels like a scroll journey rather than a static section stack.
- The scroll journey and workbench ideas are merged through a live-feeling but factual readout.
- The story is anchored in known site facts and process language only.
- The current redesign remains recognizable.
- The problem index remains interactive by click and keyboard.
- Desktop has a visible journey/progress affordance.
- Mobile has readable chapter context without a sticky rail.
- Reduced-motion users get immediate, stable content.
- Lint and build pass, or any unrelated pre-existing failure is identified clearly.
