import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Codex plugin files", () => {
  it("declares plugin metadata and dynamic architecture skill", async () => {
    const plugin = JSON.parse(await readFile(".codex-plugin/plugin.json", "utf8")) as {
      name: string;
      version: string;
      description: string;
      skills: string;
      interface: {
        displayName: string;
        shortDescription: string;
        category: string;
        capabilities: string[];
        defaultPrompt: string[];
      };
    };
    const skill = await readFile(join(plugin.skills, "dynamic-architecture/SKILL.md"), "utf8");

    expect(plugin.name).toBe("codex-dynamic-architecture");
    expect(plugin.version).toBe("0.1.0");
    expect(plugin.description).toContain("dynamic architecture");
    expect(plugin.skills).toBe("./skills/");
    expect(plugin.interface.displayName).toBe("Dynamic Architecture");
    expect(plugin.interface.shortDescription).toContain("architecture");
    expect(plugin.interface.category).toBe("Productivity");
    expect(plugin.interface.capabilities).toContain("Write");
    expect(plugin.interface.defaultPrompt).toHaveLength(3);
    expect(skill).toContain("name: dynamic-architecture");
    expect(skill).toContain("description: Generate");
    expect(skill).toContain("codex-architecture doctor");
    expect(skill).toContain("codex-architecture refresh");
    expect(skill).toContain("codex-architecture serve");
    expect(skill).toContain("Never store secrets");
    expect(skill).toContain("task-scoped local server");
  });
});
