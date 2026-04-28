import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runDoctor } from "../../src/commands/doctor.js";
import { runInit } from "../../src/commands/init.js";
import { runRefresh } from "../../src/commands/refresh.js";
import { runUpdate } from "../../src/commands/update.js";

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
    await runUpdate({ cwd: root, summaryPath });
    const refresh = await runRefresh({ cwd: root, servedMode: false });
    const doctor = await runDoctor({ cwd: root });

    expect(doctor.ok).toBe(true);
    await expect(readFile(refresh.reportPath, "utf8")).resolves.toContain("Workflow");
    await expect(readFile(refresh.reportPath, "utf8")).resolves.toContain("POST /v1/api-keys");
  });
});
