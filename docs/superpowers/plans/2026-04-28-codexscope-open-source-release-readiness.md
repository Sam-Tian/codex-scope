# CodexScope Open Source Release Readiness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prepare CodexScope for a GitHub open-source launch as an English-first Codex skill/plugin project.

**Architecture:** This is a release-readiness pass, not a runtime feature change. The work updates the repository's public entry points, community files, package metadata, ignore rules, and verification evidence while preserving the existing TypeScript CLI and Codex skill implementation.

**Tech Stack:** Markdown, npm package metadata, GitHub issue templates, TypeScript, Vitest.

---

## File Structure

- Modify `README.md`: replace the short stub with the public GitHub landing page.
- Create `LICENSE`: MIT License text.
- Create `CONTRIBUTING.md`: contributor setup, workflow, testing, safety, and PR guidance.
- Create `SECURITY.md`: supported version and sensitive-data/reporting guidance.
- Create `.github/ISSUE_TEMPLATE/bug_report.md`: structured bug report form.
- Create `.github/ISSUE_TEMPLATE/feature_request.md`: structured feature request form.
- Modify `.gitignore`: keep local/generated project state out of Git.
- Modify `package.json`: open-source metadata for a GitHub-first plugin repo.
- Verify `package-lock.json`: update only if npm commands change package metadata or lockfile shape.

## Task 1: Rewrite The README As The Public Landing Page

**Files:**
- Modify: `README.md`
- Read: `docs/usage.md`
- Read: `docs/usage.zh-CN.md`
- Read: `skills/dynamic-architecture/SKILL.md`
- Read: `.codex-plugin/plugin.json`

- [ ] **Step 1: Review the current public docs**

Run:

```bash
sed -n '1,240p' README.md
sed -n '1,260p' docs/usage.md
sed -n '1,220p' skills/dynamic-architecture/SKILL.md
sed -n '1,220p' .codex-plugin/plugin.json
```

Expected: `README.md` is short, while usage docs and the skill file contain the real command flow and safety constraints.

- [ ] **Step 2: Replace README.md with an English-first landing page**

Write `README.md` with this structure and content:

```markdown
# CodexScope

CodexScope is a Codex skill/plugin for generating a project-local dynamic architecture and progress supervision report.

It helps Codex users answer a simple question after rapid agentic development: what changed, which parts of the system are known, which interfaces were discovered, and what still needs confirmation?

## What It Does

- Initializes a `.codex-architecture/` state directory inside the repository you are supervising.
- Tracks features, modules, interfaces, flows, risks, evidence, and scan findings.
- Scans TypeScript/JavaScript Node projects for common HTTP routes and client calls.
- Renders a local HTML report at `.codex-architecture/report.html`.
- Provides a task-scoped local viewer with a refresh endpoint.
- Gives Codex a repeatable workflow for updating architecture state after development work.

## When To Use It

Use CodexScope when you want Codex to keep a lightweight, local supervision layer for a codebase:

- You are iterating quickly with Codex and want a readable architecture snapshot.
- You want a project-local record of confirmed features, modules, interfaces, and verification.
- You want scanner findings to be proposed as unconfirmed differences instead of silently overwriting known state.
- You want a skill that other Codex users can improve through scanner, report, and workflow contributions.

## Safety Model

CodexScope is designed for redacted project metadata, not raw operational data.

Do not store secrets, API tokens, cookies, private keys, environment variable values, raw transcripts, full command output, or unredacted logs in `.codex-architecture/`, answer files, summary files, issues, or pull requests.

The scanner may find code paths and route names. Treat generated state as project-local architecture metadata and review it before committing it in sensitive repositories.

## Repository Layout

```text
.codex-plugin/plugin.json          Codex plugin metadata
skills/dynamic-architecture/       Codex skill wrapper
bin/codex-architecture.js          CLI entry point
src/                              TypeScript CLI implementation
tests/                            Vitest test suite and fixtures
docs/usage.md                     English command reference
docs/usage.zh-CN.md               Chinese usage guide
docs/superpowers/                 Internal design and implementation history
```

## Quick Start From Source

```bash
git clone <this-repository-url>
cd CodexScope
npm install
npm run build
node ./bin/codex-architecture.js --help
```

When trying the CLI from another repository, run the built CLI from that target repository:

```bash
cd /path/to/your/project
node /path/to/CodexScope/bin/codex-architecture.js --help
```

## Codex Skill Usage

The plugin exposes the `dynamic-architecture` skill:

```yaml
name: dynamic-architecture
description: Generate, refresh, or update the project-local dynamic architecture supervision report for the current repository.
```

Typical Codex prompts:

- "Refresh this repository's architecture report."
- "Open the dynamic architecture viewer."
- "Update architecture status from this Codex work."

The skill guides Codex to:

1. Check whether `.codex-architecture/status.json` exists.
2. Initialize the project if needed.
3. Run `codex-architecture doctor`.
4. Run `codex-architecture refresh`.
5. Optionally run `codex-architecture serve` for a local clickable viewer.
6. Update state from a short redacted Codex summary after development work.

## CLI Commands

```bash
codex-architecture init --answers answers.json
codex-architecture doctor
codex-architecture refresh
codex-architecture serve
codex-architecture update --from-codex-summary summary.json
```

See [docs/usage.md](docs/usage.md) for full examples.

中文用户可阅读 [docs/usage.zh-CN.md](docs/usage.zh-CN.md)。

## Generated Project Files

CodexScope writes generated state into the repository being supervised:

```text
.codex-architecture/status.json    Confirmed project architecture and progress state
.codex-architecture/events.jsonl   Append-only redacted update summaries
.codex-architecture/report.html    Local HTML supervision report
```

In this plugin repository, `.codex-architecture/` is ignored. In target projects, decide whether to commit generated state based on your team's security and review policy.

## Development

```bash
npm install
npm run typecheck
npm test
npm run build
```

Useful release-readiness check:

```bash
npm pack --dry-run
```

## Current Limitations

- Scanner coverage is intentionally narrow in the first version.
- TypeScript/JavaScript Node route detection is regex-based and may miss dynamic routing patterns.
- Scanner findings are proposals. Confirm them before treating them as project truth.
- The local viewer is task-scoped and runs on `127.0.0.1`; it is not a persistent monitoring service.
- npm publishing automation is not part of the first open-source launch.

## Roadmap

Good contribution areas:

- More framework-aware scanners.
- Better OpenAPI and route metadata support.
- Richer evidence and verification linking.
- Safer workflows for redacted summaries.
- Report usability improvements.
- More examples from real project shapes.

## Contributing

Contributions are welcome. Start with [CONTRIBUTING.md](CONTRIBUTING.md), keep changes focused, and include tests when changing scanner, state, CLI, or rendering behavior.

Please keep all examples and fixtures free of secrets, private keys, tokens, raw logs, and raw transcripts.

## License

MIT. See [LICENSE](LICENSE).
```

- [ ] **Step 3: Check README links and claims**

Run:

```bash
rg -n "this-repository-url|TODO|TBD|npm publishing automation|docs/usage|docs/usage.zh-CN|CONTRIBUTING|LICENSE" README.md
```

Expected: The only placeholder-like text is `<this-repository-url>`, intentionally used because the GitHub URL is not known locally. There are no `TODO` or `TBD` markers.

- [ ] **Step 4: Commit README change**

Run:

```bash
git add README.md
git commit -m "docs: rewrite README for open source launch"
```

Expected: Commit succeeds with only `README.md` staged.

## Task 2: Add Community And Safety Files

**Files:**
- Create: `LICENSE`
- Create: `CONTRIBUTING.md`
- Create: `SECURITY.md`

- [ ] **Step 1: Create LICENSE**

Create `LICENSE` with the MIT License:

```text
MIT License

Copyright (c) 2026 Jarvis

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

- [ ] **Step 2: Create CONTRIBUTING.md**

Create `CONTRIBUTING.md`:

```markdown
# Contributing

Thanks for helping improve CodexScope.

CodexScope is a Codex skill/plugin plus local CLI for project architecture supervision. The best contributions keep the skill useful, local-first, and safe for real repositories.

## Local Setup

```bash
npm install
npm run build
npm run typecheck
npm test
```

## Useful Commands

```bash
node ./bin/codex-architecture.js --help
npm pack --dry-run
```

To test the CLI against a fixture or another repository, run the built CLI from that target repository.

## Contribution Areas

- Skill workflow improvements in `skills/dynamic-architecture/SKILL.md`.
- Scanner support in `src/scan/`.
- State validation and progress handling in `src/state/`.
- Scan finding logic in `src/findings/`.
- Report rendering in `src/render/`.
- CLI behavior in `src/commands/` and `src/cli.ts`.
- Docs and examples in `README.md` and `docs/`.

## Safety Rules

Do not include secrets, API tokens, cookies, private keys, environment variable values, raw transcripts, full command output, or unredacted logs in examples, fixtures, issues, pull requests, or `.codex-architecture/` state.

Use short redacted examples. Prefer fake route names, fake project names, and minimal fixtures.

## Testing Expectations

- Documentation-only changes should be checked for accurate links and commands.
- Changes to TypeScript source should run `npm run typecheck` and `npm test`.
- Changes to package metadata should run `npm pack --dry-run`.
- Scanner changes should include focused fixture coverage.
- Report rendering changes should include tests in `tests/render/`.

## Pull Request Checklist

- The change has a focused purpose.
- Tests or docs were updated when behavior changed.
- No sensitive data was added.
- Generated local directories such as `node_modules/`, `dist/`, `.superpowers/`, and `.codex-architecture/` are not committed.
- The PR description lists verification commands and results.
```

- [ ] **Step 3: Create SECURITY.md**

Create `SECURITY.md`:

```markdown
# Security Policy

## Supported Versions

CodexScope is currently pre-1.0. Security fixes are handled on the default branch unless a stable release branch is published later.

## Sensitive Data

Do not share secrets, API tokens, cookies, private keys, environment variable values, raw transcripts, full command output, or unredacted logs in public issues, pull requests, fixtures, screenshots, or `.codex-architecture/` examples.

CodexScope stores architecture metadata and redacted progress summaries. Review generated `.codex-architecture/` files before committing them in private or sensitive projects.

## Reporting A Vulnerability

If the repository has GitHub private vulnerability reporting enabled, use that channel.

If private reporting is not available, open a minimal public issue that describes the affected area without including exploit details or sensitive data. The maintainer can then arrange a private follow-up channel.
```

- [ ] **Step 4: Verify community files avoid placeholders**

Run:

```bash
rg -n "TODO|TBD|your-email|example.com|token|password|private key" LICENSE CONTRIBUTING.md SECURITY.md
```

Expected: Matches for sensitive words are only in safety warnings, not actual credentials or placeholder contacts.

- [ ] **Step 5: Commit community files**

Run:

```bash
git add LICENSE CONTRIBUTING.md SECURITY.md
git commit -m "docs: add community and security guidance"
```

Expected: Commit succeeds with only the three community files staged.

## Task 3: Add GitHub Issue Templates

**Files:**
- Create: `.github/ISSUE_TEMPLATE/bug_report.md`
- Create: `.github/ISSUE_TEMPLATE/feature_request.md`

- [ ] **Step 1: Create the issue template directory**

Run:

```bash
mkdir -p .github/ISSUE_TEMPLATE
```

Expected: Directory exists and no tracked files are changed yet.

- [ ] **Step 2: Create bug_report.md**

Create `.github/ISSUE_TEMPLATE/bug_report.md`:

```markdown
---
name: Bug report
about: Report a reproducible CodexScope problem
title: "[Bug]: "
labels: bug
assignees: ""
---

## Summary

Describe the problem in one or two sentences.

## Environment

- OS:
- Node.js version:
- npm version:
- CodexScope commit or version:
- Target project type:

## Steps To Reproduce

1. Run:
2. Observe:

## Expected Behavior

Describe what should have happened.

## Actual Behavior

Describe what happened instead.

## Verification

Paste short, redacted command results only. Do not include secrets, tokens, cookies, private keys, environment values, raw transcripts, or full logs.

## Extra Context

Add links to minimal public fixtures or redacted examples when useful.
```

- [ ] **Step 3: Create feature_request.md**

Create `.github/ISSUE_TEMPLATE/feature_request.md`:

```markdown
---
name: Feature request
about: Suggest an improvement for the skill, CLI, scanner, or report
title: "[Feature]: "
labels: enhancement
assignees: ""
---

## Problem

What project supervision problem would this solve?

## Proposed Solution

Describe the smallest useful version of the change.

## Area

- [ ] Codex skill workflow
- [ ] CLI command
- [ ] Scanner
- [ ] State model
- [ ] Report UI
- [ ] Documentation
- [ ] Other

## Example

Use a short redacted example. Do not include secrets, tokens, cookies, private keys, environment values, raw transcripts, or full logs.

## Acceptance Criteria

- [ ] The behavior is documented.
- [ ] The change can be tested or manually verified.
- [ ] Sensitive data handling remains explicit.
```

- [ ] **Step 4: Verify templates**

Run:

```bash
rg -n "TODO|TBD|secret|token|private key|raw transcripts" .github/ISSUE_TEMPLATE
```

Expected: Matches are only safety guidance; there are no unfinished placeholders.

- [ ] **Step 5: Commit issue templates**

Run:

```bash
git add .github/ISSUE_TEMPLATE/bug_report.md .github/ISSUE_TEMPLATE/feature_request.md
git commit -m "docs: add GitHub issue templates"
```

Expected: Commit succeeds with only issue templates staged.

## Task 4: Update Open Source Metadata And Ignore Rules

**Files:**
- Modify: `package.json`
- Modify: `.gitignore`
- Verify: `package-lock.json`

- [ ] **Step 1: Inspect current metadata**

Run:

```bash
sed -n '1,220p' package.json
sed -n '1,120p' .gitignore
```

Expected: `package.json` has `private: true` and no license field. `.gitignore` does not yet include `.codex-architecture/`.

- [ ] **Step 2: Update package.json**

Replace `package.json` with:

```json
{
  "name": "codex-dynamic-architecture-plugin",
  "version": "0.1.0",
  "description": "Codex skill and plugin for project-local dynamic architecture and progress supervision.",
  "license": "MIT",
  "type": "module",
  "bin": {
    "codex-architecture": "./bin/codex-architecture.js"
  },
  "keywords": [
    "codex",
    "codex-skill",
    "codex-plugin",
    "architecture",
    "project-supervision",
    "agentic-development"
  ],
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc -p tsconfig.json --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@types/node": "^20.12.12",
    "tsx": "^4.19.3",
    "typescript": "^5.6.3",
    "vitest": "^2.1.9"
  }
}
```

- [ ] **Step 3: Update .gitignore**

Replace `.gitignore` with:

```gitignore
.superpowers/
.codex-architecture/
node_modules/
dist/
```

- [ ] **Step 4: Refresh lockfile metadata if needed**

Run:

```bash
npm install --package-lock-only
```

Expected: `package-lock.json` updates package metadata if npm decides it is needed. No dependency versions should change unless npm normalizes existing lock data.

- [ ] **Step 5: Inspect metadata diff**

Run:

```bash
git diff -- package.json package-lock.json .gitignore
```

Expected: Diff shows open-source metadata, removal of `private: true`, MIT license, improved keywords, `.codex-architecture/` ignored, and no guessed repository URL.

- [ ] **Step 6: Commit metadata and ignore updates**

Run:

```bash
git add package.json package-lock.json .gitignore
git commit -m "chore: prepare package metadata for open source"
```

Expected: Commit succeeds with only metadata and ignore files staged.

## Task 5: Verify Release Readiness

**Files:**
- Read: all tracked files through Git and npm commands.
- Modify: only if verification exposes a direct release blocker.

- [ ] **Step 1: Install dependencies if missing**

Run:

```bash
npm install
```

Expected: `node_modules/.bin/tsc` and `node_modules/.bin/vitest` exist after install. If network access is blocked, request approval through the sandbox escalation flow before retrying.

- [ ] **Step 2: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: Exit code `0`.

- [ ] **Step 3: Run tests**

Run:

```bash
npm test
```

Expected: Exit code `0`.

- [ ] **Step 4: Build CLI**

Run:

```bash
npm run build
```

Expected: Exit code `0` and `dist/` generated locally.

- [ ] **Step 5: Inspect package contents**

Run:

```bash
npm pack --dry-run
```

Expected: Output includes public source, docs, skill files, plugin manifest, license, README, and package metadata. It should not include `node_modules/`, `.superpowers/`, `.codex-architecture/`, or `.git/`.

- [ ] **Step 6: Review tracked files**

Run:

```bash
git ls-files
git status --short
git status --ignored --short
```

Expected: `git ls-files` lists source, tests, docs, community files, and plugin files. `git status --short` only shows intentional uncommitted changes if any remain. Ignored local directories include `node_modules/`, `dist/`, `.superpowers/`, and any `.codex-architecture/` directory if present.

- [ ] **Step 7: Commit any verification fix**

If a direct release blocker was fixed, run:

```bash
git add <fixed-files>
git commit -m "fix: resolve release readiness blocker"
```

Expected: Commit is skipped if no fixes were needed.

## Task 6: Final Launch Report

**Files:**
- Read: `git status --short`
- Read: `git status --ignored --short`
- Read: latest verification command outputs

- [ ] **Step 1: Prepare final summary**

Summarize:

```text
Changed:
- README rewritten for English-first GitHub launch.
- MIT license and community guidance added.
- GitHub issue templates added.
- package.json metadata opened for community use.
- .codex-architecture/ ignored for this plugin repo.

Verified:
- npm install
- npm run typecheck
- npm test
- npm run build
- npm pack --dry-run

Upload to GitHub:
- All tracked source, tests, docs, skill, plugin, license, and community files.

Keep out of GitHub:
- node_modules/
- dist/
- .superpowers/
- .codex-architecture/
```

- [ ] **Step 2: Decide whether durable memory is needed**

If this release-readiness workflow produces a reusable, non-sensitive pattern, save a short redacted summary to the local memory system. Do not store raw command output, raw transcripts, secrets, or full logs.

- [ ] **Step 3: Report external tool status**

Report whether any task-scoped local servers were started. Expected for this plan: no local server should be started; npm and git commands are one-shot tools and do not require cleanup.
