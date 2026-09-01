# Pixel-art pond animation library research

Snapshot: 2026-09-01. This is a source-backed comparison for the Signal Desk pixel-art pond. The recommendation treats the pond as one interactive scene, not a stack of unrelated effects.

## Decision in one sentence

Keep one PixiJS 8 renderer. Use Pixi's nearest-sampled textures, sprite sheets, `TilingSprite`, `AnimatedSprite`, and `ParticleContainer` for the pixel-art scene; add Yuka only for fish steering/flocking; use the existing `pixi-filters` package for selective Pixelate, Displacement, SimplexNoise, and Shockwave effects. Do not add Three.js or React Three Fiber to this MVP.

This is an engineering judgment based on the local implementation and the primary-source capabilities below. Three.js has stronger ready-made 3D water, but introducing it beside Pixi would create two rendering systems without solving the pixel-art asset and behavior problem.

## Local baseline

The current dependency set already includes `pixi.js@8.20.0`, `pixi-filters@6.1.5`, Framer Motion, and GSAP. It does not include Three.js, Yuka, `@react-three/fiber`, or Drei. [`PondEnvironment`](../../components/concepts/signal-desk/signal-desk.tsx) currently loads a photographic `pond-aerial.webp`, one displacement map, and two `MeshPlane` koi. Fish position, heading, speed, and vertex deformation are updated directly in the Pixi ticker.

For the new pixel direction, that means the renderer is already the right seam, but the scene assets and simulation need to change. The photo should become a backdrop option or be removed from the pixel-art canvas. Fish should become sprite-sheet or low-resolution atlas actors with a simulation state separate from their render state.

## Candidate comparison

| Candidate | What the primary source confirms | Pixel-pond fit | Cost / limitation | Decision |
| --- | --- | --- | --- | --- |
| **PixiJS 8 sprites, textures, and `TilingSprite`** | Pixi describes `Sprite` as the foundational image display object. `TextureSource` supports `scaleMode`, `wrapMode`, and shared texture views. `TilingSprite` repeats a texture over a defined rectangle and exposes independent `tilePosition`, `tileScale`, and `tileRotation`, making it suitable for a moving water tile. ([Sprite guide](https://pixijs.com/8.x/guides/components/scene-objects/sprite), [Texture guide](https://pixijs.com/8.x/guides/components/textures), [TilingSprite guide](https://pixijs.com/8.x/guides/components/scene-objects/tiling-sprite)) | Exact fit for pixel-art water, banks, reeds, foam, and parallax layers. Use nearest sampling and small looping textures instead of stretching one photograph. | Tiling alone is repetition, not simulation. Add several differently phased tiles or a shader/low-alpha overlay to avoid obvious seams. | **Use as the base.** It is already installed and supports the requested art direction without another renderer. |
| **PixiJS `Spritesheet` + `AnimatedSprite`** | Pixi's official API describes `AnimatedSprite` as a list of textures, recommends spritesheets for the efficient path, and exposes `animationSpeed`, `currentFrame`, `loop`, and `update(deltaTime)`. The current Pixi skills reference documents loading atlas animations through `Assets.load()` and `sheet.animations`. ([AnimatedSprite API](https://pixijs.download/v8.6.4/docs/scene.AnimatedSprite.html), [Pixi spritesheet reference](https://github.com/pixijs/pixijs-skills/blob/main/skills/pixijs-assets/references/spritesheet.md)) | Gives the fish actual frame animation: tail swish, eye blink, turning, idle hover, and splash frames. A four to eight frame loop at a deliberately low `animationSpeed` will look intentional rather than like a stretched photo. | Requires a small pixel-art atlas. Frame animation should be decoupled from travel speed so fish do not visibly accelerate their tails every time the pointer moves. | **Use for fish and effects.** Keep steering and frame selection as separate state. |
| **PixiJS `ParticleContainer` / `Particle`** | PixiJS 8 introduces a high-performance particle API intended for large numbers of lightweight visuals such as sparks, bubbles, and swarms. Dynamic properties are declared explicitly; static properties are uploaded only when changed. The API is marked experimental, and particles do not support the full Container API. ([ParticleContainer guide](https://pixijs.com/8.x/guides/components/scene-objects/particle-container), [Pixi particle blog](https://pixijs.com/blog/particlecontainer-v8)) | Good for bubbles, drifting pixels, pollen, tiny fish silhouettes, and surface sparkles. A shared atlas keeps this cheap. | Do not use it for fish that need child meshes, filters, or per-fish complex behavior. It is a flat particle list, not a general scene graph. | **Use for ambient detail only.** Keep full `Sprite` or `AnimatedSprite` objects for hero fish. |
| **PixiJS 8 custom filters + ticker** | Pixi supports filters on sprites, containers, and graphics. Its custom-filter example defines a time uniform and updates it from `app.ticker`; its scene-object guide documents `onRender` for per-frame lightweight work. Pixi also warns filters can increase cost and memory, so they should be used sparingly. ([Filters guide](https://pixijs.com/8.x/guides/components/filters), [Scene-object filters and render callbacks](https://pixijs.com/8.x/guides/components/scene-objects)) | The right place for one restrained animated water shader: quantized UV motion, a normal-map wobble, a dithered caustic pattern, and a pointer ripple mask. This makes water visibly alive while preserving crisp pixel edges. | A full-screen filter over every UI layer is expensive and can blur the pixel style. Keep it on the pond surface container, use low resolution where acceptable, and avoid a filter chain on every fish. | **Use one custom surface filter.** It is a small extension of the current renderer, not a second engine. |
| **`pixi-filters` 6.1.5** | The official repository maps PixiJS 8 to Filters 6 and lists `PixelateFilter`, `SimplexNoiseFilter`, `DisplacementFilter`, `ShockwaveFilter`, `BulgePinchFilter`, and other effects. `PixelateFilter` exposes block size as a filter property. ([Filters compatibility and catalog](https://github.com/pixijs/filters#readme), [PixelateFilter API](https://filters.pixijs.download/main/docs/PixelateFilter.html)) | Pixelate can enforce a cohesive low-resolution pass on selected background or interaction effects. Displacement can add local water response. SimplexNoise can supply subtle animated variation when masked and quantized. Shockwave remains useful for a tap. | These are post-processing effects, not art direction or fish simulation. Pixelate applied after high-resolution scaling can look muddy; prefer native low-resolution assets and nearest sampling first. Avoid stacking Pixelate, Displacement, blur, and noise across the full canvas. | **Keep and use selectively.** One or two effects per layer, with Pixelate reserved for deliberate stylization. |
| **Yuka 0.7.8** | Yuka is a standalone game-AI library independent of a particular 3D engine. Its steering API calculates forces per simulation step using `delta`; documented behaviors include `WanderBehavior`, `AlignmentBehavior`, `CohesionBehavior`, `SeparationBehavior`, and `FleeBehavior`. `Vehicle` exposes `maxSpeed`, `maxTurnRate`, `mass`, `neighbors`, and a steering manager. ([Yuka repository](https://github.com/Mugen87/yuka), [SteeringBehavior API](https://mugen87.github.io/yuka/docs/SteeringBehavior.html), [Vehicle API](https://mugen87.github.io/yuka/docs/Vehicle.html), [WanderBehavior API](https://mugen87.github.io/yuka/docs/WanderBehavior.html), [AlignmentBehavior API](https://mugen87.github.io/yuka/docs/AlignmentBehavior.html)) | Directly addresses weird independent fish. Map the 2D pond to Yuka's vectors, combine low-weight wander plus flocking, and give the pointer a bounded flee force. Copy the resulting position and heading into Pixi sprites. | Yuka does not render pixels, animate sprite frames, or understand pond boundaries. The integration must update neighbors and clamp to the pond region. Its docs note that built-in steering assumes vehicle mass one, so weights need tuning. | **Add for fish behavior only.** This is the only new runtime package justified by the current symptom. |
| **Three.js `Water` / `Water2`** | The official `Water` addon is a flat reflective effect and is WebGLRenderer-only. `Water2` adds reflections, refractions, flow maps, two repeating normal maps, and render-target passes; its source advances two flow offsets half a cycle apart to avoid reset artifacts. ([Water docs](https://threejs.org/docs/pages/Water.html), [Water2 source](https://github.com/mrdoob/three.js/blob/master/examples/jsm/objects/Water2.js#L1030-L1055), [Water2 flow update](https://github.com/mrdoob/three.js/blob/master/examples/jsm/objects/Water2.js#L1269-L1319)) | Strong option for a separate realistic 3D pond, but not a drop-in solution for pixel sprites. It would require a real 3D scene, camera, geometry, and asset treatment. | Adds a renderer, render-to-texture passes, new assets, and a second visual language. It does not supply fish flocking or pixel-art animation. | **Compare only.** Do not add to the pixel-art MVP. |
| **React Three Fiber 9 + Drei 10** | R3F is a React renderer for Three.js, pairs version 9 with React 19, and exposes `useFrame` plus pointer events. Drei is a helper collection for R3F and uses `three-stdlib`; its environment guidance warns that CDN presets are not intended for production. ([R3F repository](https://github.com/pmndrs/react-three-fiber#readme), [R3F render loop](https://r3f.docs.pmnd.rs/tutorials/how-it-works#render-loop), [Drei repository](https://github.com/pmndrs/drei#readme), [Drei environment guidance](https://drei.docs.pmnd.rs/staging/environment)) | Useful only if the pond becomes a full Three scene. Neither package improves pixel-art sampling, fish steering, or water by itself. | A second renderer architecture and several extra dependencies for no benefit in the chosen 2D pixel scene. | **Skip.** If a 3D rewrite is later approved, use these as a coordinated migration, never beside Pixi. |

## Recommended implementation architecture

### One Pixi canvas, pixel-native layers

```text
DOM portfolio shell       Framer Motion + GSAP
                              |
single PixiJS canvas      pixel background + tiled water
                          sprite-sheet fish + particles
                          one surface shader + tap ripple
                              |
fish simulation          Yuka vehicles and steering
```

1. **Render at a deliberate pixel resolution.** Keep the pond canvas crisp with nearest sampling and integer-friendly scaling. Let the CSS canvas fill the viewport, but keep source art in a small atlas. Pixi's texture source exposes `scaleMode`; use nearest sampling for pixel edges. ([Texture properties](https://pixijs.com/8.x/guides/components/textures#common-texturesource-properties))
2. **Replace the static photo as the active scene.** Build the pond from a base tile, offset water tiles, banks, reeds, lily pads, foam, caustics, and a few depth bands. Animate `TilingSprite.tilePosition` at separate slow rates and add a masked custom filter for low-amplitude surface motion. A static photograph may remain as an optional low-alpha texture behind the pixel treatment, but it must not be the only time-varying visual.
3. **Use an atlas for fish.** Give every fish a sprite-sheet animation with separate `idle`, `swim`, `turn`, and `flee` frame ranges. Keep animation cadence slow and independent from movement speed. Use `roundPixels` or integer placement when it improves the style, but do not force integer positions if it makes the motion visibly stair-step.
4. **Use six to eight fish.** Give them different atlas variants, scale, palette, depth band, phase, and cruise speed. Yuka should own acceleration, max speed, max turn rate, wander, alignment, cohesion, separation, and pointer flee. Pixi should own render position, z-order, frame selection, and sprite flip/rotation.
5. **Keep interaction local.** Pointer position and velocity feed a shared pond interaction state. A pointer-down event adds one `ShockwaveFilter` ripple; continuous movement modulates the surface shader and a nearby fish response. The water must continue moving when the pointer is still.
6. **Use filters as accents.** Apply `PixelateFilter` only to a deliberately stylized layer or impact effect. Use `SimplexNoiseFilter` only with a low alpha/masked region. Use Displacement for subtle surface movement, not as the sole animation. Keep filter resolution bounded and remove expired ripples.
7. **Keep reduced motion coherent.** Preserve feeding, target selection, and grounded relationships while running the shared simulation at a greatly reduced speed. Remove decorative entrance motion, shorten travel, lower ripple strength and particle counts, and keep hidden-tab pausing intact.

## Why not stack every library?

PixiJS already owns the browser canvas, scene graph, ticker, textures, filters, pointer surface, and pixel-art primitives. Yuka fills one missing layer: stable multi-agent behavior. Three.js and R3F solve a different rendering model. Adding them now would not make the current sprites more natural, and it would make browser QA harder because two GPU lifecycles would exist for one pond.

If the brief later changes to a fully 3D pond with reflective water, make that a deliberate migration to Three.js core plus `Water2`, optionally wrapped by R3F and Drei. Do not mix `Water2` into the current Pixi canvas.

## Acceptance gates for the next pond pass

- Six to eight visible pixel-art fish at desktop size, with distinct scale, depth, palette, and animation phase.
- No frame-driven direction snaps. Fish heading, speed, and flee response have explicit acceleration and turn-rate limits.
- Fish tail and idle animation remains slow and readable while travel speed changes.
- Water tiles and the surface shader visibly change during a one-second no-input capture. The scene must not read as a static background with a mouse-only effect.
- Pixel edges remain crisp at desktop and mobile sizes. No unintended full-canvas blur from a filter chain.
- Pointer interaction does not select DOM text; tap ripples are local and do not replace ambient motion.
- One canvas renderer only, with reduced-motion and hidden-tab pause behavior retained.
- Desktop and mobile live-preview captures inspected after the final visual change.

## Sources

- [PixiJS Sprite guide](https://pixijs.com/8.x/guides/components/scene-objects/sprite)
- [PixiJS Texture guide](https://pixijs.com/8.x/guides/components/textures)
- [PixiJS TilingSprite guide](https://pixijs.com/8.x/guides/components/scene-objects/tiling-sprite)
- [PixiJS AnimatedSprite API](https://pixijs.download/v8.6.4/docs/scene.AnimatedSprite.html)
- [PixiJS spritesheet reference](https://github.com/pixijs/pixijs-skills/blob/main/skills/pixijs-assets/references/spritesheet.md)
- [PixiJS ParticleContainer guide](https://pixijs.com/8.x/guides/components/scene-objects/particle-container)
- [PixiJS particle performance notes](https://pixijs.com/blog/particlecontainer-v8)
- [PixiJS filters and custom shader guide](https://pixijs.com/8.x/guides/components/filters)
- [PixiJS filter/render guidance](https://pixijs.com/8.x/guides/components/scene-objects)
- [PixiJS Filters repository](https://github.com/pixijs/filters#readme)
- [PixelateFilter API](https://filters.pixijs.download/main/docs/PixelateFilter.html)
- [Yuka repository](https://github.com/Mugen87/yuka)
- [Yuka SteeringBehavior API](https://mugen87.github.io/yuka/docs/SteeringBehavior.html)
- [Yuka Vehicle API](https://mugen87.github.io/yuka/docs/Vehicle.html)
- [Yuka WanderBehavior API](https://mugen87.github.io/yuka/docs/WanderBehavior.html)
- [Yuka AlignmentBehavior API](https://mugen87.github.io/yuka/docs/AlignmentBehavior.html)
- [Three.js Water docs](https://threejs.org/docs/pages/Water.html)
- [Three.js Water2 source](https://github.com/mrdoob/three.js/blob/master/examples/jsm/objects/Water2.js)
- [React Three Fiber repository](https://github.com/pmndrs/react-three-fiber#readme)
- [React Three Fiber render loop](https://r3f.docs.pmnd.rs/tutorials/how-it-works#render-loop)
- [Drei repository](https://github.com/pmndrs/drei#readme)
- [Drei environment guidance](https://drei.docs.pmnd.rs/staging/environment)
