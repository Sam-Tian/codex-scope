# Codex Dynamic Architecture Usage

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
codex-architecture init --answers answers.json
codex-architecture doctor
codex-architecture refresh
```

Open `.codex-architecture/report.html`.

## Use The Clickable Viewer

Run:

```bash
codex-architecture serve
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
codex-architecture update --from-codex-summary summary.json
codex-architecture doctor
codex-architecture refresh
```

Do not include secrets, raw logs, environment variable values, private keys, or full transcripts in the answers or summary files.
