# Lu public work research

Snapshot: 2026-08-31. Sources are first-party public pages, repository files, GitHub pull requests, and GitHub's public profile/API. GitHub counts and pull request states are mutable.

## The safe, evidence-backed position

The public record supports presenting Lu as a systems-minded engineer who builds software that makes computers act, remember state, and remain controllable across local, server, desktop, mobile, and Linux environments. That sentence is an interpretation of the public work, not a claimed job title.

The strongest portfolio story is not "a collection of products." It is a pattern:

- agent runtimes and conversation infrastructure;
- native clients that respect the platform they run on;
- Linux and desktop tools that solve sharp, physical problems;
- reliability work around state, retries, permissions, performance, and recovery;
- small utilities and experiments shipped with real installers, tests, or operational guardrails.

## What is known, and what is not

### User-stated

- Lu works at [Orchid.ai](https://orchid.ai/).
- Lu does side work for [iniuria.us](https://iniuria.us/).

These two facts came from the user and are not treated as externally verified employment or client records.

### Publicly verified

The [public GitHub profile](https://github.com/luinbytes) is `luinbytes`, links to `luinbytes.dev`, describes the account as "Trying to make computers do things," and shows a United Kingdom location. The profile currently lists 29 public repositories and pins HomeBot, the upstream Rakazo project, ByteBot, and this site.

### Deliberately unknown

The official Orchid pages reviewed describe the product and its public direction, but do not attribute individual work to Lu or disclose Lu's responsibilities. The public Iniuria pages reviewed establish the site and forum, but do not provide a verifiable Lu staff profile, project attribution, or technical role. Do not turn either employer/client relationship into a specific technology claim without Lu supplying that detail.

## Orchid.ai: public product context only

[Orchid's homepage](https://orchid.ai/) describes a personal assistant delivered through messages, connected to tools, habits, inbox and calendar administration, and durable memory. [Orchid Beta](https://orchid.ai/blog/orchid-beta-is-here) describes an agent that reads incoming work, prepares next actions, and waits for approval. [Introducing Keiki](https://orchid.ai/blog/introducing-keiki) describes a platform for agents deployed across iMessage, SMS, WhatsApp, Slack, Telegram, and email, with memory, browser use, tools, approvals, human escalation, run inspection, and operational metrics.

That gives the portfolio a public-safe professional context: **agentic software, messaging surfaces, tools, memory, and dependable operations**. It does not prove that Lu personally owns any one of those systems. Keep the copy at the level of "Engineer at Orchid.ai" and public product themes, with no internal architecture, customers, metrics, roadmap, or confidential implementation details.

## Iniuria.us: relationship acknowledged, work unspecified

[iniuria.us](https://iniuria.us/) currently resolves to a payment-information page. Its [official forum](https://www.iniuria.us/forum/) publicly identifies the iNIURIA Cheats community and exposes news, pre-sale, FAQ, testimonials, and support-oriented sections. Those pages do not identify Lu or connect the account to a specific Iniuria project. The portfolio can include a small **Independent work / Iniuria.us** relationship marker if Lu wants it, but should not invent a role, product area, or technical description.

## Strongest personal repositories

These are ranked for story value and evidence quality, not just star count.

| Repository | Public evidence | What it demonstrates | Portfolio treatment |
| --- | --- | --- | --- |
| [HomeBot](https://github.com/luinbytes/HomeBot) | The README describes an open-source home for persistent AI teammates, with a Rust server, native egui desktop client, Kotlin/Compose Android client, HTTP/WebSocket transport, routines, tools, permissions, worktrees, checkpoints, secrets, and recovery. The [Cargo workspace](https://github.com/luinbytes/HomeBot/blob/main/Cargo.toml) confirms a multi-crate Rust architecture. | End-to-end agent systems, protocol boundaries, local ownership, security, persistence, and cross-platform clients. | Flagship project. Show the architecture and the reason for the boundaries, not a generic feature grid. |
| [rakazo-android](https://github.com/luinbytes/rakazo-android) | A community native Android client for Rakazo. The README names Kotlin/Compose, Android Keystore session storage, agent chat, search, Markdown, and foreground notifications, and documents unit/UI checks. | Native mobile engineering, authenticated state, platform-specific UX, and working within an evolving server contract. | Core project in the native-client lane. Clearly label it community-maintained and separate it from upstream Rakazo. |
| [linux-sonar](https://github.com/luinbytes/linux-sonar) | A Python GTK4/libadwaita application for PipeWire and WirePlumber. The README describes five virtual sinks, per-app routing, USB-HID ChatMix, an RNNoise-to-limiter mic chain, Waybar integration, and systemd services. | Low-level Linux integration, audio routing, hardware interaction, daemon lifecycle, and practical UX around a difficult platform gap. | Excellent interactive case study. The signal flow diagram is more persuasive than a screenshot alone. |
| [bongocat](https://github.com/luinbytes/bongocat) | A public Python desktop pet with keyboard, mouse, and controller input, always-on-top behavior, settings, skins, sound, achievements, and Windows/macOS/Linux builds. The [setup manifest](https://github.com/luinbytes/bongocat/blob/main/setup.py) confirms PyQt5, pygame, pynput, packaging, and a console entry point. | Productization, cross-platform packaging, input handling, and a human sense of fun. | Keep as the memorable small project that proves the work is not only infrastructure. |
| [file-deduplicator](https://github.com/luinbytes/file-deduplicator) | The README describes a Go CLI with parallel SHA256 scanning, watch mode, perceptual image hashing, configurable similarity, dry-run, interactive deletion, safe move, and reports. The [Go module](https://github.com/luinbytes/file-deduplicator/blob/master/go.mod) confirms the Go implementation and Bubble Tea ecosystem. | CLI design, concurrency, image processing, destructive-action safety, and useful distribution. | Strong compact case study. Lead with the safety model and the exact-versus-similar distinction. |
| [ByteBot](https://github.com/luinbytes/bytebot-definitive-edition) | The README describes a modular Discord.js v14 bot with SQLite/Drizzle persistence, slash commands, moderation, RBAC, testing, rate limits, and bounded small-VPS runtime defaults. The [package manifest](https://github.com/luinbytes/bytebot-definitive-edition/blob/master/package.json) confirms Node 22, Discord.js, Drizzle, SQLite, Sharp, and Jest. | Stateful backend product work, permissions, bot operations, persistence, and runtime discipline. | Good systems/backend project, but use a concise operational card rather than a large feature inventory. |
| [cursor-barrier](https://github.com/luinbytes/cursor-barrier) | A C daemon for Hyprland that confines XWayland game cursors at the `/dev/input` layer. Its README describes event-driven idle mode, focused-window watching, boundary guarding, raw input, and deferred grabs to avoid stuck buttons. | Systems programming, Linux input, state machines, and careful edge-case handling. | Strong short-form "one sharp problem" project. |

### Useful but optional projects

- [orchidai-android](https://github.com/luinbytes/orchidai-android) is a public, local-only native Android product demo inspired by Orchid's public language. Its README explicitly says that accounts, actions, responses, artifacts, and activity are deterministic demo state and that nothing connects to Orchid or a third party. Include only if labeled **unofficial local demo**, never as Orchid employment proof.
- [hermes-android](https://github.com/luinbytes/hermes-android) is an earlier native Android client. Its README now marks it archived and no longer maintained, so it is better shown as a previous chapter or omitted from the first screen.
- [SuperHackerGolf](https://github.com/luinbytes/SuperHackerGolf), [BallHammer](https://github.com/luinbytes/BallHammer), and [dagger-fall](https://github.com/luinbytes/dagger-fall) show public C#, Lua, and C game-mod/reverse-engineering work. They demonstrate runtime introspection, instrumentation, overlays, and physics work, but are a separate audience and reputational context. Keep them behind an **experiments** filter rather than mixing them into the professional opening.

## Contributions to other projects

### Confirmed merged upstream work

Lu has four recent merged pull requests in [elie222/rakazo](https://github.com/elie222/rakazo):

- [#385](https://github.com/elie222/rakazo/pull/385), **Fix delegated reply surfacing**, made durable request/reply linkage authoritative and prevented valid delegated answers from being silently discarded.
- [#387](https://github.com/elie222/rakazo/pull/387), **feat(mobile): bring Android chat parity**, brought mobile chat behavior and notifications closer to the native client.
- [#391](https://github.com/elie222/rakazo/pull/391), **fix(adapters): expose schedule tools in group chats**, preserved the originating thread, re-authorized it at wake time, and fell back safely when the group was unavailable.
- [#393](https://github.com/elie222/rakazo/pull/393), **perf(mobile): keep live chats responsive**, virtualized long transcripts, memoized message surfaces, and replaced repeated reply scans with a lookup map.

This is particularly good portfolio evidence because it shows ownership of real bugs and performance boundaries in an active external codebase, not only greenfield repositories.

### Public submissions that should not be called merged

The following are useful evidence of technical interests and collaboration, but the public pages reviewed show them as closed or otherwise not confirmed landed. Keep their status explicit:

- [NousResearch/hermes-agent #10408](https://github.com/NousResearch/hermes-agent/pull/10408) addressed unterminated reasoning blocks leaking into visible responses.
- [NousResearch/hermes-agent #5457](https://github.com/NousResearch/hermes-agent/pull/5457) proposed recovery and provider fallback around silent context-compression failures.
- [NousResearch/hermes-agent #5361](https://github.com/NousResearch/hermes-agent/pull/5361) proposed fuzzy matching for memory replacement/removal.
- [NousResearch/hermes-agent #91148](https://github.com/NousResearch/hermes-agent/pull/91148) proposed keeping desktop microphone capture on the client for wake-word sessions.
- [BurntSushi/ripgrep #3282](https://github.com/BurntSushi/ripgrep/pull/3282) proposed a safe `--` separator for dash-prefixed paths passed to decompression tools.
- [mofa-org/mofa #942](https://github.com/mofa-org/mofa/pull/942) proposed `cargo-audit` and `cargo-deny` security and license checks in CI.
- [pingdotgg/t3code #6598](https://github.com/pingdotgg/t3code/pull/6598) proposed determinate desktop update progress using existing updater state.

The pattern is still valuable: agent correctness, context and memory behavior, desktop/mobile UX, security-aware CI, and small fixes at trust boundaries.

## Recurring technologies and engineering patterns

### Technology map

- **Rust:** HomeBot's server, protocol, storage, providers, desktop client, and VCS/tooling crates; also the Linux side of ForzaLife.
- **Kotlin and Jetpack Compose:** HomeBot Android, rakazo-android, and the archived Hermes Android client.
- **Python:** linux-sonar, Bongo Cat, and small local desktop/automation tools.
- **TypeScript/JavaScript:** ByteBot, the luinbytes.dev site, and agent/web contributions.
- **Go:** file-deduplicator.
- **C:** cursor-barrier and dagger-fall.
- **C# and Lua:** game/runtime experiments such as SuperHackerGolf and BallHammer.

### Problem patterns

1. **State is treated as a product concern.** Durable replies, queued work, checkpoints, reconnects, schedules, session storage, and recovery recur across HomeBot, Rakazo, and the external PRs.
2. **The client is not allowed to fake the backend.** HomeBot makes the server authoritative; rakazo-android documents the server contract and explicitly calls out missing capabilities; orchidai-android marks all simulated state.
3. **Platform-native surfaces matter.** egui, Compose, GTK, PipeWire, Waybar, `/dev/input`, systemd, and desktop packaging appear because the problem requires them, not as decorative technology choices.
4. **Reliability is user-visible.** Retry safety, permissions, stale state cleanup, safe fallbacks, bounded resource use, test coverage, and explicit failure modes are repeatedly documented.
5. **The work moves between tiny and large scopes.** Lu builds a multi-crate agent platform, then a single-purpose cursor daemon or desktop pet. The common thread is solving the actual irritation at the right layer.

## Recommendation for Signal Desk

Use the patchbay as a map of **ways of working**, not a catalog of products:

- **Agents and state:** HomeBot, Rakazo contributions, Hermes history, Orchid public context.
- **Native clients:** rakazo-android, HomeBot Android, archived Hermes Android.
- **Systems and Linux:** linux-sonar, cursor-barrier, ForzaLife Linux companion.
- **Tools with a human edge:** Bongo Cat, file-deduplicator, ByteBot.
- **Experiments:** game mods and reverse-engineering projects, opt-in.

Suggested opening thesis, clearly marked as portfolio positioning rather than a sourced quote:

> I build software that makes computers act, remember, and stay under control.

Each interactive card should expose one concrete proof point: the repository, the boundary that mattered, the stack, and whether the evidence is an owned project, a merged contribution, a public submission, or a local demo. Avoid fabricated impact numbers, employer internals, and star-count leaderboards as the primary story.

## Exact sources used

- [GitHub profile](https://github.com/luinbytes)
- [GitHub public profile API](https://api.github.com/users/luinbytes)
- [Orchid homepage](https://orchid.ai/)
- [Orchid Beta](https://orchid.ai/blog/orchid-beta-is-here)
- [Introducing Keiki](https://orchid.ai/blog/introducing-keiki)
- [Iniuria homepage](https://iniuria.us/)
- [Iniuria official forum](https://www.iniuria.us/forum/)
- [HomeBot README](https://github.com/luinbytes/HomeBot/blob/main/README.md) and [Cargo workspace](https://github.com/luinbytes/HomeBot/blob/main/Cargo.toml)
- [rakazo-android README](https://github.com/luinbytes/rakazo-android/blob/main/README.md) and [Android manifest](https://github.com/luinbytes/rakazo-android/blob/main/app/build.gradle.kts)
- [linux-sonar README](https://github.com/luinbytes/linux-sonar/blob/main/README.md) and [installer](https://github.com/luinbytes/linux-sonar/blob/main/install.sh)
- [Bongo Cat README](https://github.com/luinbytes/bongocat/blob/main/README.md) and [setup manifest](https://github.com/luinbytes/bongocat/blob/main/setup.py)
- [file-deduplicator README](https://github.com/luinbytes/file-deduplicator/blob/master/README.md) and [Go module](https://github.com/luinbytes/file-deduplicator/blob/master/go.mod)
- [ByteBot README](https://github.com/luinbytes/bytebot-definitive-edition/blob/master/README.md) and [package manifest](https://github.com/luinbytes/bytebot-definitive-edition/blob/master/package.json)
- [cursor-barrier README](https://github.com/luinbytes/cursor-barrier/blob/master/README.md)
- [orchidai-android README](https://github.com/luinbytes/orchidai-android/blob/main/README.md)
- [hermes-android README](https://github.com/luinbytes/hermes-android/blob/main/README.md)
- [SuperHackerGolf README](https://github.com/luinbytes/SuperHackerGolf/blob/main/README.md)
- [BallHammer README](https://github.com/luinbytes/BallHammer/blob/dev/README.md)
- [dagger-fall README](https://github.com/luinbytes/dagger-fall/blob/master/README.md)
- [Rakazo PR #385](https://github.com/elie222/rakazo/pull/385), [#387](https://github.com/elie222/rakazo/pull/387), [#391](https://github.com/elie222/rakazo/pull/391), and [#393](https://github.com/elie222/rakazo/pull/393)
- [Hermes PR #10408](https://github.com/NousResearch/hermes-agent/pull/10408), [#5457](https://github.com/NousResearch/hermes-agent/pull/5457), [#5361](https://github.com/NousResearch/hermes-agent/pull/5361), and [#91148](https://github.com/NousResearch/hermes-agent/pull/91148)
- [ripgrep PR #3282](https://github.com/BurntSushi/ripgrep/pull/3282)
- [mofa PR #942](https://github.com/mofa-org/mofa/pull/942)
- [T3 Code PR #6598](https://github.com/pingdotgg/t3code/pull/6598)
