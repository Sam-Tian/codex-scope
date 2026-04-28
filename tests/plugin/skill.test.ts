import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Codex plugin files", () => {
  it("declares plugin metadata and dynamic architecture skill", async () => {
    const plugin = JSON.parse(await readFile(".codex-plugin/plugin.json", "utf8")) as {
      name: string;
      version: string;
      description: string;
    };
    const skill = await readFile("skills/dynamic-architecture/SKILL.md", "utf8");

    expect(plugin.name).toBe("codex-dynamic-architecture");
    expect(plugin.version).toBe("0.1.0");
    expect(plugin.description).toContain("dynamic architecture");
    expect(skill).toContain("codex-architecture refresh");
    expect(skill).toContain("codex-architecture serve");
    expect(skill).toContain("Never store secrets");
  });
});
