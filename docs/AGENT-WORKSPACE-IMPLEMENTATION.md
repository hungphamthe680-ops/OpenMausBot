# Agent Workspace UI Upgrade

## Working branch
`feature/agent-workspace-premium-ui`

## Current implementation

- `src/App.tsx` keeps the existing `ChatView` as the primary conversation surface and adds an opt-in Agent Workspace toggle for the selected bot.
- `src/components/AgentWorkspace.tsx` renders a sibling panel using the selected bot's existing `tasks` collection.
- The panel includes task counts, status filters, title search, recent task rows, timestamps, empty states, and responsive close behavior.
- The panel uses existing semantic skin tokens (for example `bg-panel`, `bg-card`, `text-ink`, and `border-hairline`), so it follows the app's existing skin system rather than introducing a parallel theme.
- Task status is derived from existing task fields (`busy`, `waitingForTeammates`, `closedBy`, and `archivedAt`). The panel does not fabricate progress or launch agents.

## Compatibility boundaries

- Keep `ChatView` as the primary conversation surface; do not replace it.
- Reuse existing bot, thread, and task identifiers.
- Do not introduce a parallel chat-history store or migrate conversation data.
- Do not modify MCP server configuration, Skills assignments, agent definitions, credentials, or persistence as part of this UI-only change.
- Extend the existing skin system; do not replace `src/lib/skins`, `ThemeRow`, or the saved skin-choice mechanism.
- Preserve existing ComputerPanel, InspectorPanel, ActivityPanel, and their open/close behavior.

## Current limitations

This is currently a read-only task overview, not a complete agent orchestration workspace. It does not yet:
- create or assign tasks;
- start, stop, or retry agents;
- stream live tool logs or execution events into the panel;
- expose per-agent delegation controls or progress timelines.

Those capabilities must be built on verified existing runtime APIs and event streams, not simulated in the UI.

## Validation status

- GitHub repository and feature branch are accessible.
- The branch is 9 commits ahead of `main` and 0 commits behind it at the time of this update.
- Pull Request #1 remains open as a Draft.
- Source integration has been inspected.
- Automated typecheck, lint, test, production build, and Windows packaging/runtime checks have not yet been executed in this environment. Do not treat the feature as build-verified until those checks pass.
