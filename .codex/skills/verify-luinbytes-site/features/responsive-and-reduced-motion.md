# Responsive and reduced-motion behavior

## Sub-features

Desktop and mobile layout, viewport-state preservation, touch input, focus visibility, and reduced-motion pond behavior.

## How to get to it (user POV)

Open `/` on a desktop viewport and a 390 by 844 mobile viewport. Enable the operating system's reduced-motion preference for the motion-safe variant.

## Driving it with Playwright and T3 preview

Run `npm run test:e2e`. In T3 preview, inspect 1440 by 900 and an iPhone-sized preset after the last visible change. Scroll through the complete page and check the project explorer at both sizes.

## Gotchas

Reduced motion slows the pond ecosystem instead of removing it. Resizing must preserve bounded world state rather than remounting duplicate scenes.
