# Contributing To CodexScope

Thanks for helping improve CodexScope. This project is pre-1.0, so small, well-scoped changes with clear verification are easiest to review.

## Setup

```bash
git clone https://github.com/Sam-Tian/codex-scope.git
cd codex-scope
npm install
npm run build
```

## Development

Use the narrowest command that proves your change:

```bash
npm run typecheck
npm test
```

For CLI behavior changes, add or update tests under `tests/`. For documentation-only changes, prefer link, spelling, or formatting checks instead of adding unrelated tests.

## Pull Requests

- Keep changes focused on one purpose.
- Explain the user-facing behavior or documentation impact.
- Include verification commands and results.
- Update documentation when commands, generated files, or safety guidance change.
- Avoid unrelated refactors.

## Redaction Rules

Do not include any of the following in issues, pull requests, fixtures, screenshots, generated `.codex-architecture/` files, examples, or documentation:

- secrets
- tokens
- cookies
- private keys
- environment variable values
- raw transcripts
- full tool output
- full logs

Use short, redacted summaries instead. When an example needs realistic shape, replace sensitive values with placeholders such as `REDACTED`, `example-token`, or `example.local`.

## Generated State

CodexScope writes generated state under `.codex-architecture/`. Before sharing generated state, inspect it for sensitive data and remove anything that should not leave your machine or organization.
