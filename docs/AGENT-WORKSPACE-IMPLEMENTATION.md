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

## Privacy implementation progress (not production-complete)

Added `server/data-protection.ts` with:
- Local Vietnamese-oriented heuristic indicators for national IDs, phone numbers, email, address, financial and contract language. It returns category counts only, not matched values.
- One-use outbound consent challenges bound to the exact provider and SHA-256 payload hash, with expiry and replay rejection.
- Metadata-only JSONL audit writing (provider, decision, categories, payload hash and operation id; no prompt or file content).
- AES-256-GCM authenticated encryption primitives.
- Windows DPAPI CurrentUser protect/unprotect helper for a 32-byte data key; key bytes are passed over stdin, not command-line arguments.

**Important: these are primitives, not yet an active end-to-end privacy boundary.** They are not yet wired into every provider adapter's `sendTurn`, generated text/review calls, attachment extraction, retries/failover, teammate dispatch, or MCP-mediated provider calls. The classifier is heuristic and can produce false positives/negatives; it is not a guarantee that all Vietnamese personal data is detected. The DPAPI helper has not been executed on a Windows host, and no encrypted key-file lifecycle/rotation/recovery or Credential Manager integration is active. Existing attachment files and conversation history have not been encrypted or migrated.

Do not enable or advertise the privacy feature as enforced until:
1. A single mandatory dispatch boundary covers all external model/provider paths, including retries, failover and subagent handoffs.
2. Sensitive attachments are classified from extracted local text before any upload; unsupported/failed extraction pauses dispatch.
3. The consent UI displays the exact provider and data categories/excerpts and binds approval to an immutable payload hash.
4. A protected key lifecycle is implemented and tested on Windows; encrypted file writes use atomic replacement and recoverable migration.
5. Integration tests assert zero provider calls on missing, expired, replayed, wrong-provider, or payload-mismatched consent.
6. Windows DPAPI, Credential Manager (if selected), restart/recovery, and legacy data compatibility are tested on Windows.

No current claim of full dispatch enforcement or Windows runtime validation is made.

## Privacy integration audit — 2026-11-01

The follow-up source inspection identified additional outbound paths that must be covered before the privacy feature can be enabled:

- **Primary provider turns:** provider drivers are registered through `server/harness/registry.ts`; the actual turn-dispatch/send boundary still needs to be traced through the host and driver adapter contracts. A gate in the chat composer alone would not cover CLI-backed engines.
- **Remote extraction is a separate provider path:** `server/extractor/index.ts` selects Workers AI, the included relay, or OpenRouter and calls the backend directly. `server/extractor/remote.ts` posts extracted text and optional base64 images. This path can transmit PDF/Office-derived content independently of the normal chat turn and must have its own consent enforcement or share the same mandatory outbound boundary.
- **Attachment persistence is currently plaintext:** `server/attachments.ts` stores uploads under `DATA_DIR/attachments` and exposes the existing attachment storage lifecycle. The AES-GCM helper is not integrated into upload, read, streaming, retention, or backup paths. Encrypting only newly uploaded files would also leave historical attachments readable.
- **Agent handoffs and retries:** `server/agents-turn.ts` identifies handoff/continuation turns and `server/drivers/retry.ts` classifies transient failures; `server/limit-failover.ts` can move a thread to a different engine. Each retry/failover attempt must re-evaluate the destination provider and payload approval. An approval for provider A must never authorize provider B.
- **MCP is not equivalent to model dispatch:** existing outbound connector approvals in `server/outbound-hold.ts` govern connector actions, not arbitrary AI-provider requests. MCP tools that call remote AI services need a distinct provider/payload consent check at their actual network boundary.

### Release blockers

1. Trace and wrap every provider network/CLI dispatch, including the extractor, behind a single fail-closed policy boundary.
2. Add a user-visible consent request that identifies the exact provider, data categories, and immutable payload digest; require a fresh approval for a changed payload, provider, retry, or failover.
3. Add attachment encryption as a versioned storage format with DPAPI-protected key lifecycle, atomic migration, backup/restore compatibility, and rollback. Do not rewrite the existing attachment directory until this is tested on Windows against a copy and a verified backup.
4. Add integration tests with fake providers/MCP servers proving zero outbound calls on missing, expired, replayed, provider-mismatched, or payload-mismatched consent. Include PDF/Word/Excel extraction, Agent handoff, retry and failover.
5. Run the migration and DPAPI tests on a real Windows environment. A non-Windows CI run cannot certify Windows DPAPI behavior.

**Status:** this audit records concrete code paths and release blockers; it does not claim that those paths are already gated or that attachment files have been encrypted.

### Follow-up test coverage — 2026-11-01

Added `server/data-protection.test.ts` with focused unit coverage for the existing privacy primitives:

- Vietnamese-oriented classifier categories and the guarantee that classifier output does not contain matched values.
- One-use consent challenge binding to provider and exact payload, including replay, provider mismatch, payload mismatch, and expiry.
- AES-256-GCM round-trip, invalid key size, and ciphertext tampering.
- Metadata-only audit output.

These are **primitive unit tests only**. They do not prove the application dispatch boundary, remote extractor, attachments, Agent handoffs, MCP, retries, or failover are gated. They do not test Windows DPAPI. CI results must be checked for the new commit before reporting these tests as passing.
