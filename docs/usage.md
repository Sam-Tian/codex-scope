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
