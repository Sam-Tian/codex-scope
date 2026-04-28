import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runDoctor } from "../../src/commands/doctor.js";

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
      messages: ["Missing .codex-architecture/status.json. Run codex-scope init."],
    });
  });

  it("reports invalid status file fields", async () => {
    await mkdir(join(root, ".codex-architecture"), { recursive: true });
    await writeFile(join(root, ".codex-architecture/status.json"), "{\"schemaVersion\":1}", "utf8");

    const result = await runDoctor({ cwd: root });
    expect(result.ok).toBe(false);
    expect(result.messages.join("\n")).toContain("project.id");
  });

  it("reports malformed status JSON", async () => {
    await mkdir(join(root, ".codex-architecture"), { recursive: true });
    await writeFile(join(root, ".codex-architecture/status.json"), "{nope", "utf8");

    const result = await runDoctor({ cwd: root });

    expect(result.ok).toBe(false);
    expect(result.messages.join("\n")).toContain("Invalid JSON");
  });
});
