import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "../../src/cli.js";

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

  it("returns a stable failure result for command errors", async () => {
    const errors: string[] = [];
    const result = await runCli(["refresh"], {
      cwd: process.cwd(),
      stdout: () => undefined,
      stderr: (line) => errors.push(line),
    });

    expect(result.exitCode).toBe(1);
    expect(errors.join("\n")).toContain("Missing .codex-architecture/status.json");
  });

  it("initializes status from an answers file", async () => {
    const root = await mkdtemp(join(tmpdir(), "codex-arch-cli-init-"));
    try {
      const answersPath = join(root, "answers.json");
      await writeFile(
        answersPath,
        JSON.stringify({
          projectId: "demo",
          projectName: "Demo",
          goal: "Track architecture",
          phase: "planning",
          features: ["API keys"],
        }),
        "utf8",
      );
      const output: string[] = [];

      const result = await runCli(["init", "--answers", answersPath], {
        cwd: root,
        stdout: (line) => output.push(line),
        stderr: (line) => output.push(line),
      });

      expect(result.exitCode).toBe(0);
      expect(output.join("\n")).toContain("Initialized .codex-architecture/status.json");
      await expect(readFile(join(root, ".codex-architecture", "status.json"), "utf8")).resolves.toContain("API keys");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("rejects init without an answers file", async () => {
    const errors: string[] = [];
    const result = await runCli(["init"], {
      cwd: process.cwd(),
      stdout: () => undefined,
      stderr: (line) => errors.push(line),
    });

    expect(result.exitCode).toBe(1);
    expect(errors.join("\n")).toContain("Missing --answers <file>");
  });

  it("rejects init when the answers flag is followed by another flag", async () => {
    const errors: string[] = [];
    const result = await runCli(["init", "--answers", "--help"], {
      cwd: process.cwd(),
      stdout: () => undefined,
      stderr: (line) => errors.push(line),
    });

    expect(result.exitCode).toBe(1);
    expect(errors.join("\n")).toContain("Missing --answers <file>");
  });

  it("updates status from a Codex summary file", async () => {
    const root = await mkdtemp(join(tmpdir(), "codex-arch-cli-update-"));
    try {
      const answersPath = join(root, "answers.json");
      const summaryPath = join(root, "summary.json");
      await writeFile(
        answersPath,
        JSON.stringify({
          projectId: "demo",
          projectName: "Demo",
          goal: "Track architecture",
          phase: "build",
          features: ["API keys"],
        }),
        "utf8",
      );
      await writeFile(
        summaryPath,
        JSON.stringify({
          summary: "Implemented API key creation",
          featureUpdates: [{ id: "api-keys", status: "in_progress", percent: 70 }],
        }),
        "utf8",
      );
      await runCli(["init", "--answers", answersPath], {
        cwd: root,
        stdout: () => undefined,
        stderr: () => undefined,
      });
      const output: string[] = [];

      const result = await runCli(["update", "--from-codex-summary", summaryPath], {
        cwd: root,
        stdout: (line) => output.push(line),
        stderr: (line) => output.push(line),
      });

      expect(result.exitCode).toBe(0);
      expect(output.join("\n")).toContain("Updated architecture status from Codex summary");
      await expect(readFile(join(root, ".codex-architecture", "events.jsonl"), "utf8")).resolves.toContain(
        "Implemented API key creation",
      );
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
