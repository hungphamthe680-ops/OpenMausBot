# Impeccable integration for OpenMausBot

## What is integrated
- Project-local Impeccable skill entry points for Claude Code and Codex.
- OpenMausBot product and incumbent design context in PRODUCT.md and DESIGN.md.
- Explicit preservation constraints for ChatView, MCP, Skills, Agents, history, and user data.

## Upstream project
https://github.com/pbakaus/impeccable

The upstream project is Apache-2.0. This repository carries a project-specific integration guide, not a vendored copy of the full upstream command reference library or detector binary.

## Enable the complete upstream experience
From the OpenMausBot repository root, run:

```bash
npx impeccable install --providers=claude,codex --scope=project
```

Reload the coding tool, then run:
- Claude Code: `/impeccable init`
- Codex: `$impeccable init`

Review generated hook configuration before approving it. Hooks are optional and should not be enabled unattended without reviewing their commands and permissions.

## Recommended workflow for UI changes
1. `critique` the exact component or screen.
2. Implement the smallest scoped change, preserving incumbent behavior.
3. `audit` responsive behavior, accessibility, theming, and performance.
4. `polish` the final target.
5. Run project typecheck/lint/tests/build and report only checks that actually ran.

## Current integration boundary
The local skill documents the workflow and project constraints. Full upstream playbooks, CLI detector, browser live mode, and automatic design hook become available only after the upstream installer successfully runs in a developer checkout. This GitHub-only integration does not execute npm installation or enable hooks.
