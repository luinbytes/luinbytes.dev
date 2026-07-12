# Animation Motion Polish

## Problem Statement

luinbytes.dev has a strong restrained motion language, but several high-frequency interactions rely on broad `transition: all` behavior or direct state replacement. Theme changes, case selection, and project filtering can therefore feel less intentional than the site's visual language suggests.

## Solution

Introduce a small shared motion token/helper layer and apply it to the existing CSS and component seams. Replace broad transitions with explicit visual properties, keep theme changes scoped, add interruptible transitions for case and filter state changes, and preserve reduced-motion behavior.

## User Stories

1. As a visitor, I want theme changes to feel deliberate without unrelated layout properties animating.
2. As a visitor, I want selecting a case to transition smoothly while the control remains responsive.
3. As a visitor, I want searching and filtering projects to feel like a polished archive rather than an abrupt data replacement.
4. As a visitor who prefers reduced motion, I want all added motion to collapse safely.
5. As a maintainer, I want future microinteractions to use shared motion tokens instead of one-off values.

## Implementation Decisions

- Add shared duration and easing tokens at the existing global CSS token layer.
- Add a small typed helper or class utility in the existing animations component area. It must not become a general animation framework.
- Replace `transition: all` in the shared transition convention with an explicit visual-property list.
- Keep the existing ease-out family and 160ms to 360ms duration range unless an existing interaction requires its current value.
- Add an interruptible case-content transition at the public case selection boundary.
- Add a restrained filter/search result transition with no stagger during rapid typing.
- Scope theme animation to visual theme properties and preserve the existing reduced-motion guard.
- Do not add dependencies, redesign the visual system, or change content/layout outside motion behavior.

## Testing Decisions

- Test public interaction behavior at the existing case selector and search/filter component seams where practical.
- Add source-level assertions only for shared motion token contracts and reduced-motion behavior when runtime UI tests cannot observe CSS.
- Verify with the existing project test/typecheck commands and a production build if available.
- Perform a manual browser feel-check for theme switching, case switching, filtering, keyboard navigation, and reduced motion.

## Out of Scope

- New visual theme design.
- New animation libraries.
- Rewriting all existing animation components.
- Changes to content, navigation, accessibility labels, or backend behavior.

## Further Notes

The source repository is `luinbytes/luinbytes.dev`. The approved public test seam is the existing CSS/component boundary plus the existing case and filter interaction surfaces. No new public API is required.
