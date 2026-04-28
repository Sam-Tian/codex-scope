import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runInit } from "../../src/commands/init.js";
import { startViewerServer } from "../../src/commands/serve.js";

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
      expect(page.status).toBe(200);
      expect(await page.text()).toContain("Demo");

      const refresh = await fetch(`${server.url}/refresh`, { method: "POST" });
      expect(refresh.status).toBe(200);
      expect(await refresh.text()).toContain("refreshed");
    } finally {
      await server.close();
    }
  });
});
