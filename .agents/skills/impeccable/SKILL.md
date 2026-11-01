---
name: impeccable
description: "Design-system and frontend quality skill for OpenMausBot. Use when creating, reviewing, polishing, auditing, adapting, or refining any UI, component, settings panel, chat surface, Agent Workspace, theme, or responsive layout. Not for backend-only work."
---

# Impeccable — OpenMausBot design skill

This project adopts the design vocabulary and review workflow from [pbakaus/impeccable](https://github.com/pbakaus/impeccable) (Apache-2.0). This is a project-local integration guide; use the upstream installer for the complete command playbooks, detector engine, and optional hooks.

## Product constraints — do not violate

- OpenMausBot is a local-first desktop chat app for coordinating AI agents. Its primary surface is the existing chat.
- Preserve the familiar OpenMausBot structure and interaction model. The Agent Workspace is supplementary and must never replace ChatView.
- Treat the app UI as **Operate**: task completion, scanability, consistency, clear state, and restrained visual craft outrank decorative novelty.
- Preserve MCP servers/connections, Skills, Agents, conversation history, thread IDs, event streams, settings, credentials, and user data. Never introduce a parallel history store or migration for a visual task.
- Keep existing component patterns, semantic theme tokens, keyboard behavior, accessibility, and localization conventions.
- Do not invent agent capabilities, task statuses, tool logs, or success states. Derive UI from real existing data.
- Avoid broad refactors. Edit only the requested surface and the smallest supporting set of components.

## Workflow

1. Inspect the target component, its callers, existing theme tokens, responsive behavior, and tests before editing. Identify the current visual truth; do not assume a missing DESIGN.md means greenfield.
2. For existing UI, refine rather than redesign unless the user explicitly asks for a redesign. Preserve behavior, copy, identity, and all out-of-scope surfaces.
3. Load the upstream `reference/craft-floor.md` immediately before any UI edit when the full upstream skill has been installed. If it is not present locally, follow the quality floor below.
4. State a concise design direction before implementation when the change is substantial.
5. Implement production-ready code. Prefer existing primitives and semantic tokens over new dependencies or hard-coded colors.
6. Verify the rendered UI at desktop and narrow widths, and in both dark and light themes when applicable. Run relevant lint, typecheck, tests, and build commands where available.
7. Report exactly what was verified. Never claim visual/runtime/build verification that was not performed.

## Quality floor

- Clear hierarchy: one primary action per surface, meaningful section grouping, readable labels and metadata.
- Consistent spacing, typography, icon sizing, border, radius, and elevation; no arbitrary one-off styling.
- Strong contrast in both themes; do not communicate state by color alone.
- Visible focus states, semantic controls, accessible names, sensible tab order, and reduced-motion support.
- Responsive behavior must preserve essential actions and content; avoid clipped panels, horizontal overflow, and overlays that trap interaction.
- Loading, empty, error, disabled, busy, and completed states must be truthful and understandable.
- Motion must communicate state or spatial change, remain subtle, and respect prefers-reduced-motion.
- Avoid generic AI-generated patterns: gratuitous gradients, nested cards, oversized rounded tiles, decorative icon badges, excessive pills, and meaningless animations.
- Do not change data flow, persistence, agent execution, MCP behavior, or history while doing a visual refinement.

## Command vocabulary

Use these as explicit task modes when the user asks for them:

- **init** — establish durable product context in PRODUCT.md.
- **document** — record the incumbent design system in DESIGN.md.
- **critique** — score the target UX and rank issues before editing.
- **audit** — check accessibility, performance, theming, and responsive behavior.
- **polish** — final quality pass on an existing surface.
- **harden** — address errors, edge cases, localization, and overflow.
- **adapt** — adapt a target to screen sizes and devices.
- **layout** — improve spacing and visual hierarchy.
- **typeset** — improve typography hierarchy.
- **colorize** — introduce purposeful color where needed.
- **quieter / bolder / distill / delight / animate** — adjust visual intensity, simplicity, personality, or motion without violating product constraints.

For the complete command-specific playbooks, install the official package in the repository:

```bash
npx impeccable install --providers=claude,codex --scope=project
```

After installation, reload the coding agent and run `/impeccable init` (Claude) or `$impeccable init` (Codex). The official hook is optional; review generated hook configuration and approve it explicitly in the coding tool. Do not enable unattended hooks without reviewing what they execute.

## OpenMausBot-specific review checklist

- ChatView remains present and usable when Agent Workspace opens/closes.
- Existing thread selection and conversation history remain unchanged.
- Agent/task panels read existing state; they do not create duplicate state stores.
- MCP, Skills, Agents, and settings screens retain their existing entry points and behavior.
- Dark/light themes use existing semantic tokens and remain legible.
- Desktop, tablet/narrow layout, keyboard navigation, focus, and reduced motion are checked.
- No new runtime dependency is added solely for cosmetic effects.
