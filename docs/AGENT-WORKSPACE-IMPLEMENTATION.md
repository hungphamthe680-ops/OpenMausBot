# Agent Workspace UI Upgrade

## Working branch
`feature/agent-workspace-premium-ui`

## Non-negotiable compatibility rules
- Keep the existing ChatView as the primary conversation surface.
- Add Agent Workspace as a sibling panel in the existing App shell; do not replace ChatView.
- Reuse existing bot/thread/task identifiers and runtime event streams.
- Do not introduce a parallel chat-history store or migrate existing conversation data.
- Do not modify MCP server configuration, Skills assignments, agent definitions, or credentials as part of the UI work.
- Extend the existing skin system; do not replace `src/lib/skins`, `ThemeRow`, or the saved skin-choice mechanism.
- Preserve existing ComputerPanel, InspectorPanel, ActivityPanel, and their open/close behavior.

## Source architecture confirmed
- `src/App.tsx` owns the workspace shell and sibling side-panel composition.
- `src/components/ChatView.tsx` is the central conversation view and remains intact.
- `src/components/InspectorPanel.tsx` already exposes run/event inspection.
- `src/components/ActivityPanel.tsx` already exposes live activity and runtime updates.
- `src/components/ThemeRow.tsx` already supports system, light, and dark skin choices.

## Implementation sequence
1. Add an opt-in Agent Workspace panel to the App shell, without changing ChatView.
2. Drive task status and progress from existing task/thread data and runtime events; do not fabricate task execution or progress.
3. Add responsive collapse/expand behavior and avoid panel collisions with existing side panels.
4. Polish light/dark surfaces by extending existing skin tokens.
5. Add focused tests for panel visibility, task/thread switching, and preservation of existing panel behavior.
6. Run typecheck, lint, tests, and a Windows packaging smoke test before calling the build complete.

## Validation status
- Fork and write permissions verified.
- Feature branch created from the fork's `main`.
- Architecture inspected.
- No application source files changed yet.
- No build or test results claimed.
