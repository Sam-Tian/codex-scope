# Codex Dynamic Architecture Plugin Design

## Purpose

Build a Codex plugin that can be called on demand inside the current repository to generate a dynamic project architecture supervision page. The tool helps the user monitor Codex-built projects by answering:

- What has been developed, and how complete is it?
- Which features, modules, and interfaces exist?
- Which programs call each interface?
- How does traffic move through the system?
- Which gaps, blockers, and unverified areas still remain?

The first version targets one current project at a time. It does not build a multi-project control center yet.

## Chosen Approach

Use a Codex plugin entry point backed by a local CLI engine.

The Codex plugin owns the user workflow: initialization, invocation, explanation of findings, and reminders to update project state after development tasks.

The CLI owns deterministic work: scanning the repository, validating project state files, calculating differences, and rendering the local HTML report.

This keeps the tool convenient to call from Codex while still making the core behavior testable and reusable.

## User Experience

The user calls the plugin from inside a repository, for example by asking Codex to invoke the dynamic architecture plugin.

If the project has not been initialized, the plugin starts an interactive initialization flow. It asks for the project goal, core features, and current phase, then combines those answers with a code scan to generate the first status file.

After initialization, the normal flow is:

1. Codex or the user calls the plugin.
2. The plugin calls the CLI for the current repository.
3. The CLI scans the repository and reads `.codex-architecture/status.json`.
4. The CLI generates scan findings, progress summaries, and `.codex-architecture/report.html`.
5. The plugin opens or points the user to the HTML report.

The HTML report has a manual refresh affordance. When the plugin opens the report through a task-scoped local viewer server, the refresh button calls the CLI refresh flow. When the report is opened as a static file, the refresh control shows the exact `codex-architecture refresh` command to run. First version refresh is explicit, not automatic background monitoring.

## First Screen Layout

The HTML report uses an architecture-first layout:

- Left sidebar: project phase, total progress, feature count, interface count, blocker count, and graph legend.
- Center: dynamic architecture topology with module nodes, traffic arrows, and status coloring.
- Right panel: details for the selected module, feature, interface, or flow.

Status colors:

- Green: complete or stable.
- Yellow: in progress or needs verification.
- Red: blocked, risky, or inconsistent with scan findings.
- Gray: unknown, not started, or low-confidence.

Clicking a module or interface updates the right panel. The default panel shows function explanation, development status, completion percentage, and blockers. Deeper information is available in collapsed sections: callers, callees, traffic flow, evidence files, recent changes, and test coverage.

The refresh control has two modes:

- Served mode: the report is opened through the plugin's task-scoped local viewer server, and the button calls a local refresh endpoint that reruns `codex-architecture refresh`.
- Static mode: the report is opened directly from disk, and the control displays the command the user or Codex should run.

## Project State Directory

Each monitored repository contains a project-local directory:

```text
.codex-architecture/
  status.json
  events.jsonl
  report.html
```

These files must enter git for the first version. They become part of the project record so progress and architecture state can evolve with code versions.

The tool must not store secrets, environment variable values, private keys, raw transcripts, full command output, or large unredacted logs in these files.

## State Model

`status.json` is the primary source of confirmed project state. It uses a mixed progress model:

- `project`: name, goal, current phase, source path, and timestamps.
- `features`: the main progress line. Each feature includes purpose, status, percent complete, acceptance criteria, owning modules, related interfaces, risks, and evidence.
- `modules`: architecture nodes such as frontend, API, worker, database, admin, and external providers.
- `interfaces`: API endpoints or integration surfaces, including method, path/name, purpose, callers, callees, owning feature, test status, and evidence.
- `flows`: traffic paths from entry points to services, data stores, and external systems.
- `risks`: blockers, launch gaps, missing verification, and unresolved architecture concerns.
- `evidence`: code paths, test paths, document paths, and relevant commit references.
- `scanFindings`: unconfirmed differences discovered by repository scanning.

`events.jsonl` is an append-only development journal. Codex appends one structured event after each development task, covering what changed, which features/modules/interfaces were affected, what was verified, and what risks changed.

## Progress Calculation

Feature progress is the main user-facing completion model.

Module and interface status provide evidence and explain why a feature is marked complete, in progress, blocked, or unverified.

The report can show an overall progress percentage, but it must expose its basis. The first-version default is an equal-weight average across active features. A feature may define an optional `weight`; when any active feature defines `weight`, the report uses weighted average and displays the weights. Module and interface status remain supporting evidence rather than hidden progress math.

The tool should prefer explicit status in `status.json` over pure static inference. Static scan findings can challenge or enrich the status, but should not silently replace confirmed project state.

## Repository Scanning

The scanner has a generic foundation and TypeScript/Node depth first.

Generic scan:

- Repository metadata and common docs.
- Directory structure.
- Test files.
- OpenAPI or API description files when present.
- Common source and route-like filenames.

TypeScript/Node adapter:

- `package.json` scripts and workspaces.
- Route definitions in common frameworks.
- Frontend calls through `fetch`, `axios`, and similar HTTP clients.
- API handlers, service modules, and test files.
- Next.js, Express/Nest-style, and common monorepo conventions as best-effort static hints. Missed detection is a low-confidence finding, not a fatal scan failure.

Go and Python are not deep first-version targets, but the scanner design reserves adapter boundaries for future language support.

## Conflict Handling

Static scan results and confirmed state can disagree. Examples:

- Code contains a route that is not in `status.json`.
- `status.json` lists an interface that no longer appears in code.
- An interface is marked tested, but no matching test evidence is found.
- A feature says complete, but one of its required interfaces is blocked.

First version behavior:

1. Do not automatically overwrite confirmed state.
2. Record differences under `scanFindings`.
3. Highlight affected nodes or interfaces in red or warning state.
4. Generate a clear correction proposal.
5. Wait for user or Codex confirmation before updating `status.json`.

## CLI Commands

`codex-architecture init`

Initializes the current repository. It runs an interactive project setup, scans the repository, creates a status draft, and writes confirmed state after approval.

`codex-architecture refresh`

Reads `status.json`, scans the repository, updates `scanFindings`, and renders `report.html`.

`codex-architecture serve`

Starts a task-scoped local viewer for the current repository. It serves `report.html` and exposes a local refresh endpoint used by the page refresh button. It is not a persistent background monitor and should be stopped when no longer needed.

`codex-architecture update --from-codex-summary <file>`

Converts a Codex development summary into structured updates for features, modules, interfaces, flows, risks, and `events.jsonl`.

`codex-architecture doctor`

Validates state file format, required fields, scan adapter availability, and HTML renderability. It reports concrete field paths and repair suggestions.

## Codex Plugin Responsibilities

The plugin should:

- Detect whether the current repository has `.codex-architecture/status.json`.
- Start initialization when the project has no status file.
- Call the CLI for refresh, doctor, and post-development updates.
- Explain scan findings in human terms.
- Remind Codex to update project state after development tasks.
- Keep all status updates concise, structured, and redacted.

The plugin should not:

- Store secrets or raw logs.
- Auto-overwrite confirmed state during scan conflicts.
- Turn first version into a multi-project dashboard.
- Start a persistent background monitor.
- Claim progress from code scanning alone when the status file is missing.

## Error Handling

- No git repository: still generate a local report, but mark version tracking unavailable.
- No `status.json`: enter initialization rather than generating a formal guessed report.
- Scanner failure: preserve current state and show the scanner error in the report.
- Invalid status file: `doctor` reports field-level errors and repair suggestions.
- State/scan conflict: record and display `scanFindings`, but wait for confirmation before changing confirmed state.
- HTML refresh failure: preserve the last rendered report and show the failure reason.

## Testing Strategy

Unit tests:

- State schema validation.
- Progress calculation.
- Scan finding normalization.
- Merge behavior between confirmed state and scan findings.
- Conflict proposal generation.

Fixture tests:

- Small TypeScript/Node project with route definitions.
- Frontend calls using `fetch` and `axios`.
- Test files that prove or fail interface coverage.
- README and docs that provide project context.

HTML tests:

- Report renders project summary, module graph, interface details, risks, and findings.
- Refresh button is present.
- Detail panel updates when a node or interface is selected.
- Missing or conflicting state is visibly marked.

Workflow tests:

- First initialization.
- Development summary update.
- Refresh after code changes.
- Conflict detection and correction proposal.
- Doctor on malformed status files.

Manual acceptance:

- Run the plugin in one real repository.
- Generate `.codex-architecture/status.json`, `events.jsonl`, and `report.html`.
- Open `report.html` and confirm the first screen answers current phase, progress, architecture flow, interface callers, blockers, and evidence paths.

## Explicit Non-Goals For First Version

- Multi-project control center.
- Persistent background service.
- Automatic file watching.
- Automatic overwrite of confirmed state.
- Deep support for every programming language.
- Secret collection, raw transcript storage, or full command-output archiving.
- Production dependency installation without user approval.

## Success Criteria

The first version is successful when the user can call the Codex plugin inside a repository and get a local HTML report that clearly shows:

- The current project phase and completion state.
- A central architecture topology with traffic flow.
- Feature progress as the main project progress model.
- Modules and interfaces as drill-down evidence.
- Interface purpose, callers, callees, and test status.
- Scan/status disagreements as correction proposals.
- A durable project-local status record that Codex updates after development tasks.
