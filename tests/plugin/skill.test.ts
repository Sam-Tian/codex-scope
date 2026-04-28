import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Codex plugin files", () => {
  it("declares codex-scope package, plugin, and skill metadata", async () => {
    const pkg = JSON.parse(await readFile("package.json", "utf8")) as {
      name: string;
      bin: Record<string, string>;
    };
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
    const skill = await readFile(join(plugin.skills, "codex-scope/SKILL.md"), "utf8");

    expect(pkg.name).toBe("codex-scope");
    expect(pkg.bin).toEqual({ "codex-scope": "./bin/codex-scope.js" });
    await expect(access("bin/codex-scope.js")).resolves.toBeUndefined();
    expect(plugin.name).toBe("codex-scope");
    expect(plugin.version).toBe("0.1.0");
    expect(plugin.description).toContain("dynamic architecture");
    expect(plugin.skills).toBe("./skills/");
    expect(plugin.interface.displayName).toBe("CodexScope");
    expect(plugin.interface.shortDescription).toContain("architecture");
    expect(plugin.interface.category).toBe("Productivity");
    expect(plugin.interface.capabilities).toContain("Write");
    expect(plugin.interface.defaultPrompt).toHaveLength(3);
    expect(skill).toContain("name: codex-scope");
    expect(skill).toContain("description: Generate");
    expect(skill).toContain("codex-scope doctor");
    expect(skill).toContain("codex-scope refresh");
    expect(skill).toContain("codex-scope serve");
    expect(skill).toContain("Never store secrets");
    expect(skill).toContain("task-scoped local server");
  });
});
