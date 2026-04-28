import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appendEvent, readStatusFile, writeStatusFile } from "../../src/state/io.js";
import type { ArchitectureStatus } from "../../src/state/types.js";

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
