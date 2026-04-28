# Codex Dynamic Architecture Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Codex plugin plus local CLI that generates and refreshes a project-local dynamic architecture supervision report for the current repository.

**Architecture:** The Codex plugin is a skill wrapper that invokes a zero-runtime-dependency TypeScript CLI. The CLI validates `.codex-architecture/status.json`, scans the current repository, creates scan findings, calculates feature progress, renders `.codex-architecture/report.html`, and can serve it through a task-scoped local viewer with a working refresh endpoint. Static HTML mode shows the exact refresh command instead of trying to execute local commands from the browser.

**Tech Stack:** Node.js 20+, TypeScript, Vitest, `tsx` for development execution, Node standard library only at runtime.

---

## File Structure

- Create `.codex-plugin/plugin.json`: Codex plugin metadata.
- Create `skills/dynamic-architecture/SKILL.md`: plugin entrypoint instructions for Codex.
- Create `package.json`: npm scripts, CLI bin, dev dependencies.
- Create `tsconfig.json`: TypeScript compiler config.
- Create `vitest.config.ts`: Vitest config.
- Create `bin/codex-architecture.js`: executable wrapper for built CLI.
- Create `src/cli.ts`: argument parsing and command dispatch.
- Create `src/commands/init.ts`: project initialization command.
- Create `src/commands/refresh.ts`: scan, merge, and report render command.
- Create `src/commands/update.ts`: apply Codex development summary to state.
- Create `src/commands/doctor.ts`: state and environment checks.
- Create `src/commands/serve.ts`: task-scoped local viewer server.
- Create `src/state/types.ts`: shared status, feature, module, interface, flow, risk, evidence, and event types.
- Create `src/state/validate.ts`: explicit status validation with field-path errors.
- Create `src/state/progress.ts`: equal-weight and optional weighted feature progress.
- Create `src/state/events.ts`: append-only JSONL event writer.
- Create `src/state/io.ts`: read/write helpers for `.codex-architecture`.
- Create `src/scan/types.ts`: scanner result types.
- Create `src/scan/generic.ts`: repository metadata, docs, tests, OpenAPI, and source-file scan.
- Create `src/scan/typescript-node.ts`: TypeScript/Node route and HTTP client detection.
- Create `src/scan/index.ts`: scanner orchestration.
- Create `src/findings/diff.ts`: compare confirmed state with scan candidates.
- Create `src/render/report.ts`: render static HTML with embedded data, CSS, and client-side detail panel.
- Create `src/render/html.ts`: HTML escaping and JSON embedding helpers.
- Create `src/utils/fs.ts`: safe filesystem helpers.
- Create `src/utils/json.ts`: JSON parse/stringify helpers with useful errors.
- Create `tests/fixtures/ts-node-app/...`: small fixture app.
- Create `tests/state/*.test.ts`: state and progress tests.
- Create `tests/scan/*.test.ts`: scanner tests.
- Create `tests/findings/*.test.ts`: conflict proposal tests.
- Create `tests/render/*.test.ts`: report rendering tests.
- Create `tests/commands/*.test.ts`: command behavior tests.
- Create `tests/integration/workflow.test.ts`: init/update/refresh/doctor flow.
- Create `docs/usage.md`: local user instructions.

## Task 1: Scaffold the TypeScript CLI Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `bin/codex-architecture.js`
- Create: `src/cli.ts`
- Create: `tests/commands/cli.test.ts`

- [ ] **Step 1: Write the CLI help test**

Create `tests/commands/cli.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { runCli } from "../../src/cli";

describe("runCli", () => {
  it("prints help for --help", async () => {
    const output: string[] = [];
    const result = await runCli(["--help"], {
      cwd: process.cwd(),
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line),
    });

    expect(result.exitCode).toBe(0);
    expect(output.join("\n")).toContain("codex-architecture init");
    expect(output.join("\n")).toContain("codex-architecture refresh");
    expect(output.join("\n")).toContain("codex-architecture serve");
  });

  it("rejects unknown commands", async () => {
    const errors: string[] = [];
    const result = await runCli(["wat"], {
      cwd: process.cwd(),
      stdout: () => undefined,
      stderr: (line) => errors.push(line),
    });

    expect(result.exitCode).toBe(1);
    expect(errors.join("\n")).toContain("Unknown command: wat");
  });
});
```

- [ ] **Step 2: Create project config**

Create `package.json`:

```json
{
  "name": "codex-dynamic-architecture-plugin",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "bin": {
    "codex-architecture": "./bin/codex-architecture.js"
  },
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

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": ".",
    "types": ["node", "vitest/globals"]
  },
  "include": ["src/**/*.ts", "tests/**/*.ts", "vitest.config.ts"]
}
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 10000,
  },
});
```

Create `bin/codex-architecture.js`:

```js
#!/usr/bin/env node
import { runCli } from "../dist/src/cli.js";

const result = await runCli(process.argv.slice(2), {
  cwd: process.cwd(),
  stdout: (line) => console.log(line),
  stderr: (line) => console.error(line),
});

process.exitCode = result.exitCode;
```

- [ ] **Step 3: Write minimal CLI dispatch**

Create `src/cli.ts`:

```ts
export type CliIO = {
  cwd: string;
  stdout: (line: string) => void;
  stderr: (line: string) => void;
};

export type CliResult = {
  exitCode: number;
};

const HELP = `codex-architecture

Commands:
  codex-architecture init
  codex-architecture refresh
  codex-architecture serve
  codex-architecture update --from-codex-summary <file>
  codex-architecture doctor
`;

export async function runCli(args: string[], io: CliIO): Promise<CliResult> {
  const [command] = args;

  if (!command || command === "--help" || command === "-h") {
    io.stdout(HELP);
    return { exitCode: 0 };
  }

  if (!["init", "refresh", "serve", "update", "doctor"].includes(command)) {
    io.stderr(`Unknown command: ${command}`);
    io.stderr(HELP);
    return { exitCode: 1 };
  }

  io.stderr(`Command unavailable in current scaffold: ${command}`);
  return { exitCode: 1 };
}
```

- [ ] **Step 4: Install dependencies and verify scaffold tests pass**

Run: `npm install`

Run: `npm test -- tests/commands/cli.test.ts`

Expected: PASS for the help and unknown-command tests.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts bin/codex-architecture.js src/cli.ts tests/commands/cli.test.ts
git commit -m "chore: scaffold codex architecture CLI"
```

## Task 2: Implement State Types and Validation

**Files:**
- Create: `src/state/types.ts`
- Create: `src/state/validate.ts`
- Create: `tests/state/validate.test.ts`

- [ ] **Step 1: Write validation tests**

Create `tests/state/validate.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { validateStatus } from "../../src/state/validate";
import type { ArchitectureStatus } from "../../src/state/types";

const validStatus: ArchitectureStatus = {
  schemaVersion: 1,
  project: {
    id: "magic-router",
    name: "Magic Router",
    goal: "Stabilize invite beta gateway",
    phase: "beta-hardening",
    sourcePath: "/repo",
    updatedAt: "2026-04-28T00:00:00.000Z",
  },
  features: [
    {
      id: "api-keys",
      name: "API key management",
      purpose: "Allow users to create and manage relay keys",
      status: "in_progress",
      percent: 70,
      acceptance: ["User can create a key", "Key appears in console"],
      moduleIds: ["api", "console"],
      interfaceIds: ["post-api-keys"],
      riskIds: [],
      evidenceIds: ["api-key-service"],
    },
  ],
  modules: [
    {
      id: "api",
      name: "API",
      kind: "backend",
      status: "in_progress",
      percent: 70,
      dependsOn: [],
      evidenceIds: ["api-key-service"],
    },
    {
      id: "console",
      name: "Console",
      kind: "frontend",
      status: "in_progress",
      percent: 80,
      dependsOn: ["api"],
      evidenceIds: [],
    },
  ],
  interfaces: [
    {
      id: "post-api-keys",
      name: "Create API key",
      kind: "http",
      method: "POST",
      path: "/v1/api-keys",
      purpose: "Create a relay API key",
      callerIds: ["console"],
      calleeIds: ["api"],
      featureIds: ["api-keys"],
      testStatus: "partial",
      evidenceIds: ["api-key-service"],
    },
  ],
  flows: [
    {
      id: "create-key-flow",
      name: "Create key flow",
      entry: "console",
      steps: ["console", "api"],
      interfaceIds: ["post-api-keys"],
      status: "in_progress",
    },
  ],
  risks: [],
  evidence: [
    {
      id: "api-key-service",
      kind: "code",
      path: "apps/api/src/modules/api-keys/api-keys.service.ts",
      note: "API key service implementation",
    },
  ],
  scanFindings: [],
};

describe("validateStatus", () => {
  it("accepts a complete status document", () => {
    expect(validateStatus(validStatus)).toEqual({ ok: true, errors: [] });
  });

  it("reports exact field paths", () => {
    const invalid = {
      ...validStatus,
      features: [{ ...validStatus.features[0], percent: 120 }],
    };

    expect(validateStatus(invalid)).toEqual({
      ok: false,
      errors: [
        {
          path: "features[0].percent",
          message: "Expected number between 0 and 100",
        },
      ],
    });
  });
});
```

- [ ] **Step 2: Define state types**

Create `src/state/types.ts`:

```ts
export type WorkStatus = "not_started" | "in_progress" | "complete" | "blocked" | "unknown";
export type TestStatus = "none" | "partial" | "passing" | "failing" | "unknown";
export type ModuleKind = "frontend" | "backend" | "worker" | "database" | "external" | "tooling" | "unknown";
export type EvidenceKind = "code" | "test" | "doc" | "commit" | "scan" | "manual";
export type FindingSeverity = "info" | "warning" | "error";

export type ArchitectureStatus = {
  schemaVersion: 1;
  project: ProjectInfo;
  features: FeatureStatus[];
  modules: ModuleStatus[];
  interfaces: InterfaceStatus[];
  flows: FlowStatus[];
  risks: RiskStatus[];
  evidence: EvidenceRef[];
  scanFindings: ScanFinding[];
};

export type ProjectInfo = {
  id: string;
  name: string;
  goal: string;
  phase: string;
  sourcePath: string;
  updatedAt: string;
};

export type FeatureStatus = {
  id: string;
  name: string;
  purpose: string;
  status: WorkStatus;
  percent: number;
  weight?: number;
  acceptance: string[];
  moduleIds: string[];
  interfaceIds: string[];
  riskIds: string[];
  evidenceIds: string[];
};

export type ModuleStatus = {
  id: string;
  name: string;
  kind: ModuleKind;
  status: WorkStatus;
  percent: number;
  dependsOn: string[];
  evidenceIds: string[];
};

export type InterfaceStatus = {
  id: string;
  name: string;
  kind: "http" | "event" | "cli" | "db" | "external";
  method?: string;
  path?: string;
  purpose: string;
  callerIds: string[];
  calleeIds: string[];
  featureIds: string[];
  testStatus: TestStatus;
  evidenceIds: string[];
};

export type FlowStatus = {
  id: string;
  name: string;
  entry: string;
  steps: string[];
  interfaceIds: string[];
  status: WorkStatus;
};

export type RiskStatus = {
  id: string;
  title: string;
  severity: FindingSeverity;
  status: "open" | "mitigated" | "accepted";
  affectedIds: string[];
  evidenceIds: string[];
};

export type EvidenceRef = {
  id: string;
  kind: EvidenceKind;
  path: string;
  note: string;
};

export type ScanFinding = {
  id: string;
  severity: FindingSeverity;
  kind: "missing_in_status" | "missing_in_code" | "test_mismatch" | "progress_mismatch" | "scan_error";
  title: string;
  detail: string;
  affectedIds: string[];
  proposedAction: string;
  evidenceIds: string[];
};
```

- [ ] **Step 3: Implement explicit validator**

Create `src/state/validate.ts`:

```ts
import type { ArchitectureStatus } from "./types";

export type ValidationError = {
  path: string;
  message: string;
};

export type ValidationResult =
  | { ok: true; errors: [] }
  | { ok: false; errors: ValidationError[] };

const workStatuses = new Set(["not_started", "in_progress", "complete", "blocked", "unknown"]);
const moduleKinds = new Set(["frontend", "backend", "worker", "database", "external", "tooling", "unknown"]);

export function validateStatus(value: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const status = value as Partial<ArchitectureStatus>;

  if (!isObject(value)) {
    return { ok: false, errors: [{ path: "$", message: "Expected object" }] };
  }

  if (status.schemaVersion !== 1) {
    errors.push({ path: "schemaVersion", message: "Expected 1" });
  }

  requireString(status.project?.id, "project.id", errors);
  requireString(status.project?.name, "project.name", errors);
  requireString(status.project?.goal, "project.goal", errors);
  requireString(status.project?.phase, "project.phase", errors);
  requireString(status.project?.sourcePath, "project.sourcePath", errors);
  requireString(status.project?.updatedAt, "project.updatedAt", errors);

  validateArray(status.features, "features", errors, (feature, path) => {
    requireString(feature.id, `${path}.id`, errors);
    requireString(feature.name, `${path}.name`, errors);
    requireEnum(feature.status, workStatuses, `${path}.status`, errors);
    requirePercent(feature.percent, `${path}.percent`, errors);
    requireStringArray(feature.acceptance, `${path}.acceptance`, errors);
    requireStringArray(feature.moduleIds, `${path}.moduleIds`, errors);
    requireStringArray(feature.interfaceIds, `${path}.interfaceIds`, errors);
    requireStringArray(feature.riskIds, `${path}.riskIds`, errors);
    requireStringArray(feature.evidenceIds, `${path}.evidenceIds`, errors);
  });

  validateArray(status.modules, "modules", errors, (mod, path) => {
    requireString(mod.id, `${path}.id`, errors);
    requireString(mod.name, `${path}.name`, errors);
    requireEnum(mod.kind, moduleKinds, `${path}.kind`, errors);
    requireEnum(mod.status, workStatuses, `${path}.status`, errors);
    requirePercent(mod.percent, `${path}.percent`, errors);
    requireStringArray(mod.dependsOn, `${path}.dependsOn`, errors);
    requireStringArray(mod.evidenceIds, `${path}.evidenceIds`, errors);
  });

  validateArray(status.interfaces, "interfaces", errors, (iface, path) => {
    requireString(iface.id, `${path}.id`, errors);
    requireString(iface.name, `${path}.name`, errors);
    requireString(iface.kind, `${path}.kind`, errors);
    requireString(iface.purpose, `${path}.purpose`, errors);
    requireStringArray(iface.callerIds, `${path}.callerIds`, errors);
    requireStringArray(iface.calleeIds, `${path}.calleeIds`, errors);
    requireStringArray(iface.featureIds, `${path}.featureIds`, errors);
    requireString(iface.testStatus, `${path}.testStatus`, errors);
    requireStringArray(iface.evidenceIds, `${path}.evidenceIds`, errors);
  });

  for (const key of ["flows", "risks", "evidence", "scanFindings"] as const) {
    if (!Array.isArray(status[key])) {
      errors.push({ path: key, message: "Expected array" });
    }
  }

  return errors.length === 0 ? { ok: true, errors: [] } : { ok: false, errors };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateArray<T>(
  value: unknown,
  path: string,
  errors: ValidationError[],
  validateItem: (item: Record<string, unknown>, path: string) => void,
): void {
  if (!Array.isArray(value)) {
    errors.push({ path, message: "Expected array" });
    return;
  }

  value.forEach((item, index) => {
    if (!isObject(item)) {
      errors.push({ path: `${path}[${index}]`, message: "Expected object" });
      return;
    }
    validateItem(item, `${path}[${index}]`);
  });
}

function requireString(value: unknown, path: string, errors: ValidationError[]): void {
  if (typeof value !== "string" || value.length === 0) {
    errors.push({ path, message: "Expected non-empty string" });
  }
}

function requireStringArray(value: unknown, path: string, errors: ValidationError[]): void {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    errors.push({ path, message: "Expected string array" });
  }
}

function requireEnum(value: unknown, allowed: Set<string>, path: string, errors: ValidationError[]): void {
  if (typeof value !== "string" || !allowed.has(value)) {
    errors.push({ path, message: `Expected one of: ${Array.from(allowed).join(", ")}` });
  }
}

function requirePercent(value: unknown, path: string, errors: ValidationError[]): void {
  if (typeof value !== "number" || value < 0 || value > 100) {
    errors.push({ path, message: "Expected number between 0 and 100" });
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/state/validate.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/types.ts src/state/validate.ts tests/state/validate.test.ts
git commit -m "feat: add architecture status validation"
```

## Task 3: Implement Progress Calculation and State IO

**Files:**
- Create: `src/state/progress.ts`
- Create: `src/state/io.ts`
- Create: `src/state/events.ts`
- Create: `src/utils/json.ts`
- Create: `src/utils/fs.ts`
- Create: `tests/state/progress.test.ts`
- Create: `tests/state/io.test.ts`

- [ ] **Step 1: Write progress tests**

Create `tests/state/progress.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { calculateProjectProgress } from "../../src/state/progress";
import type { FeatureStatus } from "../../src/state/types";

function feature(id: string, percent: number, weight?: number): FeatureStatus {
  return {
    id,
    name: id,
    purpose: id,
    status: percent === 100 ? "complete" : "in_progress",
    percent,
    weight,
    acceptance: [],
    moduleIds: [],
    interfaceIds: [],
    riskIds: [],
    evidenceIds: [],
  };
}

describe("calculateProjectProgress", () => {
  it("uses equal feature weights by default", () => {
    expect(calculateProjectProgress([feature("a", 100), feature("b", 50)])).toEqual({
      percent: 75,
      basis: "equal",
      featureCount: 2,
      weights: [],
    });
  });

  it("uses weights when any active feature defines weight", () => {
    expect(calculateProjectProgress([feature("a", 100, 3), feature("b", 50, 1)])).toEqual({
      percent: 88,
      basis: "weighted",
      featureCount: 2,
      weights: [
        { featureId: "a", weight: 3 },
        { featureId: "b", weight: 1 },
      ],
    });
  });

  it("ignores unknown features in the project percentage", () => {
    const unknown = feature("unknown", 0);
    unknown.status = "unknown";

    expect(calculateProjectProgress([feature("a", 100), unknown])).toEqual({
      percent: 100,
      basis: "equal",
      featureCount: 1,
      weights: [],
    });
  });
});
```

- [ ] **Step 2: Implement progress calculation**

Create `src/state/progress.ts`:

```ts
import type { FeatureStatus } from "./types";

export type ProjectProgress = {
  percent: number;
  basis: "equal" | "weighted";
  featureCount: number;
  weights: Array<{ featureId: string; weight: number }>;
};

export function calculateProjectProgress(features: FeatureStatus[]): ProjectProgress {
  const active = features.filter((feature) => feature.status !== "unknown");
  if (active.length === 0) {
    return { percent: 0, basis: "equal", featureCount: 0, weights: [] };
  }

  const hasWeights = active.some((feature) => typeof feature.weight === "number");
  if (!hasWeights) {
    const total = active.reduce((sum, feature) => sum + feature.percent, 0);
    return {
      percent: Math.round(total / active.length),
      basis: "equal",
      featureCount: active.length,
      weights: [],
    };
  }

  const weights = active.map((feature) => ({
    featureId: feature.id,
    weight: feature.weight ?? 1,
  }));
  const denominator = weights.reduce((sum, item) => sum + item.weight, 0);
  const weightedTotal = active.reduce((sum, feature) => sum + feature.percent * (feature.weight ?? 1), 0);

  return {
    percent: denominator === 0 ? 0 : Math.round(weightedTotal / denominator),
    basis: "weighted",
    featureCount: active.length,
    weights,
  };
}
```

- [ ] **Step 3: Write state IO tests**

Create `tests/state/io.test.ts`:

```ts
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appendEvent, readStatusFile, writeStatusFile } from "../../src/state/io";
import type { ArchitectureStatus } from "../../src/state/types";

let root: string;

const status: ArchitectureStatus = {
  schemaVersion: 1,
  project: {
    id: "demo",
    name: "Demo",
    goal: "Demo goal",
    phase: "build",
    sourcePath: "/demo",
    updatedAt: "2026-04-28T00:00:00.000Z",
  },
  features: [],
  modules: [],
  interfaces: [],
  flows: [],
  risks: [],
  evidence: [],
  scanFindings: [],
};

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "codex-arch-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("state IO", () => {
  it("writes and reads status.json", async () => {
    await writeStatusFile(root, status);
    await expect(readStatusFile(root)).resolves.toEqual(status);
  });

  it("appends compact JSONL events", async () => {
    await appendEvent(root, {
      timestamp: "2026-04-28T00:00:00.000Z",
      summary: "Updated API keys",
      featureIds: ["api-keys"],
      moduleIds: ["api"],
      interfaceIds: ["post-api-keys"],
      verification: ["npm test"],
      riskChanges: [],
    });

    const content = await readFile(join(root, ".codex-architecture", "events.jsonl"), "utf8");
    expect(content.trim()).toBe(
      '{"timestamp":"2026-04-28T00:00:00.000Z","summary":"Updated API keys","featureIds":["api-keys"],"moduleIds":["api"],"interfaceIds":["post-api-keys"],"verification":["npm test"],"riskChanges":[]}',
    );
  });
});
```

- [ ] **Step 4: Implement JSON and filesystem helpers**

Create `src/utils/json.ts`:

```ts
export function parseJsonObject(text: string, path: string): unknown {
  try {
    return JSON.parse(text);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON in ${path}: ${message}`);
  }
}

export function stringifyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function stringifyJsonLine(value: unknown): string {
  return `${JSON.stringify(value)}\n`;
}
```

Create `src/utils/fs.ts`:

```ts
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

export const STATE_DIR = ".codex-architecture";

export function statePath(root: string, file: string): string {
  return join(root, STATE_DIR, file);
}

export async function ensureStateDir(root: string): Promise<string> {
  const dir = join(root, STATE_DIR);
  await mkdir(dir, { recursive: true });
  return dir;
}
```

- [ ] **Step 5: Implement state IO and event appending**

Create `src/state/io.ts`:

```ts
import { appendFile, readFile, writeFile } from "node:fs/promises";
import { ensureStateDir, statePath } from "../utils/fs";
import { parseJsonObject, stringifyJson, stringifyJsonLine } from "../utils/json";
import { validateStatus } from "./validate";
import type { ArchitectureStatus } from "./types";

export type DevelopmentEvent = {
  timestamp: string;
  summary: string;
  featureIds: string[];
  moduleIds: string[];
  interfaceIds: string[];
  verification: string[];
  riskChanges: string[];
};

export async function readStatusFile(root: string): Promise<ArchitectureStatus> {
  const file = statePath(root, "status.json");
  const parsed = parseJsonObject(await readFile(file, "utf8"), file);
  const validation = validateStatus(parsed);
  if (!validation.ok) {
    const details = validation.errors.map((error) => `${error.path}: ${error.message}`).join("; ");
    throw new Error(`Invalid status file: ${details}`);
  }
  return parsed as ArchitectureStatus;
}

export async function writeStatusFile(root: string, status: ArchitectureStatus): Promise<void> {
  const validation = validateStatus(status);
  if (!validation.ok) {
    const details = validation.errors.map((error) => `${error.path}: ${error.message}`).join("; ");
    throw new Error(`Refusing to write invalid status: ${details}`);
  }
  await ensureStateDir(root);
  await writeFile(statePath(root, "status.json"), stringifyJson(status), "utf8");
}

export async function appendEvent(root: string, event: DevelopmentEvent): Promise<void> {
  await ensureStateDir(root);
  await appendFile(statePath(root, "events.jsonl"), stringifyJsonLine(event), "utf8");
}
```

Create `src/state/events.ts`:

```ts
export { appendEvent } from "./io";
export type { DevelopmentEvent } from "./io";
```

- [ ] **Step 6: Run tests**

Run: `npm test -- tests/state/progress.test.ts tests/state/io.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/state/progress.ts src/state/io.ts src/state/events.ts src/utils/json.ts src/utils/fs.ts tests/state/progress.test.ts tests/state/io.test.ts
git commit -m "feat: add status progress and IO"
```

## Task 4: Implement Generic and TypeScript/Node Scanning

**Files:**
- Create: `src/scan/types.ts`
- Create: `src/scan/generic.ts`
- Create: `src/scan/typescript-node.ts`
- Create: `src/scan/index.ts`
- Create: `tests/fixtures/ts-node-app/package.json`
- Create: `tests/fixtures/ts-node-app/src/routes.ts`
- Create: `tests/fixtures/ts-node-app/src/client.ts`
- Create: `tests/fixtures/ts-node-app/tests/routes.test.ts`
- Create: `tests/scan/scanner.test.ts`

- [ ] **Step 1: Create fixture project**

Create `tests/fixtures/ts-node-app/package.json`:

```json
{
  "name": "fixture-ts-node-app",
  "private": true,
  "scripts": {
    "test": "vitest run"
  },
  "dependencies": {
    "express": "4.18.3",
    "axios": "1.6.8"
  }
}
```

Create `tests/fixtures/ts-node-app/src/routes.ts`:

```ts
import express from "express";

export const router = express.Router();

router.get("/v1/projects", (_req, res) => res.json([]));
router.post("/v1/api-keys", (_req, res) => res.status(201).json({ id: "key_123" }));
```

Create `tests/fixtures/ts-node-app/src/client.ts`:

```ts
import axios from "axios";

export async function loadProjects() {
  return fetch("/v1/projects");
}

export async function createKey() {
  return axios.post("/v1/api-keys", {});
}
```

Create `tests/fixtures/ts-node-app/tests/routes.test.ts`:

```ts
import { describe, expect, it } from "vitest";

describe("routes", () => {
  it("documents API key creation", () => {
    expect("POST /v1/api-keys").toContain("/v1/api-keys");
  });
});
```

- [ ] **Step 2: Write scanner tests**

Create `tests/scan/scanner.test.ts`:

```ts
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scanRepository } from "../../src/scan";

const fixtureRoot = join(process.cwd(), "tests/fixtures/ts-node-app");

describe("scanRepository", () => {
  it("detects package metadata, tests, routes, and HTTP clients", async () => {
    const result = await scanRepository(fixtureRoot);

    expect(result.packageName).toBe("fixture-ts-node-app");
    expect(result.testFiles).toContain("tests/routes.test.ts");
    expect(result.interfaces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: "GET", path: "/v1/projects", sourcePath: "src/routes.ts" }),
        expect.objectContaining({ method: "POST", path: "/v1/api-keys", sourcePath: "src/routes.ts" }),
      ]),
    );
    expect(result.calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: "GET", path: "/v1/projects", sourcePath: "src/client.ts" }),
        expect.objectContaining({ method: "POST", path: "/v1/api-keys", sourcePath: "src/client.ts" }),
      ]),
    );
  });
});
```

- [ ] **Step 3: Define scan result types**

Create `src/scan/types.ts`:

```ts
export type ScanResult = {
  root: string;
  packageName?: string;
  docs: string[];
  testFiles: string[];
  sourceFiles: string[];
  interfaces: ScannedInterface[];
  calls: ScannedCall[];
  errors: ScanError[];
};

export type ScannedInterface = {
  id: string;
  method?: string;
  path: string;
  sourcePath: string;
  confidence: "high" | "medium" | "low";
};

export type ScannedCall = {
  id: string;
  method?: string;
  path: string;
  sourcePath: string;
  confidence: "high" | "medium" | "low";
};

export type ScanError = {
  source: string;
  message: string;
};
```

- [ ] **Step 4: Implement generic scanner**

Create `src/scan/generic.ts`:

```ts
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

export async function listFiles(root: string): Promise<string[]> {
  const results: string[] = [];
  await walk(root, root, results);
  return results.sort();
}

export async function readPackageName(root: string): Promise<string | undefined> {
  try {
    const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as { name?: string };
    return typeof pkg.name === "string" ? pkg.name : undefined;
  } catch {
    return undefined;
  }
}

export function classifyDocs(files: string[]): string[] {
  return files.filter((file) => /(^|\/)(README|CHANGELOG|docs\/).*\.(md|mdx|txt)$/i.test(file));
}

export function classifyTests(files: string[]): string[] {
  return files.filter((file) => /(\.test\.|\.(spec)\.|__tests__|\/tests\/).*\.(ts|tsx|js|jsx)$/i.test(file));
}

export function classifySources(files: string[]): string[] {
  return files.filter((file) => /\.(ts|tsx|js|jsx|go|py)$/i.test(file) && !classifyTests([file]).length);
}

async function walk(root: string, current: string, results: string[]): Promise<void> {
  const entries = await readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") {
      continue;
    }
    const absolute = join(current, entry.name);
    if (entry.isDirectory()) {
      await walk(root, absolute, results);
      continue;
    }
    if ((await stat(absolute)).isFile()) {
      results.push(relative(root, absolute));
    }
  }
}
```

- [ ] **Step 5: Implement TypeScript/Node adapter**

Create `src/scan/typescript-node.ts`:

```ts
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ScannedCall, ScannedInterface } from "./types";

const routePattern =
  /\b(?:router|app)\s*\.\s*(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/gi;
const fetchPattern = /\bfetch\s*\(\s*["'`]([^"'`]+)["'`]/gi;
const axiosPattern =
  /\baxios\s*\.\s*(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/gi;

export async function scanTypeScriptNode(root: string, sourceFiles: string[]): Promise<{
  interfaces: ScannedInterface[];
  calls: ScannedCall[];
}> {
  const interfaces: ScannedInterface[] = [];
  const calls: ScannedCall[] = [];

  for (const sourcePath of sourceFiles.filter((file) => /\.(ts|tsx|js|jsx)$/.test(file))) {
    const text = await readFile(join(root, sourcePath), "utf8");

    for (const match of text.matchAll(routePattern)) {
      const method = match[1].toUpperCase();
      const path = match[2];
      interfaces.push({
        id: `${method}:${path}`,
        method,
        path,
        sourcePath,
        confidence: "medium",
      });
    }

    for (const match of text.matchAll(fetchPattern)) {
      calls.push({
        id: `GET:${match[1]}:${sourcePath}`,
        method: "GET",
        path: match[1],
        sourcePath,
        confidence: "low",
      });
    }

    for (const match of text.matchAll(axiosPattern)) {
      const method = match[1].toUpperCase();
      const path = match[2];
      calls.push({
        id: `${method}:${path}:${sourcePath}`,
        method,
        path,
        sourcePath,
        confidence: "medium",
      });
    }
  }

  return { interfaces, calls };
}
```

- [ ] **Step 6: Implement scanner orchestration**

Create `src/scan/index.ts`:

```ts
import { classifyDocs, classifySources, classifyTests, listFiles, readPackageName } from "./generic";
import { scanTypeScriptNode } from "./typescript-node";
import type { ScanResult } from "./types";

export async function scanRepository(root: string): Promise<ScanResult> {
  try {
    const files = await listFiles(root);
    const sourceFiles = classifySources(files);
    const nodeScan = await scanTypeScriptNode(root, sourceFiles);

    return {
      root,
      packageName: await readPackageName(root),
      docs: classifyDocs(files),
      testFiles: classifyTests(files),
      sourceFiles,
      interfaces: nodeScan.interfaces,
      calls: nodeScan.calls,
      errors: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      root,
      docs: [],
      testFiles: [],
      sourceFiles: [],
      interfaces: [],
      calls: [],
      errors: [{ source: "scanRepository", message }],
    };
  }
}
```

- [ ] **Step 7: Run tests**

Run: `npm test -- tests/scan/scanner.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/scan tests/fixtures/ts-node-app tests/scan/scanner.test.ts
git commit -m "feat: scan repository interfaces and calls"
```

## Task 5: Implement Scan Findings and Conflict Proposals

**Files:**
- Create: `src/findings/diff.ts`
- Create: `tests/findings/diff.test.ts`

- [ ] **Step 1: Write conflict tests**

Create `tests/findings/diff.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createScanFindings } from "../../src/findings/diff";
import type { ArchitectureStatus } from "../../src/state/types";
import type { ScanResult } from "../../src/scan/types";

const status: ArchitectureStatus = {
  schemaVersion: 1,
  project: {
    id: "demo",
    name: "Demo",
    goal: "Demo",
    phase: "build",
    sourcePath: "/demo",
    updatedAt: "2026-04-28T00:00:00.000Z",
  },
  features: [],
  modules: [],
  interfaces: [
    {
      id: "GET:/v1/known",
      name: "Known",
      kind: "http",
      method: "GET",
      path: "/v1/known",
      purpose: "Known route",
      callerIds: [],
      calleeIds: [],
      featureIds: [],
      testStatus: "unknown",
      evidenceIds: [],
    },
  ],
  flows: [],
  risks: [],
  evidence: [],
  scanFindings: [],
};

const scan: ScanResult = {
  root: "/demo",
  docs: [],
  testFiles: [],
  sourceFiles: [],
  interfaces: [
    { id: "GET:/v1/known", method: "GET", path: "/v1/known", sourcePath: "src/routes.ts", confidence: "medium" },
    { id: "POST:/v1/new", method: "POST", path: "/v1/new", sourcePath: "src/routes.ts", confidence: "medium" },
  ],
  calls: [],
  errors: [],
};

describe("createScanFindings", () => {
  it("proposes adding scanned routes missing from status", () => {
    expect(createScanFindings(status, scan)).toEqual([
      expect.objectContaining({
        kind: "missing_in_status",
        severity: "warning",
        title: "Scanned interface is not recorded: POST /v1/new",
        proposedAction: "Confirm whether POST /v1/new belongs in status.json, then add it with purpose, callers, callees, feature ownership, and test status.",
      }),
    ]);
  });

  it("proposes removing confirmed routes missing from scan", () => {
    const nextScan = { ...scan, interfaces: [] };
    expect(createScanFindings(status, nextScan)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "missing_in_code",
          title: "Recorded interface was not found by scanner: GET /v1/known",
        }),
      ]),
    );
  });
});
```

- [ ] **Step 2: Implement finding generation**

Create `src/findings/diff.ts`:

```ts
import type { ScanResult } from "../scan/types";
import type { ArchitectureStatus, ScanFinding } from "../state/types";

export function createScanFindings(status: ArchitectureStatus, scan: ScanResult): ScanFinding[] {
  const findings: ScanFinding[] = [];
  const confirmed = new Map(status.interfaces.map((item) => [interfaceKey(item.method, item.path), item]));
  const scanned = new Map(scan.interfaces.map((item) => [interfaceKey(item.method, item.path), item]));

  for (const [key, scannedInterface] of scanned) {
    if (!confirmed.has(key)) {
      const label = labelFor(scannedInterface.method, scannedInterface.path);
      findings.push({
        id: `missing-in-status:${key}`,
        severity: "warning",
        kind: "missing_in_status",
        title: `Scanned interface is not recorded: ${label}`,
        detail: `Scanner found ${label} in ${scannedInterface.sourcePath}, but status.json has no matching interface.`,
        affectedIds: [key],
        proposedAction: `Confirm whether ${label} belongs in status.json, then add it with purpose, callers, callees, feature ownership, and test status.`,
        evidenceIds: [],
      });
    }
  }

  for (const [key, confirmedInterface] of confirmed) {
    if (!scanned.has(key)) {
      const label = labelFor(confirmedInterface.method, confirmedInterface.path);
      findings.push({
        id: `missing-in-code:${key}`,
        severity: "warning",
        kind: "missing_in_code",
        title: `Recorded interface was not found by scanner: ${label}`,
        detail: `status.json records ${label}, but the scanner did not find a matching route. This can be a scanner limitation or stale project state.`,
        affectedIds: [confirmedInterface.id],
        proposedAction: `Check whether ${label} still exists. If it was removed, confirm removal from status.json; if it is dynamic, add evidence so the scanner mismatch is explainable.`,
        evidenceIds: confirmedInterface.evidenceIds,
      });
    }
  }

  for (const error of scan.errors) {
    findings.push({
      id: `scan-error:${error.source}`,
      severity: "error",
      kind: "scan_error",
      title: `Scanner error: ${error.source}`,
      detail: error.message,
      affectedIds: [],
      proposedAction: "Fix the scanner error, then run codex-architecture refresh again. Do not overwrite confirmed state while scanning is failing.",
      evidenceIds: [],
    });
  }

  return findings;
}

function interfaceKey(method?: string, path?: string): string {
  return `${method ?? "ANY"}:${path ?? ""}`;
}

function labelFor(method?: string, path?: string): string {
  return `${method ?? "ANY"} ${path ?? "(unknown path)"}`;
}
```

- [ ] **Step 3: Run tests**

Run: `npm test -- tests/findings/diff.test.ts`

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/findings/diff.ts tests/findings/diff.test.ts
git commit -m "feat: generate scan conflict findings"
```

## Task 6: Render the HTML Architecture Report

**Files:**
- Create: `src/render/html.ts`
- Create: `src/render/report.ts`
- Create: `tests/render/report.test.ts`

- [ ] **Step 1: Write report rendering tests**

Create `tests/render/report.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { renderReportHtml } from "../../src/render/report";
import type { ArchitectureStatus } from "../../src/state/types";

const status: ArchitectureStatus = {
  schemaVersion: 1,
  project: {
    id: "demo",
    name: "Demo",
    goal: "Demo goal",
    phase: "build",
    sourcePath: "/demo",
    updatedAt: "2026-04-28T00:00:00.000Z",
  },
  features: [
    {
      id: "keys",
      name: "API keys",
      purpose: "Manage API keys",
      status: "in_progress",
      percent: 70,
      acceptance: [],
      moduleIds: ["api"],
      interfaceIds: ["post-api-keys"],
      riskIds: [],
      evidenceIds: [],
    },
  ],
  modules: [
    {
      id: "api",
      name: "API",
      kind: "backend",
      status: "in_progress",
      percent: 70,
      dependsOn: [],
      evidenceIds: [],
    },
  ],
  interfaces: [
    {
      id: "post-api-keys",
      name: "Create API key",
      kind: "http",
      method: "POST",
      path: "/v1/api-keys",
      purpose: "Create key",
      callerIds: [],
      calleeIds: ["api"],
      featureIds: ["keys"],
      testStatus: "partial",
      evidenceIds: [],
    },
  ],
  flows: [],
  risks: [],
  evidence: [],
  scanFindings: [],
};

describe("renderReportHtml", () => {
  it("renders project status, graph nodes, details, and static refresh fallback", () => {
    const html = renderReportHtml(status, {
      progress: { percent: 70, basis: "equal", featureCount: 1, weights: [] },
      servedMode: false,
    });

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Demo");
    expect(html).toContain("API keys");
    expect(html).toContain("POST /v1/api-keys");
    expect(html).toContain("codex-architecture refresh");
    expect(html).toContain("data-node-id=\"api\"");
  });
});
```

- [ ] **Step 2: Implement HTML helpers**

Create `src/render/html.ts`:

```ts
export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function embedJson(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}
```

- [ ] **Step 3: Implement report renderer**

Create `src/render/report.ts`:

```ts
import type { ProjectProgress } from "../state/progress";
import type { ArchitectureStatus, WorkStatus } from "../state/types";
import { embedJson, escapeHtml } from "./html";

export type RenderReportOptions = {
  progress: ProjectProgress;
  servedMode: boolean;
};

export function renderReportHtml(status: ArchitectureStatus, options: RenderReportOptions): string {
  const nodeCards = status.modules.map((module) => {
    const statusClass = statusToClass(module.status);
    return `<button class="node ${statusClass}" data-node-id="${escapeHtml(module.id)}" onclick="selectNode('${escapeJs(module.id)}')">
      <strong>${escapeHtml(module.name)}</strong>
      <span>${escapeHtml(module.kind)} · ${module.percent}%</span>
    </button>`;
  }).join("\n");

  const interfaceRows = status.interfaces.map((item) => {
    const label = `${item.method ?? item.kind.toUpperCase()} ${item.path ?? item.name}`;
    return `<button class="interface-row" onclick="selectInterface('${escapeJs(item.id)}')">${escapeHtml(label)}</button>`;
  }).join("\n");

  const refreshControl = options.servedMode
    ? `<button class="refresh" onclick="refreshReport()">Refresh</button>`
    : `<button class="refresh" onclick="showStaticRefresh()">Refresh</button>`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(status.project.name)} Architecture</title>
  <style>${styles()}</style>
</head>
<body>
  <aside class="sidebar">
    <h1>${escapeHtml(status.project.name)}</h1>
    <p>${escapeHtml(status.project.goal)}</p>
    <dl>
      <dt>Phase</dt><dd>${escapeHtml(status.project.phase)}</dd>
      <dt>Progress</dt><dd>${options.progress.percent}% (${escapeHtml(options.progress.basis)})</dd>
      <dt>Features</dt><dd>${options.progress.featureCount}</dd>
      <dt>Interfaces</dt><dd>${status.interfaces.length}</dd>
      <dt>Findings</dt><dd>${status.scanFindings.length}</dd>
    </dl>
    <div class="legend">
      <span class="dot complete"></span> complete/stable<br>
      <span class="dot in-progress"></span> in progress/verify<br>
      <span class="dot blocked"></span> blocked/conflict<br>
      <span class="dot unknown"></span> unknown/not started
    </div>
  </aside>
  <main class="graph">
    <header>
      <h2>Dynamic Architecture</h2>
      ${refreshControl}
    </header>
    <section class="nodes">${nodeCards || "<p>No modules recorded yet.</p>"}</section>
    <section class="interfaces">
      <h3>Interfaces</h3>
      ${interfaceRows || "<p>No interfaces recorded yet.</p>"}
    </section>
    <section id="static-refresh" class="hidden command">Run: codex-architecture refresh</section>
  </main>
  <aside class="details" id="details">
    <h2>Project</h2>
    <p>Select a module or interface to inspect function, status, callers, evidence, and risks.</p>
  </aside>
  <script>window.__ARCHITECTURE_STATUS__ = ${embedJson(status)};</script>
  <script>${clientScript()}</script>
</body>
</html>`;
}

function statusToClass(status: WorkStatus): string {
  if (status === "complete") return "complete";
  if (status === "blocked") return "blocked";
  if (status === "unknown" || status === "not_started") return "unknown";
  return "in-progress";
}

function escapeJs(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function styles(): string {
  return `
body{margin:0;font-family:Inter,Arial,sans-serif;color:#0f172a;background:#f8fafc;display:grid;grid-template-columns:260px 1fr 320px;min-height:100vh}
.sidebar,.details{background:#fff;border-right:1px solid #cbd5e1;padding:18px;overflow:auto}
.details{border-right:0;border-left:1px solid #cbd5e1}
.graph{padding:18px;overflow:auto}
header{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}
h1{font-size:22px;margin:0 0 8px}h2{font-size:18px;margin:0 0 10px}h3{font-size:14px;margin:18px 0 8px}
dl{display:grid;grid-template-columns:90px 1fr;gap:8px;margin:18px 0}dt{color:#64748b}dd{margin:0;font-weight:700}
.nodes{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px}
.node,.interface-row,.refresh{border:1px solid #cbd5e1;border-radius:8px;background:#fff;padding:12px;text-align:left;cursor:pointer}
.node span{display:block;color:#475569;margin-top:6px}.complete{border-color:#16a34a;background:#ecfdf5}.in-progress{border-color:#d97706;background:#fffbeb}.blocked{border-color:#dc2626;background:#fef2f2}.unknown{border-color:#64748b;background:#f1f5f9}
.interface-row{display:block;width:100%;margin-bottom:8px}.dot{display:inline-block;width:10px;height:10px;border-radius:999px;margin-right:6px}.hidden{display:none}.command{margin-top:12px;padding:12px;border:1px solid #d97706;background:#fffbeb;border-radius:8px}
`;
}

function clientScript(): string {
  return `
function selectNode(id){const status=window.__ARCHITECTURE_STATUS__;const node=status.modules.find((item)=>item.id===id);document.getElementById('details').innerHTML=node?'<h2>'+node.name+'</h2><p>'+node.kind+' · '+node.status+' · '+node.percent+'%</p><details open><summary>Evidence</summary><p>'+node.evidenceIds.join(', ')+'</p></details>':'<p>Node not found.</p>'}
function selectInterface(id){const status=window.__ARCHITECTURE_STATUS__;const item=status.interfaces.find((entry)=>entry.id===id);const label=item?(item.method||item.kind.toUpperCase())+' '+(item.path||item.name):'';document.getElementById('details').innerHTML=item?'<h2>'+label+'</h2><p>'+item.purpose+'</p><p>Test status: '+item.testStatus+'</p><details open><summary>Callers</summary><p>'+item.callerIds.join(', ')+'</p></details><details><summary>Callees</summary><p>'+item.calleeIds.join(', ')+'</p></details>':'<p>Interface not found.</p>'}
async function refreshReport(){const result=await fetch('/refresh',{method:'POST'});if(result.ok){location.reload()}else{alert(await result.text())}}
function showStaticRefresh(){document.getElementById('static-refresh').classList.remove('hidden')}
`;
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/render/report.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/render/html.ts src/render/report.ts tests/render/report.test.ts
git commit -m "feat: render architecture report HTML"
```

## Task 7: Implement Refresh and Doctor Commands

**Files:**
- Create: `src/commands/refresh.ts`
- Create: `src/commands/doctor.ts`
- Modify: `src/cli.ts`
- Create: `tests/commands/refresh.test.ts`
- Create: `tests/commands/doctor.test.ts`

- [ ] **Step 1: Write command tests**

Create `tests/commands/refresh.test.ts`:

```ts
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runRefresh } from "../../src/commands/refresh";
import { writeStatusFile } from "../../src/state/io";
import type { ArchitectureStatus } from "../../src/state/types";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "codex-arch-refresh-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("runRefresh", () => {
  it("renders report.html and updates scan findings", async () => {
    const status: ArchitectureStatus = {
      schemaVersion: 1,
      project: { id: "demo", name: "Demo", goal: "Demo", phase: "build", sourcePath: root, updatedAt: "2026-04-28T00:00:00.000Z" },
      features: [],
      modules: [],
      interfaces: [],
      flows: [],
      risks: [],
      evidence: [],
      scanFindings: [],
    };
    await writeStatusFile(root, status);

    const result = await runRefresh({ cwd: root, servedMode: false });

    expect(result.reportPath.endsWith(".codex-architecture/report.html")).toBe(true);
    await expect(readFile(result.reportPath, "utf8")).resolves.toContain("Demo");
  });
});
```

Create `tests/commands/doctor.test.ts`:

```ts
import { mkdtemp, rm, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runDoctor } from "../../src/commands/doctor";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "codex-arch-doctor-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("runDoctor", () => {
  it("reports missing status file", async () => {
    await expect(runDoctor({ cwd: root })).resolves.toEqual({
      ok: false,
      messages: ["Missing .codex-architecture/status.json. Run codex-architecture init."],
    });
  });

  it("reports invalid status file fields", async () => {
    await mkdir(join(root, ".codex-architecture"), { recursive: true });
    await writeFile(join(root, ".codex-architecture/status.json"), "{\"schemaVersion\":1}", "utf8");

    const result = await runDoctor({ cwd: root });
    expect(result.ok).toBe(false);
    expect(result.messages.join("\n")).toContain("project.id");
  });
});
```

- [ ] **Step 2: Implement refresh**

Create `src/commands/refresh.ts`:

```ts
import { writeFile } from "node:fs/promises";
import { statePath } from "../utils/fs";
import { createScanFindings } from "../findings/diff";
import { renderReportHtml } from "../render/report";
import { scanRepository } from "../scan";
import { readStatusFile, writeStatusFile } from "../state/io";
import { calculateProjectProgress } from "../state/progress";

export type RefreshOptions = {
  cwd: string;
  servedMode: boolean;
};

export type RefreshResult = {
  reportPath: string;
  findingCount: number;
};

export async function runRefresh(options: RefreshOptions): Promise<RefreshResult> {
  const status = await readStatusFile(options.cwd);
  const scan = await scanRepository(options.cwd);
  const findings = createScanFindings(status, scan);
  const nextStatus = {
    ...status,
    project: { ...status.project, sourcePath: options.cwd, updatedAt: new Date().toISOString() },
    scanFindings: findings,
  };
  await writeStatusFile(options.cwd, nextStatus);
  const reportPath = statePath(options.cwd, "report.html");
  await writeFile(
    reportPath,
    renderReportHtml(nextStatus, {
      progress: calculateProjectProgress(nextStatus.features),
      servedMode: options.servedMode,
    }),
    "utf8",
  );
  return { reportPath, findingCount: findings.length };
}
```

- [ ] **Step 3: Implement doctor**

Create `src/commands/doctor.ts`:

```ts
import { access, readFile } from "node:fs/promises";
import { statePath } from "../utils/fs";
import { parseJsonObject } from "../utils/json";
import { validateStatus } from "../state/validate";

export type DoctorResult = {
  ok: boolean;
  messages: string[];
};

export async function runDoctor(options: { cwd: string }): Promise<DoctorResult> {
  const statusPath = statePath(options.cwd, "status.json");
  try {
    await access(statusPath);
  } catch {
    return {
      ok: false,
      messages: ["Missing .codex-architecture/status.json. Run codex-architecture init."],
    };
  }

  const parsed = parseJsonObject(await readFile(statusPath, "utf8"), statusPath);
  const validation = validateStatus(parsed);
  if (!validation.ok) {
    return {
      ok: false,
      messages: validation.errors.map((error) => `${error.path}: ${error.message}`),
    };
  }

  return { ok: true, messages: ["status.json is valid."] };
}
```

- [ ] **Step 4: Wire commands into CLI**

Modify `src/cli.ts` so `runCli` dispatches `refresh` and `doctor`:

```ts
import { runDoctor } from "./commands/doctor";
import { runRefresh } from "./commands/refresh";

export type CliIO = {
  cwd: string;
  stdout: (line: string) => void;
  stderr: (line: string) => void;
};

export type CliResult = {
  exitCode: number;
};

const HELP = `codex-architecture

Commands:
  codex-architecture init
  codex-architecture refresh
  codex-architecture serve
  codex-architecture update --from-codex-summary <file>
  codex-architecture doctor
`;

export async function runCli(args: string[], io: CliIO): Promise<CliResult> {
  const [command] = args;

  if (!command || command === "--help" || command === "-h") {
    io.stdout(HELP);
    return { exitCode: 0 };
  }

  if (command === "refresh") {
    const result = await runRefresh({ cwd: io.cwd, servedMode: false });
    io.stdout(`Report written: ${result.reportPath}`);
    io.stdout(`Scan findings: ${result.findingCount}`);
    return { exitCode: 0 };
  }

  if (command === "doctor") {
    const result = await runDoctor({ cwd: io.cwd });
    for (const message of result.messages) {
      (result.ok ? io.stdout : io.stderr)(message);
    }
    return { exitCode: result.ok ? 0 : 1 };
  }

  if (["init", "serve", "update"].includes(command)) {
    io.stderr(`Command unavailable in current scaffold: ${command}`);
    return { exitCode: 1 };
  }

  io.stderr(`Unknown command: ${command}`);
  io.stderr(HELP);
  return { exitCode: 1 };
}
```

- [ ] **Step 5: Run tests**

Run: `npm test -- tests/commands/refresh.test.ts tests/commands/doctor.test.ts tests/commands/cli.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/commands/refresh.ts src/commands/doctor.ts src/cli.ts tests/commands/refresh.test.ts tests/commands/doctor.test.ts
git commit -m "feat: add refresh and doctor commands"
```

## Task 8: Implement Init and Update Commands

**Files:**
- Create: `src/commands/init.ts`
- Create: `src/commands/update.ts`
- Modify: `src/cli.ts`
- Create: `tests/commands/init.test.ts`
- Create: `tests/commands/update.test.ts`

- [ ] **Step 1: Write init test**

Create `tests/commands/init.test.ts`:

```ts
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runInit } from "../../src/commands/init";
import { readStatusFile } from "../../src/state/io";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "codex-arch-init-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("runInit", () => {
  it("creates initial confirmed status from explicit answers", async () => {
    await runInit({
      cwd: root,
      answers: {
        projectId: "demo",
        projectName: "Demo",
        goal: "Track project architecture",
        phase: "planning",
        features: ["Authentication", "Admin console"],
      },
    });

    const status = await readStatusFile(root);
    expect(status.project.name).toBe("Demo");
    expect(status.features.map((feature) => feature.name)).toEqual(["Authentication", "Admin console"]);
    expect(status.features[0].percent).toBe(0);
  });
});
```

- [ ] **Step 2: Write update test**

Create `tests/commands/update.test.ts`:

```ts
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runInit } from "../../src/commands/init";
import { runUpdate } from "../../src/commands/update";
import { readStatusFile } from "../../src/state/io";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "codex-arch-update-"));
  await runInit({
    cwd: root,
    answers: {
      projectId: "demo",
      projectName: "Demo",
      goal: "Track project architecture",
      phase: "build",
      features: ["API keys"],
    },
  });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("runUpdate", () => {
  it("updates features and appends event from a JSON summary", async () => {
    const summaryPath = join(root, "summary.json");
    await writeFile(
      summaryPath,
      JSON.stringify({
        summary: "Implemented API key creation",
        featureUpdates: [{ id: "api-keys", status: "in_progress", percent: 70 }],
        moduleUpdates: [{ id: "api", name: "API", kind: "backend", status: "in_progress", percent: 70 }],
        interfaceUpdates: [{ id: "POST:/v1/api-keys", name: "Create key", method: "POST", path: "/v1/api-keys", purpose: "Create API key" }],
        verification: ["npm test"],
      }),
      "utf8",
    );

    await runUpdate({ cwd: root, summaryPath });
    const status = await readStatusFile(root);

    expect(status.features[0].percent).toBe(70);
    expect(status.modules[0].name).toBe("API");
    expect(status.interfaces[0].path).toBe("/v1/api-keys");
    await expect(readFile(join(root, ".codex-architecture", "events.jsonl"), "utf8")).resolves.toContain("Implemented API key creation");
  });
});
```

- [ ] **Step 3: Implement init**

Create `src/commands/init.ts`:

```ts
import { writeStatusFile } from "../state/io";
import type { ArchitectureStatus, FeatureStatus } from "../state/types";

export type InitAnswers = {
  projectId: string;
  projectName: string;
  goal: string;
  phase: string;
  features: string[];
};

export async function runInit(options: { cwd: string; answers: InitAnswers }): Promise<ArchitectureStatus> {
  const features: FeatureStatus[] = options.answers.features.map((name) => ({
    id: slug(name),
    name,
    purpose: name,
    status: "not_started",
    percent: 0,
    acceptance: [],
    moduleIds: [],
    interfaceIds: [],
    riskIds: [],
    evidenceIds: [],
  }));

  const status: ArchitectureStatus = {
    schemaVersion: 1,
    project: {
      id: options.answers.projectId,
      name: options.answers.projectName,
      goal: options.answers.goal,
      phase: options.answers.phase,
      sourcePath: options.cwd,
      updatedAt: new Date().toISOString(),
    },
    features,
    modules: [],
    interfaces: [],
    flows: [],
    risks: [],
    evidence: [],
    scanFindings: [],
  };

  await writeStatusFile(options.cwd, status);
  return status;
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
```

- [ ] **Step 4: Implement update**

Create `src/commands/update.ts`:

```ts
import { readFile } from "node:fs/promises";
import { parseJsonObject } from "../utils/json";
import { appendEvent, readStatusFile, writeStatusFile } from "../state/io";
import type { ArchitectureStatus, InterfaceStatus, ModuleStatus, WorkStatus } from "../state/types";

type Summary = {
  summary: string;
  featureUpdates?: Array<{ id: string; status: WorkStatus; percent: number }>;
  moduleUpdates?: Array<{ id: string; name: string; kind: ModuleStatus["kind"]; status: WorkStatus; percent: number }>;
  interfaceUpdates?: Array<{ id: string; name: string; method?: string; path?: string; purpose: string }>;
  verification?: string[];
};

export async function runUpdate(options: { cwd: string; summaryPath: string }): Promise<ArchitectureStatus> {
  const status = await readStatusFile(options.cwd);
  const summary = parseJsonObject(await readFile(options.summaryPath, "utf8"), options.summaryPath) as Summary;

  const next: ArchitectureStatus = {
    ...status,
    project: { ...status.project, updatedAt: new Date().toISOString() },
    features: status.features.map((feature) => {
      const update = summary.featureUpdates?.find((item) => item.id === feature.id);
      return update ? { ...feature, status: update.status, percent: update.percent } : feature;
    }),
    modules: upsertModules(status.modules, summary.moduleUpdates ?? []),
    interfaces: upsertInterfaces(status.interfaces, summary.interfaceUpdates ?? []),
  };

  await writeStatusFile(options.cwd, next);
  await appendEvent(options.cwd, {
    timestamp: next.project.updatedAt,
    summary: summary.summary,
    featureIds: summary.featureUpdates?.map((item) => item.id) ?? [],
    moduleIds: summary.moduleUpdates?.map((item) => item.id) ?? [],
    interfaceIds: summary.interfaceUpdates?.map((item) => item.id) ?? [],
    verification: summary.verification ?? [],
    riskChanges: [],
  });
  return next;
}

function upsertModules(existing: ModuleStatus[], updates: Summary["moduleUpdates"]): ModuleStatus[] {
  const map = new Map(existing.map((item) => [item.id, item]));
  for (const update of updates ?? []) {
    map.set(update.id, {
      ...map.get(update.id),
      id: update.id,
      name: update.name,
      kind: update.kind,
      status: update.status,
      percent: update.percent,
      dependsOn: map.get(update.id)?.dependsOn ?? [],
      evidenceIds: map.get(update.id)?.evidenceIds ?? [],
    });
  }
  return Array.from(map.values());
}

function upsertInterfaces(existing: InterfaceStatus[], updates: Summary["interfaceUpdates"]): InterfaceStatus[] {
  const map = new Map(existing.map((item) => [item.id, item]));
  for (const update of updates ?? []) {
    map.set(update.id, {
      ...map.get(update.id),
      id: update.id,
      name: update.name,
      kind: "http",
      method: update.method,
      path: update.path,
      purpose: update.purpose,
      callerIds: map.get(update.id)?.callerIds ?? [],
      calleeIds: map.get(update.id)?.calleeIds ?? [],
      featureIds: map.get(update.id)?.featureIds ?? [],
      testStatus: map.get(update.id)?.testStatus ?? "unknown",
      evidenceIds: map.get(update.id)?.evidenceIds ?? [],
    });
  }
  return Array.from(map.values());
}
```

- [ ] **Step 5: Wire commands into CLI**

Modify `src/cli.ts`:

```ts
import { runDoctor } from "./commands/doctor";
import { runInit, type InitAnswers } from "./commands/init";
import { runRefresh } from "./commands/refresh";
import { runUpdate } from "./commands/update";
import { parseJsonObject } from "./utils/json";
import { readFile } from "node:fs/promises";

// Keep existing CliIO, CliResult, and HELP definitions.

// Add these branches before the existing "not implemented" branch:
if (command === "init") {
  const answersFile = valueAfter(args, "--answers");
  if (!answersFile) {
    io.stderr("Missing --answers <file>. Ask the user for project details, write an answers JSON file, then pass --answers <file>.");
    return { exitCode: 1 };
  }
  const answers = parseJsonObject(await readFile(answersFile, "utf8"), answersFile) as InitAnswers;
  await runInit({ cwd: io.cwd, answers });
  io.stdout("Initialized .codex-architecture/status.json");
  return { exitCode: 0 };
}

if (command === "update") {
  const summaryPath = valueAfter(args, "--from-codex-summary");
  if (!summaryPath) {
    io.stderr("Missing --from-codex-summary <file>");
    return { exitCode: 1 };
  }
  await runUpdate({ cwd: io.cwd, summaryPath });
  io.stdout("Updated architecture status from Codex summary");
  return { exitCode: 0 };
}

function valueAfter(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}
```

- [ ] **Step 6: Run tests**

Run: `npm test -- tests/commands/init.test.ts tests/commands/update.test.ts tests/commands/cli.test.ts`

Expected: PASS after merging the snippets into the current `src/cli.ts` without duplicating imports or helper declarations.

- [ ] **Step 7: Commit**

```bash
git add src/commands/init.ts src/commands/update.ts src/cli.ts tests/commands/init.test.ts tests/commands/update.test.ts
git commit -m "feat: initialize and update architecture status"
```

## Task 9: Implement Task-Scoped Viewer Server

**Files:**
- Create: `src/commands/serve.ts`
- Modify: `src/cli.ts`
- Create: `tests/commands/serve.test.ts`

- [ ] **Step 1: Write serve test**

Create `tests/commands/serve.test.ts`:

```ts
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runInit } from "../../src/commands/init";
import { startViewerServer } from "../../src/commands/serve";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "codex-arch-serve-"));
  await runInit({
    cwd: root,
    answers: {
      projectId: "demo",
      projectName: "Demo",
      goal: "Demo",
      phase: "build",
      features: [],
    },
  });
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("startViewerServer", () => {
  it("serves the report and refreshes on POST /refresh", async () => {
    const server = await startViewerServer({ cwd: root, port: 0 });
    try {
      const page = await fetch(`${server.url}/`);
      expect(await page.text()).toContain("Demo");

      const refresh = await fetch(`${server.url}/refresh`, { method: "POST" });
      expect(refresh.status).toBe(200);
      expect(await refresh.text()).toContain("refreshed");
    } finally {
      await server.close();
    }
  });
});
```

- [ ] **Step 2: Implement server**

Create `src/commands/serve.ts`:

```ts
import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { statePath } from "../utils/fs";
import { runRefresh } from "./refresh";

export type ViewerServer = {
  url: string;
  close: () => Promise<void>;
};

export async function startViewerServer(options: { cwd: string; port: number }): Promise<ViewerServer> {
  await runRefresh({ cwd: options.cwd, servedMode: true });

  const server: Server = createServer(async (req, res) => {
    try {
      if (req.method === "POST" && req.url === "/refresh") {
        await runRefresh({ cwd: options.cwd, servedMode: true });
        res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
        res.end("refreshed");
        return;
      }

      if (req.method === "GET" && (req.url === "/" || req.url === "/report.html")) {
        const html = await readFile(statePath(options.cwd, "report.html"), "utf8");
        res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
        res.end(html);
        return;
      }

      res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      res.end("not found");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end(message);
    }
  });

  await new Promise<void>((resolve) => server.listen(options.port, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Viewer server did not expose a TCP address");
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}
```

- [ ] **Step 3: Wire serve into CLI**

Modify `src/cli.ts`:

```ts
import { startViewerServer } from "./commands/serve";

// Add this branch before the unknown-command branch:
if (command === "serve") {
  const portValue = valueAfter(args, "--port");
  const server = await startViewerServer({ cwd: io.cwd, port: portValue ? Number(portValue) : 0 });
  io.stdout(`Viewer running: ${server.url}`);
  io.stdout("Press Ctrl+C to stop.");
  return new Promise<CliResult>((resolve) => {
    const stop = async () => {
      await server.close();
      resolve({ exitCode: 0 });
    };
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
  });
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/commands/serve.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/commands/serve.ts src/cli.ts tests/commands/serve.test.ts
git commit -m "feat: serve report with manual refresh endpoint"
```

## Task 10: Add Codex Plugin Skill Wrapper

**Files:**
- Create: `.codex-plugin/plugin.json`
- Create: `skills/dynamic-architecture/SKILL.md`
- Create: `tests/plugin/skill.test.ts`

- [ ] **Step 1: Write plugin metadata test**

Create `tests/plugin/skill.test.ts`:

```ts
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Codex plugin files", () => {
  it("declares plugin metadata and dynamic architecture skill", async () => {
    const plugin = JSON.parse(await readFile(".codex-plugin/plugin.json", "utf8")) as {
      name: string;
      version: string;
      description: string;
    };
    const skill = await readFile("skills/dynamic-architecture/SKILL.md", "utf8");

    expect(plugin.name).toBe("codex-dynamic-architecture");
    expect(plugin.version).toBe("0.1.0");
    expect(plugin.description).toContain("dynamic architecture");
    expect(skill).toContain("codex-architecture refresh");
    expect(skill).toContain("codex-architecture serve");
    expect(skill).toContain("Never store secrets");
  });
});
```

- [ ] **Step 2: Create plugin metadata**

Create `.codex-plugin/plugin.json`:

```json
{
  "name": "codex-dynamic-architecture",
  "version": "0.1.0",
  "description": "Codex plugin for generating a dynamic architecture and progress supervision report for the current repository.",
  "skills": [
    {
      "name": "dynamic-architecture",
      "path": "skills/dynamic-architecture/SKILL.md"
    }
  ]
}
```

- [ ] **Step 3: Create skill instructions**

Create `skills/dynamic-architecture/SKILL.md`:

```markdown
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
   - Save answers to a temporary JSON file.
   - Run `codex-architecture init --answers <answers-file>`.
2. Run `codex-architecture refresh`.
3. If the user wants a clickable report with a working refresh button, run `codex-architecture serve`.
4. Give the user the report path or local viewer URL.

## After Codex Development Work

1. Write a short redacted JSON summary file with:
   - `summary`
   - `featureUpdates`
   - `moduleUpdates`
   - `interfaceUpdates`
   - `verification`
2. Run `codex-architecture update --from-codex-summary <summary-file>`.
3. Run `codex-architecture refresh`.
4. Report what changed and whether any scan findings need confirmation.

## Commands

- `codex-architecture init --answers <answers-file>`
- `codex-architecture refresh`
- `codex-architecture serve`
- `codex-architecture update --from-codex-summary <summary-file>`
- `codex-architecture doctor`
```

- [ ] **Step 4: Run tests**

Run: `npm test -- tests/plugin/skill.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add .codex-plugin/plugin.json skills/dynamic-architecture/SKILL.md tests/plugin/skill.test.ts
git commit -m "feat: add Codex plugin skill wrapper"
```

## Task 11: Add End-to-End Workflow Test and Usage Docs

**Files:**
- Create: `tests/integration/workflow.test.ts`
- Create: `docs/usage.md`
- Modify: `README.md`

- [ ] **Step 1: Write workflow test**

Create `tests/integration/workflow.test.ts`:

```ts
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runDoctor } from "../../src/commands/doctor";
import { runInit } from "../../src/commands/init";
import { runRefresh } from "../../src/commands/refresh";
import { runUpdate } from "../../src/commands/update";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "codex-arch-workflow-"));
  await writeFile(join(root, "package.json"), "{\"name\":\"workflow-fixture\"}", "utf8");
  await writeFile(join(root, "routes.ts"), "app.post('/v1/api-keys', handler)", "utf8");
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("architecture workflow", () => {
  it("runs init, update, refresh, and doctor", async () => {
    await runInit({
      cwd: root,
      answers: {
        projectId: "workflow",
        projectName: "Workflow",
        goal: "Verify architecture workflow",
        phase: "build",
        features: ["API keys"],
      },
    });

    const summaryPath = join(root, "summary.json");
    await writeFile(
      summaryPath,
      JSON.stringify({
        summary: "Implemented API key route",
        featureUpdates: [{ id: "api-keys", status: "in_progress", percent: 50 }],
        moduleUpdates: [{ id: "api", name: "API", kind: "backend", status: "in_progress", percent: 50 }],
        interfaceUpdates: [{ id: "POST:/v1/api-keys", name: "Create key", method: "POST", path: "/v1/api-keys", purpose: "Create API key" }],
        verification: ["npm test"],
      }),
      "utf8",
    );
    await runUpdate({ cwd: root, summaryPath });
    const refresh = await runRefresh({ cwd: root, servedMode: false });
    const doctor = await runDoctor({ cwd: root });

    expect(doctor.ok).toBe(true);
    await expect(readFile(refresh.reportPath, "utf8")).resolves.toContain("Workflow");
  });
});
```

- [ ] **Step 2: Create usage docs**

Create `docs/usage.md`:

```markdown
# Codex Dynamic Architecture Usage

## Initialize a Repository

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
codex-architecture refresh
```

Open `.codex-architecture/report.html`.

## Use the Clickable Viewer

Run:

```bash
codex-architecture serve
```

Open the printed local URL. The page refresh button works in served mode.

## Update After Codex Development

Create a redacted summary JSON file and run:

```bash
codex-architecture update --from-codex-summary summary.json
codex-architecture refresh
```

Do not include secrets, raw logs, environment variable values, or full transcripts in the summary.
```

Create `README.md`:

```markdown
# Codex Dynamic Architecture Plugin

Codex plugin and local CLI for generating a project-local architecture and progress supervision report.

See `docs/usage.md` for commands.
```

- [ ] **Step 3: Run full verification**

Run: `npm run typecheck`

Expected: PASS.

Run: `npm test`

Expected: PASS.

Run: `npm run build`

Expected: PASS and `dist/src/cli.js` exists.

- [ ] **Step 4: Commit**

```bash
git add tests/integration/workflow.test.ts docs/usage.md README.md
git commit -m "test: cover architecture workflow"
```

## Task 12: Final Verification and Handoff

**Files:**
- Modify only if verification reveals a concrete bug.

- [ ] **Step 1: Run final checks**

Run:

```bash
npm run typecheck
npm test
npm run build
git diff --check
git status --short
```

Expected:

- `npm run typecheck`: PASS.
- `npm test`: PASS.
- `npm run build`: PASS.
- `git diff --check`: no output.
- `git status --short`: clean or only intentional untracked local artifacts.

- [ ] **Step 2: Verify CLI manually on a temp fixture**

Run:

```bash
tmpdir="$(mktemp -d)"
printf '{"projectId":"manual","projectName":"Manual","goal":"Manual smoke","phase":"build","features":["Architecture report"]}\n' > "$tmpdir/answers.json"
node dist/src/cli.js init --answers "$tmpdir/answers.json"
node dist/src/cli.js refresh
test -f .codex-architecture/report.html
```

Expected:

- `status.json` is created.
- `report.html` is created.
- No secrets or raw logs are written.

- [ ] **Step 3: Commit any verification fixes**

If Step 1 or Step 2 required fixes, commit them:

```bash
git add <changed-files>
git commit -m "fix: complete architecture plugin verification"
```

- [ ] **Step 4: Handoff summary**

Report:

- Commands run and outcomes.
- Final report path behavior.
- Whether a viewer server was started and whether it was stopped.
- Any known first-version limitations, especially static HTML refresh fallback and TypeScript/Node-first scanning.
