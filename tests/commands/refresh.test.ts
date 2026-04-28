import { mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runRefresh } from "../../src/commands/refresh.js";
import { writeStatusFile } from "../../src/state/io.js";
import type { ArchitectureStatus } from "../../src/state/types.js";

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
      project: {
        id: "demo",
        name: "Demo",
        goal: "Demo",
        phase: "build",
        sourcePath: root,
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
    await writeStatusFile(root, status);

    const result = await runRefresh({ cwd: root, servedMode: false });

    expect(result.reportPath.endsWith(".codex-architecture/report.html")).toBe(true);
    expect(result.findingCount).toBe(0);
    await expect(readFile(result.reportPath, "utf8")).resolves.toContain("Demo");
  });

  it("does not report confirmed routes missing in code when scanning fails", async () => {
    const status: ArchitectureStatus = {
      schemaVersion: 1,
      project: {
        id: "demo",
        name: "Demo",
        goal: "Demo",
        phase: "build",
        sourcePath: root,
        updatedAt: "2026-04-28T00:00:00.000Z",
      },
      features: [],
      modules: [],
      interfaces: [
        {
          id: "GET:/v1/known",
          name: "Known route",
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
    await writeStatusFile(root, status);
    await symlink(join(root, "missing.ts"), join(root, "broken.ts"));

    const result = await runRefresh({ cwd: root, servedMode: false });
    const nextStatus = JSON.parse(await readFile(join(root, ".codex-architecture/status.json"), "utf8")) as ArchitectureStatus;

    expect(result.findingCount).toBe(1);
    expect(nextStatus.scanFindings).toEqual([
      expect.objectContaining({
        kind: "scan_error",
        severity: "error",
      }),
    ]);
    expect(nextStatus.scanFindings.some((finding) => finding.kind === "missing_in_code")).toBe(false);
  });
});
