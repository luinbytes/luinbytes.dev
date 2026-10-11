# ui-stack site redesign

The site uses ui-stack's Lavender Glass material across the homepage, Pip page, and 404. The site migrates from Next.js to the same Vite, React, Tailwind, and shadcn/Radix stack as ui-stack. Three.js replaces the Pixi renderer. Existing content, links, project selection, pond behavior, and Pip contact behavior remain required.

## Source and design

The source is `luinbytes/ui-stack` at `6e3926e7d798ca887087cf73e4ff2ae92dc52a01`. Its `src/theme.ts` and `src/styles/glass-theme.css` supply the lavender palette, 24px corners, soft shadows, glass rim, and fill recipes. The site adapts them in `app/globals.css` and its CSS Modules. Manrope is served locally with its SIL Open Font License.

The site keeps system light and dark themes. The hero uses almost transparent neutral glass after iPad QA feedback, with 12% to 18% tint and 2px blur. Text shadows preserve readability. Lower panels retain stronger Lavender fills for readable copy over the moving pond. A shared vertical gap replaces independent section padding that accumulated uneven space. Decorative hero surfaces pass pointer events through to the pond. Navigation and action controls keep their existing input behavior.

The site copies the kit's Button primitive and static Glass theme into its React components. Vite prerenders `/`, `/pip`, and the 404 as HTML, then React hydrates the selected route. Page metadata and content remain available without JavaScript. The pond uses native Three.js geometry, textures, and shaders with the existing Yuka world and input model.

## Lu mode

`.agents/skills/lu-mode/SKILL.md` captures the user's explicit instructions for autonomous delivery, bounded Swarm work, direct verification, and concise handoff. No workspace transcript directory was supplied, so this draft does not claim to mine historical conversations. Cursor's built-in skill authoring tool was unavailable; the Codex skill-creator guidance and validator were used.

The installed shared copy is `~/.agents/skills/lu-mode/SKILL.md`, linked from Codex and OMP skill directories. Global Codex instructions require the shared model policy before all work, preserve the user-selected parent settings, and load Poteto mode and Lu mode. OMP uses that same instruction file through its existing symlink. T3 uses the Codex provider instructions.

## Verification

The initial baseline browser run could not compile because the installed dependencies lacked Pixi. Dependencies were restored with `npm ci`. The baseline run was interrupted and is not a passing comparison. The final production build, lint, 11 pond tests, 3 Pip tests, and 26 browser tests pass. Fresh screenshots and remaining proof limits are in [verification.md](verification.md). Independent source review is in [interrogate.md](interrogate.md).

User acceptance remains open until the redesign has been tried.
