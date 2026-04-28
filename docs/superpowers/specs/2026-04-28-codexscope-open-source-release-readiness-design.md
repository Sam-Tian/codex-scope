# CodexScope Open Source Release Readiness Design

## Goal

Prepare CodexScope for a GitHub open-source launch as a Codex skill/plugin project. The release should help Codex users understand, install, run, and improve the Dynamic Architecture skill without reading the whole implementation first.

The project remains GitHub-first and skill/plugin-first. The CLI is documented as the local execution engine and advanced usage path, not as the main public identity of the repository.

## Audience

- Codex users who want a reusable project-local architecture and progress supervision skill.
- Codex skill/plugin authors who want to improve scanner coverage, report rendering, and workflow ergonomics.
- Contributors who need clear setup, test, safety, and contribution boundaries before opening pull requests.

## Public Positioning

The README should lead with the problem this project solves: Codex can change code quickly, but project owners still need a lightweight way to supervise architecture, progress, interfaces, scan findings, risks, and verification evidence.

The public description should emphasize that the plugin writes project-local `.codex-architecture/` state into the target repository, keeps generated data redacted, and avoids storing secrets, raw logs, environment values, private keys, or raw transcripts.

The README should be English-first. Chinese users should be directed to `docs/usage.zh-CN.md`.

## Documentation Scope

### README.md

Rewrite `README.md` as the main GitHub landing page. It should include:

- Short project summary and value proposition.
- What the skill/plugin does.
- When to use it.
- Quick start from a source checkout.
- Codex skill/plugin usage path.
- CLI command reference for `init`, `doctor`, `refresh`, `serve`, and `update`.
- Description of generated `.codex-architecture/` files.
- Safety and privacy rules.
- Current limitations.
- Roadmap and contribution invitation.
- Links to English and Chinese usage docs.

The README should not push users into internal implementation plans as the main path.

### Usage Docs

Keep `docs/usage.md` and `docs/usage.zh-CN.md`. They remain command-focused references linked from the README.

### Community Files

Add:

- `LICENSE` with the MIT License.
- `CONTRIBUTING.md` with setup, test, contribution, safety, and pull request guidance.
- `SECURITY.md` with security reporting and data-handling expectations.
- `.github/ISSUE_TEMPLATE/bug_report.md` and `.github/ISSUE_TEMPLATE/feature_request.md` to make community feedback easier to triage.

### Internal Design History

Keep `docs/superpowers/specs/` and `docs/superpowers/plans/` tracked as project history, but do not feature them in the README's primary user journey.

## Repository Hygiene

Before launch, inspect tracked and ignored files:

- `git ls-files`
- `git status --ignored --short`

Keep generated and local-only directories ignored:

- `.superpowers/`
- `node_modules/`
- `dist/`
- `.codex-architecture/`

Do not delete tracked source, tests, docs, or internal design history unless a specific file is clearly unrelated to the public project.

## Package Metadata

Update `package.json` so it reflects an open-source GitHub project:

- Add `license: "MIT"`.
- Remove `private: true` if the project should be packable for future distribution.
- Add or improve description and keywords for Codex skill/plugin discovery.
- Add repository, bugs, and homepage fields only when the target GitHub repository URL is known. If the URL is not known during implementation, leave placeholders out rather than guessing.

Use `npm pack --dry-run` as a package-content check even though the first launch is GitHub-first.

## Implementation Boundaries

This release-readiness pass should not change runtime behavior unless a verification or packaging check exposes a direct release blocker. The intended changes are documentation, metadata, GitHub community files, and ignore rules.

Runtime source changes, scanner expansions, report redesign, npm publishing automation, and plugin schema changes are out of scope for this pass.

## Verification

Run the narrowest checks that prove the release preparation did not break the project:

- `npm install` if dependencies are missing.
- `npm run typecheck`.
- `npm test`.
- `npm pack --dry-run`.
- Final `git status --short` and `git status --ignored --short` review.

If dependency installation requires network access, request approval through the normal sandbox escalation flow.

## Acceptance Criteria

The work is ready when:

- A new GitHub visitor can understand what CodexScope does from `README.md` alone.
- A Codex user can install or run the skill/plugin from the documented path.
- Contributors know how to set up the repo, run checks, and propose improvements.
- Security and privacy boundaries are explicit.
- Generated/local-only files are ignored.
- Verification commands either pass or have a concrete environment blocker recorded.
- The final report lists which files should be uploaded and which local files should stay out of GitHub.
