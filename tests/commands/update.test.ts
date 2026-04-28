import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runInit } from "../../src/commands/init.js";
import { runUpdate } from "../../src/commands/update.js";
import { readStatusFile } from "../../src/state/io.js";

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
    const status = await readStatusFile(root);

    expect(status.features[0]?.percent).toBe(70);
    expect(status.modules[0]?.name).toBe("API");
    expect(status.interfaces[0]?.path).toBe("/v1/api-keys");
    await expect(readFile(join(root, ".codex-architecture", "events.jsonl"), "utf8")).resolves.toContain(
      "Implemented API key creation",
    );
  });

  it("preserves existing interface method and path when summary omits them", async () => {
    const firstSummaryPath = join(root, "summary-1.json");
    const secondSummaryPath = join(root, "summary-2.json");
    await writeFile(
      firstSummaryPath,
      JSON.stringify({
        summary: "Added API key endpoint",
        interfaceUpdates: [
          {
            id: "POST:/v1/api-keys",
            name: "Create key",
            method: "POST",
            path: "/v1/api-keys",
            purpose: "Create API key",
          },
        ],
      }),
      "utf8",
    );
    await runUpdate({ cwd: root, summaryPath: firstSummaryPath });
    await writeFile(
      secondSummaryPath,
      JSON.stringify({
        summary: "Clarified API key endpoint purpose",
        interfaceUpdates: [
          {
            id: "POST:/v1/api-keys",
            name: "Create key",
            purpose: "Create API key for dashboard users",
          },
        ],
      }),
      "utf8",
    );

    await runUpdate({ cwd: root, summaryPath: secondSummaryPath });
    const status = await readStatusFile(root);

    expect(status.interfaces[0]?.method).toBe("POST");
    expect(status.interfaces[0]?.path).toBe("/v1/api-keys");
    expect(status.interfaces[0]?.purpose).toBe("Create API key for dashboard users");
  });
});
