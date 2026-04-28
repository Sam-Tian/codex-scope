---
name: dynamic-architecture
description: Generate, refresh, or update the project-local dynamic architecture supervision report for the current repository.
---

# Dynamic Architecture Supervision

Use this skill when the user asks to inspect project progress, generate a dynamic architecture graph, refresh project architecture status, or update the architecture report after Codex development work.

## Rules

- Work in the current repository only.
- Never store secrets, environment variable values, raw transcripts, private keys, or full command output in `.codex-architecture/`.
- Do not overwrite confirmed `status.json` facts when scanner findings disagree with the state file.
- Use `scanFindings` for unconfirmed differences and explain correction proposals to the user.
- Prefer concise, redacted development summaries.

## Normal Flow

1. If `.codex-architecture/status.json` is missing, initialize the project:
   - Ask for project name, goal, phase, and core features.
   - Save answers to a short-lived, redacted temporary JSON file.
   - Run `codex-architecture init --answers <answers-file>`.
   - Run `codex-architecture doctor`.
2. If `status.json` already exists, run `codex-architecture doctor` before changing or refreshing state.
3. Run `codex-architecture refresh`.
4. If the user wants a clickable report with a working refresh button, run `codex-architecture serve`.
   - Treat the viewer as a task-scoped local server.
   - Track whether it should be stopped or intentionally left running.
5. Give the user the report path or local viewer URL.

## After Codex Development Work

1. Write a short redacted JSON summary file with:
   - `summary`
   - `featureUpdates`
   - `moduleUpdates`
   - `interfaceUpdates`
   - `verification`
2. Run `codex-architecture update --from-codex-summary <summary-file>`.
3. Remove short-lived answer or summary files when they are no longer needed.
4. Run `codex-architecture doctor`.
5. Run `codex-architecture refresh`.
6. Report what changed and whether any scan findings need confirmation.

## Commands

- `codex-architecture init --answers <answers-file>`
- `codex-architecture refresh`
- `codex-architecture serve`
- `codex-architecture update --from-codex-summary <summary-file>`
- `codex-architecture doctor`
