import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runCli, type CliResult } from "../../src/cli.js";
import type { ArchitectureStatus } from "../../src/state/types.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "codex-arch-workflow-"));
  await writeFile(join(root, "package.json"), "{\"name\":\"workflow-fixture\"}", "utf8");
  await writeFile(
    join(root, "routes.ts"),
    ["app.post('/v1/api-keys', handler)", "app.get('/v1/scan-only', handler)"].join("\n"),
    "utf8",
  );
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("architecture workflow", () => {
  it("runs init, update, refresh, and doctor", async () => {
    const answersPath = join(root, "answers.json");
    await writeFile(
      answersPath,
      JSON.stringify({
        projectId: "workflow",
        projectName: "Workflow",
        goal: "Verify architecture workflow",
        phase: "build",
        features: ["API keys"],
      }),
      "utf8",
    );
    const init = await runWorkflowCommand(["init", "--answers", answersPath]);
    expect(init.result.exitCode).toBe(0);
    expect(init.output.join("\n")).toContain("Initialized .codex-architecture/status.json");

    const summaryPath = join(root, "summary.json");
    await writeFile(
      summaryPath,
      JSON.stringify({
        summary: "Implemented API key route",
        featureUpdates: [{ id: "api-keys", status: "in_progress", percent: 50 }],
        moduleUpdates: [{ id: "api", name: "API", kind: "backend", status: "in_progress", percent: 50 }],
        interfaceUpdates: [
          {
            id: "POST:/v1/api-keys",
            name: "Create key",
            method: "POST",
            path: "/v1/api-keys",
            purpose: "Create API key",
          },
        ],
        verification: ["npm test"],
      }),
      "utf8",
    );
    const update = await runWorkflowCommand(["update", "--from-codex-summary", summaryPath]);
    const refresh = await runWorkflowCommand(["refresh"]);
    const doctor = await runWorkflowCommand(["doctor"]);
    const report = await readFile(join(root, ".codex-architecture", "report.html"), "utf8");
    const status = JSON.parse(
      await readFile(join(root, ".codex-architecture", "status.json"), "utf8"),
    ) as ArchitectureStatus;

    expect(update.result.exitCode).toBe(0);
    expect(refresh.result.exitCode).toBe(0);
    expect(refresh.output.join("\n")).toContain("Scan findings: 1");
    expect(doctor.result.exitCode).toBe(0);
    expect(status.scanFindings).toHaveLength(1);
    expect(status.scanFindings[0]).toEqual(
      expect.objectContaining({
        kind: "missing_in_status",
        title: "Scanned interface is not recorded: GET /v1/scan-only",
      }),
    );
    expect(report).toContain("Workflow");
    expect(report).toContain("POST /v1/api-keys");
    expect(report).toContain("Scanned interface is not recorded: GET /v1/scan-only");
    expect(report).toContain("routes.ts");
  });
});

async function runWorkflowCommand(args: string[]): Promise<{
  result: CliResult;
  output: string[];
  errors: string[];
}> {
  const output: string[] = [];
  const errors: string[] = [];
  const result = await runCli(args, {
    cwd: root,
    stdout: (line) => output.push(line),
    stderr: (line) => errors.push(line),
  });
  return { result, output, errors };
}
