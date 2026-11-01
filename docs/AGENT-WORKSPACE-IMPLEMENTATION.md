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

## Hybrid AI privacy and performance requirements

The selected product policy is:
- Operating mode: **balanced speed and privacy**.
- Sensitive-data policy: **require explicit confirmation before sending personal, contract, or financial data to an external model/provider**.
- Preserve existing MCP servers, Skills, Agent definitions, provider credentials, chat history, and local conversation storage.

### Security boundary (must remain explicit)

- TLS protects data in transit; AES-256-GCM is the target for application-managed data encrypted at rest. Neither makes plaintext invisible to a cloud model provider while that provider is processing a request.
- Do not describe provider-bound prompts or files as end-to-end encrypted when the provider receives plaintext for inference.
- Keep source files and the primary working copy local. Do not upload whole folders or the full disk as a side effect of indexing or delegation.
- Classify locally before dispatch. A sensitive match must pause the outbound operation and present the user with the destination provider, the data categories detected, and the exact excerpts/files proposed for transmission.
- Confirmation must be scoped to that specific operation and payload. No blanket “always allow” consent for personal, contract, or financial data in the default profile.
- If classification or policy evaluation fails, fail closed for sensitive file transmission; do not silently fall back to sending.
- Record a local audit event containing provider, time, file/message identifiers, classification, consent decision, and payload hash. Do not copy raw sensitive content or secrets into the audit log.
- Keep encryption keys out of source control, logs, provider prompts, and ordinary app config exports. Use OS-protected key storage where supported; define recovery/rotation behavior before enabling encrypted-at-rest migration.
- Retain a Local Only escape hatch that blocks all external model/provider dispatch for a task.

### Performance and accuracy requirements

- Parse/OCR and extract metadata locally; use bounded concurrency and streaming for large files.
- Build/reuse local indexes and send only relevant, bounded excerpts rather than repeatedly uploading complete documents.
- Cache derived local artifacts by content hash; invalidate them when the source changes.
- Parallelize independent extraction and validation steps, but preserve deterministic ordering and source references in the final report.
- Every material finding must point back to a source file and page/worksheet/row where available. Report uncertainty and missing evidence rather than inventing values.
- Measure end-to-end latency, bytes sent, cache hit rate, and extraction failures; optimize only against these measurements.

### Implementation status and required integration points

This section records the approved target policy; **it is not a claim that the enforcement is already active**. The current branch has not yet added an outbound sensitive-data consent gate, attachment-content classifier, encrypted attachment store, OS-backed key management, or provider-boundary audit trail.

Before marking this feature complete, implement and test all of the following:
1. A shared policy model in validated app configuration, with safe defaults and backward-compatible migration.
2. A local classifier for message text and supported attachment formats, including Vietnamese identifiers and common personal/financial markers; unknown or unsupported formats must be surfaced to the user.
3. A server-side dispatch gate covering every external provider path (including CLI-backed engines, direct API providers, MCP-mediated delegation, retries, and automatic recovery), not just the chat composer.
4. A one-operation consent challenge bound to the provider, payload hash, and expiry; reject replay, stale approval, or changed payload.
5. Local encryption at rest with authenticated encryption, protected key storage, atomic migration, and rollback/recovery tests. Do not encrypt files until every read/write/backup/export path has been audited.
6. A local audit trail that records metadata only and is protected from tampering as far as the local application model permits.
7. UI controls in Settings and a clear confirmation dialog before sensitive outbound dispatch.
8. Automated tests proving that no provider receives sensitive content without valid consent, including attachments, retries, alternate providers, and classification failures.
9. Performance tests on large PDFs and office documents, with bounded memory and concurrency.

Do not merge or enable a partially implemented gate as if it were complete. Preserve existing MCP, Skills, Agents, credentials, and conversation history throughout implementation.
