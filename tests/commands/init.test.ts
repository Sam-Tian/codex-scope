import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runInit } from "../../src/commands/init.js";
import { readStatusFile } from "../../src/state/io.js";

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
    expect(status.features[0]?.percent).toBe(0);
  });

  it("falls back to stable feature ids when names cannot be slugged", async () => {
    await runInit({
      cwd: root,
      answers: {
        projectId: "demo",
        projectName: "Demo",
        goal: "Track project architecture",
        phase: "planning",
        features: ["!!!"],
      },
    });

    const status = await readStatusFile(root);
    expect(status.features[0]?.id).toBe("feature-1");
  });
});
