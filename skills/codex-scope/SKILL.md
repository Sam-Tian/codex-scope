---
name: codex-scope
description: Generate, refresh, or update the project-local dynamic architecture supervision report for the current repository.
---

# CodexScope Supervision

Use this skill when the user asks to inspect project progress, generate a dynamic architecture graph, refresh project architecture status, or update the architecture report after Codex development work.

## Rules

- Work in the current repository only.
- Never store secrets, environment variable values, raw transcripts, private keys, or full command output in `.codex-architecture/`.
- Do not overwrite confirmed `status.json` facts when scanner findings disagree with the state file.
- Use `scanFindings` for unconfirmed differences and explain correction proposals to the user.
- Use `findingUpdates` to record explicit decisions when the user confirms a finding is accepted, ignored, or a scanner limitation.
- Prefer concise, redacted development summaries.

## Normal Flow

1. If `.codex-architecture/status.json` is missing, initialize the project:
   - Ask for project name, goal, phase, and core features.
   - Save answers to a short-lived, redacted temporary JSON file.
   - Run `codex-scope init --answers <answers-file>`.
   - Run `codex-scope doctor`.
2. If `status.json` already exists, run `codex-scope doctor` before changing or refreshing state.
3. Run `codex-scope refresh`.
4. If the user wants a clickable report with a working refresh button, run `codex-scope serve`.
   - Treat the viewer as a task-scoped local server.
   - Track whether it should be stopped or intentionally left running.
5. Give the user the report path or local viewer URL.

## After Codex Development Work

1. Write a short redacted JSON summary file with:
   - `summary`
   - `featureUpdates`
   - `moduleUpdates`
   - `interfaceUpdates`
   - optional `findingUpdates`
   - `verification`
2. Run `codex-scope update --from-codex-summary <summary-file>`.
3. Remove short-lived answer or summary files when they are no longer needed.
4. Run `codex-scope doctor`.
5. Run `codex-scope refresh`.
6. Report what changed and whether any scan findings need confirmation.

## Finding Triage

When a user reviews scanner findings, record decisions in the summary JSON instead of editing generated findings by hand:

```json
{
  "summary": "Triaged scanner findings",
  "findingUpdates": [
    {
      "id": "missing-in-status:POST:/v1/api-keys",
      "decision": "accepted",
      "reason": "Real API surface that should be added to status"
    },
    {
      "id": "missing-call-in-status:POST:/emails",
      "decision": "ignored",
      "reason": "External provider call, not a project-owned interface"
    }
  ]
}
```

Allowed decisions are `accepted`, `ignored`, and `scanner_limit`. After `refresh`, ignored and scanner-limit findings remain visible but do not count as open findings. If a triaged finding disappears, CodexScope marks that decision as resolved.

## Commands

- `codex-scope init --answers <answers-file>`
- `codex-scope refresh`
- `codex-scope serve`
- `codex-scope update --from-codex-summary <summary-file>`
- `codex-scope doctor`
