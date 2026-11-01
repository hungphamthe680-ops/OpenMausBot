# Agent Workspace UI Upgrade

## Working branch
`feature/agent-workspace-premium-ui`

## Current implementation

- `src/App.tsx` keeps the existing `ChatView` as the primary conversation surface and adds an opt-in Agent Workspace toggle for the selected bot.
- `src/components/AgentWorkspace.tsx` renders a sibling panel using the selected bot's existing `tasks` collection.
- The panel includes task counts, status filters, title search, recent task rows, timestamps, empty states, and responsive close behavior.
- `Tác vụ mới` and `Mở hội thoại` dispatch the native `newTask` and `switchTask` actions. The store routes these through the existing `/api/bots/:botId/tasks` endpoints and dispatches the returned task snapshot.
- Task status is derived from native task fields (`busy`, `activity`, `waitingForTeammates`, `closedBy`, and `archivedAt`). Surface, unread state, usage turns/tokens/cost are displayed only when present in the native task snapshot.
- The panel uses existing semantic skin tokens (for example `bg-panel`, `bg-card`, `text-ink`, and `border-hairline`), so it follows the app's existing skin system rather than introducing a parallel theme.

## Compatibility boundaries

- Keep `ChatView` as the primary conversation surface; do not replace it.
- Reuse existing bot, thread, and task identifiers.
- Do not introduce a parallel chat-history store or migrate conversation data.
- Do not modify MCP server configuration, Skills assignments, agent definitions, credentials, or persistence as part of this UI-only change.
- Extend the existing skin system; do not replace `src/lib/skins`, `ThemeRow`, or the saved skin-choice mechanism.
- Preserve existing ComputerPanel, InspectorPanel, ActivityPanel, and their open/close behavior.

## Current limitations

The panel can create a native task and navigate to an existing task. It is not yet a full orchestration console. It does not yet:
- choose or assign a specific teammate/Agent through a dedicated control;
- start, stop, or retry an Agent independently of the existing chat flow;
- display a per-task live event/log timeline (the runtime SSE stream exists, but the current store does not expose a retained per-task event history to this panel);
- expose per-Agent delegation controls or progress percentages.

These capabilities require a verified server-side contract and must not be simulated in the UI.

## Validation status

- GitHub repository and feature branch are accessible.
- Pull Request #1 remains open as a Draft; it has not been merged.
- Source integration has been inspected, including native task dispatch, task API calls, runtime SSE frames, and task snapshot fields.
- `.github/workflows/agent-workspace-validation.yml` now requests lint, typecheck, Vitest, and production build checks on pull requests and pushes to the feature branch.
- No passing CI result has been observed yet. Local lint, typecheck, tests, production build, Windows packaging/runtime checks, and the Impeccable upstream installer have not been executed from this GitHub-only environment.
