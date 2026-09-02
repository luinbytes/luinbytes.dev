# Luinbytes Portfolio

The site is a single-page personal portfolio built around a living pixel pond. `/` is the only public content route; retired product pages and design concepts deliberately resolve to the shared 404.

## Current architecture

- `app/page.tsx` renders Signal Desk as the homepage.
- `components/concepts/signal-desk/` owns the portfolio UI and the shared pond simulation.
- The pond uses one seeded world model, PixiJS renderer, Yuka steering, and a single input layer.
- `app/not-found.tsx` reuses the pond environment so missing URLs still belong to the same visual world.
- Essential portfolio content stays in accessible DOM; the canvas is decorative.

## Route contract

Homepage navigation uses in-page anchors. Project actions leave the site for their current canonical destinations. No retired internal route is kept as an archive or compatibility page.
