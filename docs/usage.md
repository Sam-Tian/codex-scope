# CodexScope Usage

## Run From This Repository

From a source checkout, install dependencies and build the CLI first:

```bash
npm install
npm run build
node ./bin/codex-scope.js --help
```

The examples below use `codex-scope`. When developing this repository locally, replace it with `node /path/to/codex-scope/bin/codex-scope.js` or link/install the package so the command is on your PATH.

## Initialize A Repository

Create an answers file:

```json
{
  "projectId": "my-project",
  "projectName": "My Project",
  "goal": "Track project architecture and Codex development progress",
  "phase": "build",
  "features": ["Authentication", "Admin console", "Billing"]
}
```

Run:

```bash
codex-scope init --answers answers.json
codex-scope doctor
codex-scope refresh
```

Open `.codex-architecture/report.html`.

## Use The Clickable Viewer

Run:

```bash
codex-scope serve
```

Open the printed local URL. The page refresh button works in served mode.

The viewer is a task-scoped local server. Stop it when you no longer need the live refresh button, unless you intentionally want it left running for follow-up work.

## Update After Codex Development

Create a redacted summary JSON file:

```json
{
  "summary": "Implemented API key creation",
  "featureUpdates": [{ "id": "api-keys", "status": "in_progress", "percent": 70 }],
  "moduleUpdates": [{ "id": "api", "name": "API", "kind": "backend", "status": "in_progress", "percent": 70 }],
  "interfaceUpdates": [
    {
      "id": "POST:/v1/api-keys",
      "name": "Create API key",
      "method": "POST",
      "path": "/v1/api-keys",
      "purpose": "Create API key"
    }
  ],
  "verification": ["npm test"]
}
```

Run:

```bash
codex-scope update --from-codex-summary summary.json
codex-scope doctor
codex-scope refresh
```

Do not include secrets, raw logs, environment variable values, private keys, or raw transcripts in the answers or summary files.

## Triage Scan Findings

`codex-scope refresh` keeps scanner findings advisory. In v0.2, each finding has a triage state:

- `open` - needs review.
- `accepted` - the finding is real and should be reflected in project state.
- `ignored` - the finding is intentionally not part of the project architecture record.
- `scanner_limit` - the finding reflects scanner coverage limits rather than project drift.
- `resolved` - a previously triaged finding no longer appears in the latest scan.

Use `findingUpdates` in the same redacted summary file to record decisions:

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

Run `codex-scope update --from-codex-summary summary.json`, then `codex-scope refresh`. Ignored and scanner-limit findings remain visible in the report, but they are excluded from the default open finding count.

For `missing_in_status` route or OpenAPI findings, the report includes a proposed interface draft. Treat it as a copyable starting point, not an automatic edit to `interfaces`.

## Configure Scanner Ignores

Create `.codex-architecture/config.json` when a project has generated or legacy paths that should not be scanned:

```json
{
  "scan": {
    "ignoreDirs": ["fixtures"],
    "ignorePathPrefixes": ["apps/legacy-api/"]
  }
}
```

These settings are additive. CodexScope always ignores common generated and dependency folders such as `.worktrees`, `.turbo`, `.pnpm-store`, `test-results`, `.codex-architecture`, `coverage`, `.next`, `build`, `dist`, `node_modules`, and `.git`.
