# CodexScope

CodexScope is a Codex skill and local CLI for keeping a repository-level architecture and progress report beside the code it describes. It scans the current project, records redacted development summaries, and renders a static HTML report from generated state in `.codex-architecture/`.

For Chinese usage instructions, see [docs/usage.zh-CN.md](docs/usage.zh-CN.md).

## What It Does

- Initializes project-local architecture state from a short answers file.
- Updates feature, module, interface, risk, and verification records from redacted Codex summaries.
- Scans TypeScript and generic repository structure for reportable findings.
- Lets users triage scan findings as accepted, ignored, scanner limits, or resolved without overwriting confirmed state.
- Validates the generated state with `doctor`.
- Renders `.codex-architecture/report.html`.
- Optionally serves a local clickable viewer with a refresh button.

## When To Use It

Use CodexScope when you want a lightweight, local-first view of how a repository is evolving:

- after a Codex development session
- before a handoff or review
- while tracking modules, APIs, risks, and verification commands
- when you need a human-readable architecture snapshot without sending project data to a hosted service

CodexScope is intentionally project-local. It is not a hosted analytics product, a replacement for tests, or a source of truth for secrets, logs, or production telemetry.

## Safety Model

CodexScope writes generated state into `.codex-architecture/` in the target repository. Keep that state redacted.

Do not write any of the following to `answers.json`, summary files, `.codex-architecture/`, issues, pull requests, or support reports:

- secrets, tokens, cookies, or session values
- private keys
- environment variable values
- raw transcripts
- full tool output
- full logs
- proprietary data that should not be published

Prefer short summaries, file paths, command names, validation outcomes, and carefully redacted excerpts.

## Repository Layout

```text
bin/                     CLI entrypoint
src/                     TypeScript source for commands, scanning, state, and rendering
tests/                   Vitest test suite and fixtures
skills/codex-scope/      Codex skill instructions
docs/                    Usage guides and development planning notes
```

Generated files live in `.codex-architecture/` inside the repository being inspected.

## Quick Start

Clone and prepare the repository:

```bash
git clone https://github.com/Sam-Tian/codex-scope.git
cd codex-scope
npm install
npm run build
node ./bin/codex-scope.js --help
```

When using CodexScope from a source checkout, you can either run the bin path directly or link/install the package so `codex-scope` is available on your `PATH`.

## Codex Skill Usage

The bundled Codex skill is named `codex-scope`.

Use it when you want Codex to initialize, refresh, inspect, or update a repository architecture report. The skill keeps the workflow local and reminds Codex to avoid secrets, raw transcripts, private keys, environment values, and full logs in generated state.

Skill location:

```text
skills/codex-scope/SKILL.md
```

## CLI Commands

The package exposes the `codex-scope` command:

```bash
codex-scope init --answers answers.json
codex-scope doctor
codex-scope refresh
codex-scope update --from-codex-summary summary.json
codex-scope serve
```

Typical flow:

1. Create a redacted `answers.json`.
2. Run `codex-scope init --answers answers.json`.
3. Run `codex-scope doctor`.
4. Run `codex-scope refresh`.
5. Open `.codex-architecture/report.html`.

After development work, write a redacted summary JSON and run:

```bash
codex-scope update --from-codex-summary summary.json
codex-scope doctor
codex-scope refresh
```

The summary can also record scan-finding decisions:

```json
{
  "summary": "Triaged scanner findings",
  "findingUpdates": [
    {
      "id": "missing-in-status:POST:/v1/api-keys",
      "decision": "accepted",
      "reason": "Real API surface that should be added to status"
    }
  ]
}
```

`refresh` preserves these decisions across scans. Ignored and scanner-limit findings stay visible in the report but do not count as open findings.

## Generated Files

CodexScope creates and updates:

- `.codex-architecture/status.json` - current project architecture and progress state
- `.codex-architecture/events.jsonl` - append-only redacted update events
- `.codex-architecture/report.html` - static architecture and progress report

These files are generated project state. Review and redact before sharing them publicly.

## Development Commands

```bash
npm install
npm run build
npm run typecheck
npm test
```

`npm test` runs the Vitest suite. `npm run typecheck` runs TypeScript without emitting build output.

## Limitations

- Pre-1.0 project: state shape, report details, and scanner coverage may change.
- Scanner findings are advisory and should be confirmed by a maintainer.
- TypeScript/Node repository scanning is the current primary path; other stacks receive more generic structure reporting.
- Generated reports do not replace tests, security review, architecture review, or human judgment.
- The local viewer is a development convenience, not a production service.
- Proposed interface drafts are suggestions only; `refresh` never auto-adds them to confirmed `interfaces`.

## Roadmap

- Broader language and framework scanners.
- More precise module and interface relationship detection.
- Safer redaction helpers for generated summaries.
- Richer report views for long-running projects, including deeper grouping and search.
- Clearer import/export workflows for teams that want to review generated state.

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening issues or pull requests, and keep all examples and test fixtures redacted.

## Security

For vulnerability reporting and support expectations, see [SECURITY.md](SECURITY.md).

## License

CodexScope is released under the [MIT License](LICENSE).
