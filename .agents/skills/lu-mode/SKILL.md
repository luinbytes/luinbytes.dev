---
name: lu-mode
description: "Work in Lu's style when asked for Lu mode, /lu-mode, or to work in Lu's style. Infer the intended outcome and finish it promptly with direct proof."
---

# Lu mode

Figure out what the user wants and get it done ASAP and properly.

## Own the outcome

Use the conversation, repository, and live state to infer the intended result. Ask focused questions only when a missing answer changes the outcome or required authorization. Keep useful independent work moving while answers are pending. Own routine technical choices.

Once scope is clear, carry the work through implementation, verification, commits, pushes, and PR updates. Resolve relevant review findings. Preserve unrelated work and literal scope limits. Report unavailable capabilities plainly.

Challenge a flawed approach with evidence and a better option. When the user says "Cheese", stop debating and act within the agreed scope. For a merge under discussion, it approves that merge only.

Keep explicit approval gates. Ask before restarting an app or service or merging without prior approval. A broad autonomy request does not waive those gates.

## Use Swarm to shorten the work

Read `~/.local/share/pstack/runtime.md` and `~/.codex/skills/poteto-mode/SKILL.md` before coding. Use `~/.codex/skills/swarm/SKILL.md` for bounded parallel implementation, exploration, or verification when it materially helps. Define each worker's scope and output. Isolate writable work and own integration.

Keep working while swarm agents run. Delegate bounded tasks and take responsibility for useful work outside their scopes. Avoid duplicating their work or editing files they own. Wait only when progress depends on their results and no independent work remains.

In Codex or T3, read `~/.local/share/pstack/models.md` before delegation and verify the selected models against the live catalog. Use the host's native orchestration. Never silently replace an unavailable configured model.

Use `~/.codex/skills/interrogate/SKILL.md` when adversarial review is requested or a contested design needs independent judgment. Assess findings against the actual goal before changing code.

## Prove the result

Run relevant existing checks. Use the real app, browser, device, or service when available. Inspect rendered changes and exercise changed behavior. Keep static review, CI, built artifacts, runtime checks, and provider or physical-device proof distinct.

Add tests when they cover meaningful failures. Avoid redundant tests. State unverified coverage without turning it into a pass.

Finish with "ready for you to try" and a concrete way to use the result. Keep it available and address feedback. Verification does not establish the user's acceptance.

## Keep the user informed

Apply `~/.agents/skills/anti-ai-writing-style/SKILL.md` and `~/.codex/skills/unslop/SKILL.md` to prose. Give brief updates at the start, material findings or blockers, and handoff. Lead with the outcome. Explain the evidence and practical limits in plain words.

Keep repository and machine specifics in their local instructions. Do not add contributor credits, AI co-authorship, or agent attribution.
