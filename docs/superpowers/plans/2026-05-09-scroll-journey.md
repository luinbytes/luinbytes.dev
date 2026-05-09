# Scroll Journey Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a scroll-driven homepage journey that merges the existing problem-solving story with a factual workbench flight-recorder layer.

**Architecture:** Use the existing Next.js homepage sections and `framer-motion` dependency. Add a small journey data model, a scroll-aware client rail, and a reusable reveal wrapper; keep content sourced from `lib/homepage.ts` and current page copy.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind CSS v4 tokens, framer-motion, lucide-react.

---

## File Map

- Modify `lib/homepage.ts`: add factual journey chapter metadata derived from existing homepage sections.
- Create `components/animations/scroll-reveal.tsx`: reduced-motion-aware reveal wrapper.
- Create `components/sections/scroll-journey.tsx`: scroll observer, desktop rail, progress, workbench readout.
- Modify `app/page.tsx`: wrap homepage sections with `ScrollJourney`.
- Modify `components/sections/hero.tsx`: add quiet scroll cue and journey section marker.
- Modify `components/sections/problem-index.tsx`: add journey marker, reveal treatment, selected-problem event, optional row visibility activation.
- Modify `components/sections/selected-builds.tsx`: add journey marker and artifact reveal treatment.
- Modify `components/sections/origin-status.tsx`: add journey markers and paragraph/status reveals.
- Modify `components/sections/contact.tsx`: add journey marker and reveal treatment.

## Task 1: Journey Data

**Files:**
- Modify: `lib/homepage.ts`

- [ ] **Step 1: Add journey chapter types and metadata**

Append this data after `workbenchItems` so the rail has a single source of truth:

```ts
export type JourneyChapter = {
  id: "home" | "builds" | "selected-builds" | "about" | "status" | "contact";
  label: string;
  mode: "thesis" | "friction" | "build" | "origin" | "now";
  surface: string;
  active: string;
  signal: string;
};

export const journeyChapters: JourneyChapter[] = [
  {
    id: "home",
    label: "Thesis",
    mode: "thesis",
    surface: "developer reflex",
    active: "missing thing",
    signal: "notice -> understand -> build",
  },
  {
    id: "builds",
    label: "Friction",
    mode: "friction",
    surface: "problems",
    active: "problem index",
    signal: "problem -> build -> outcome",
  },
  {
    id: "selected-builds",
    label: "Builds",
    mode: "build",
    surface: "shipped artifacts",
    active: "selected builds",
    signal: "range -> stack -> result",
  },
  {
    id: "about",
    label: "Origin",
    mode: "origin",
    surface: "systems curiosity",
    active: "PS3 / modding roots",
    signal: "take apart -> understand -> rebuild",
  },
  {
    id: "status",
    label: "Now",
    mode: "now",
    surface: "workbench",
    active: "current status",
    signal: "building -> shipping -> learning",
  },
  {
    id: "contact",
    label: "Contact",
    mode: "now",
    surface: "handoff",
    active: "weird workflows",
    signal: "send -> inspect -> build",
  },
];
```

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: passes or reports issues unrelated to this data change.

## Task 2: Scroll Reveal Wrapper

**Files:**
- Create: `components/animations/scroll-reveal.tsx`

- [ ] **Step 1: Create reduced-motion-aware reveal component**

Create:

```tsx
"use client";

import { motion, useReducedMotion, type HTMLMotionProps } from "framer-motion";
import { type ReactNode } from "react";

type ScrollRevealProps = HTMLMotionProps<"div"> & {
  children: ReactNode;
  delay?: number;
  distance?: number;
};

export function ScrollReveal({
  children,
  className,
  delay = 0,
  distance = 18,
  ...props
}: ScrollRevealProps) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return (
      <div className={className}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: distance }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12% 0px -10% 0px" }}
      transition={{ duration: 0.28, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 2: Run lint**

Run:

```bash
npm run lint
```

Expected: no new lint errors.

## Task 3: Scroll Journey Rail

**Files:**
- Create: `components/sections/scroll-journey.tsx`
- Read: `lib/homepage.ts`

- [ ] **Step 1: Create scroll-aware journey wrapper**

Implement `ScrollJourney` as a client component that:

- Accepts `children`.
- Observes elements with `[data-journey-section]`.
- Tracks active chapter id.
- Tracks page scroll progress.
- Listens for `lu:journey-problem-change` events from the problem index.
- Renders children plus a desktop-only fixed rail.
- Uses existing `journeyChapters` and `problemBuilds` data.

- [ ] **Step 2: Add desktop rail UI**

The rail should:

- Be hidden below `xl`.
- Sit fixed on the right side, vertically centered.
- Use existing `nd-*` colors and square borders.
- Show chapter buttons, active state, progress bar, and workbench readout.
- Use `scrollIntoView({ behavior: "smooth" })` unless reduced motion is active.

- [ ] **Step 3: Run lint**

Run:

```bash
npm run lint
```

Expected: no new lint errors.

## Task 4: Wire Homepage Sections

**Files:**
- Modify: `app/page.tsx`
- Modify: `components/sections/hero.tsx`
- Modify: `components/sections/problem-index.tsx`
- Modify: `components/sections/selected-builds.tsx`
- Modify: `components/sections/origin-status.tsx`
- Modify: `components/sections/contact.tsx`

- [ ] **Step 1: Wrap homepage**

In `app/page.tsx`, import `ScrollJourney` and wrap the existing section stack:

```tsx
<ScrollJourney>
  <Hero />
  <ProblemIndex />
  <SelectedBuilds />
  <OriginStatus />
  <Contact />
</ScrollJourney>
```

- [ ] **Step 2: Add journey markers**

Add `data-journey-section` to these section roots:

- `Hero`: `data-journey-section="home"`
- `ProblemIndex`: `data-journey-section="builds"`
- `SelectedBuilds`: `data-journey-section="selected-builds"`
- Origin section: `data-journey-section="about"`
- Status section: `data-journey-section="status"`
- Contact section: `data-journey-section="contact"`

- [ ] **Step 3: Add subtle hero cue**

Add a quiet link/cue near the hero bottom that says `scroll the build loop` and points to `#builds`.

- [ ] **Step 4: Add reveal wrappers**

Use `ScrollReveal` around section headings, detail panes, selected build rows, origin paragraphs, status cells, and contact links. Keep the existing layout and copy intact.

- [ ] **Step 5: Dispatch selected problem updates**

In `ProblemIndex`, dispatch this event whenever `selected` changes:

```ts
window.dispatchEvent(
  new CustomEvent("lu:journey-problem-change", { detail: selected.id })
);
```

- [ ] **Step 6: Optionally add row visibility activation**

If it is stable, observe problem row buttons and call `setSelectedId(item.id)` when the row is near the viewport center. If it feels jumpy during QA, remove the observer and keep only the event dispatch plus reveal motion.

- [ ] **Step 7: Run lint**

Run:

```bash
npm run lint
```

Expected: no new lint errors.

## Task 5: Build And Browser QA

**Files:**
- Verify only unless QA reveals implementation bugs.

- [ ] **Step 1: Run build**

Run:

```bash
npm run build
```

Expected: successful Next.js build. If `public/sitemap.xml` changes only because the sitemap generator rewrites timestamps, restore that file before committing.

- [ ] **Step 2: Start local server**

Run:

```bash
npm run dev
```

Expected: local Next server URL, usually `http://localhost:3000`.

- [ ] **Step 3: Live QA without taking over the active workspace**

If a browser is opened, move it silently to workspace 8 before inspection. Do not use the user's real mouse or keyboard. Use automation/devtools-style interactions only.

Verify:

- Desktop: rail appears, active chapter changes while scrolling, workbench readout updates.
- Mobile width: no fixed rail, content remains readable.
- Problem index: click and keyboard selection still work.
- Reduced motion: content remains visible and stable.

- [ ] **Step 4: Commit implementation**

Commit only the intended files:

```bash
git add app/page.tsx components/animations/scroll-reveal.tsx components/sections/scroll-journey.tsx components/sections/hero.tsx components/sections/problem-index.tsx components/sections/selected-builds.tsx components/sections/origin-status.tsx components/sections/contact.tsx lib/homepage.ts
git commit -m "feat: add scroll journey workbench"
```

Do not include unrelated untracked files such as `AGENTS.md`.
