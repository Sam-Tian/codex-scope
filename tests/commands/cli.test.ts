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
});
