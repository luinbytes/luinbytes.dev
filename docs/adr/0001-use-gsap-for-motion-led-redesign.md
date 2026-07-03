# Use GSAP for the motion-led redesign

We will use GSAP surgically for the `luinbytes.dev` motion-led redesign because the selected direction depends on choreographed hero, command-surface, and proof-rail timelines that are awkward to keep precise with CSS and Framer Motion alone. Routine hover, focus, and small state transitions should stay in CSS or Framer Motion so GSAP remains the timeline tool, not the default animation layer.
