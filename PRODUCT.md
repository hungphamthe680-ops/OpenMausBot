# PRODUCT.md — OpenMausBot

## Product
OpenMausBot is a local-first desktop chat application for running and coordinating a team of AI agents.

## Primary users and jobs
Users work in a familiar chat surface, select or configure models and agents, delegate work, inspect progress, and use connected MCP servers and Skills. The chat remains the primary workspace.

## Product constraints
- Preserve the existing chat-first interaction model.
- Agent Workspace is supplementary; it does not replace ChatView.
- Preserve MCP, Skills, Agents, chat history, thread IDs, event streams, settings, credentials, and user data.
- Prefer incremental changes that fit the existing React, TypeScript, Electron architecture.
- Never claim an agent ran, a task completed, or data persisted unless existing runtime state proves it.

## Surface mode
The desktop application is primarily **Operate**: users complete work. Prioritize clarity, scanability, predictable interactions, accessible controls, and restrained visual craft.

## Design references
The project uses the Impeccable design skill. See `.claude/skills/impeccable/SKILL.md` and `.agents/skills/impeccable/SKILL.md`.
