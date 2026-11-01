# DESIGN.md — OpenMausBot incumbent design system

## Design intent
Refine the existing OpenMausBot interface; do not replace its visual identity or interaction model. Treat the app as an Operate surface.

## Implementation rules
- Inspect existing components, CSS, skin/theme definitions, and semantic tokens before styling.
- Reuse existing primitives and tokens for surfaces, text, borders, accents, warnings, and focus.
- Support the existing dark and light themes. Avoid hard-coded colors that break theme switching.
- Keep ChatView as the central workspace. Side panels such as Agent Workspace are contextual and dismissible.
- Keep responsive layouts usable without hiding essential chat actions.
- Preserve existing typography, spacing, icon, and control conventions unless the requested scope explicitly changes them.
- Use animation only for meaningful feedback and respect reduced-motion preferences.

## Quality bar
Readable hierarchy, sufficient contrast, visible keyboard focus, semantic controls, consistent spacing, no clipped content or accidental horizontal overflow, truthful empty/loading/error/busy states, and no decorative UI without a functional purpose.

## Non-goals
No parallel chat-history store, no data migration for visual work, no changes to MCP/Skills/Agents execution, no credentials or user-data changes, and no broad component rewrite as part of a design polish.
