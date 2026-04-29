import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { scanRepository } from "../../src/scan/index.js";

let root: string;

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "codex-arch-scan-config-"));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("scanRepository config", () => {
  it("uses additive ignoreDirs and ignorePathPrefixes from .codex-architecture/config.json", async () => {
    await mkdir(join(root, ".codex-architecture"), { recursive: true });
    await mkdir(join(root, "src"), { recursive: true });
    await mkdir(join(root, "fixtures", "generated"), { recursive: true });
    await mkdir(join(root, "apps", "legacy-api"), { recursive: true });
    await writeFile(
      join(root, ".codex-architecture", "config.json"),
      JSON.stringify({
        scan: {
          ignoreDirs: ["fixtures"],
          ignorePathPrefixes: ["apps/legacy-api/"],
        },
      }),
      "utf8",
    );
    await writeFile(join(root, "src", "routes.ts"), 'app.get("/v1/live", handler);\n', "utf8");
    await writeFile(join(root, "fixtures", "generated", "routes.ts"), 'app.get("/v1/generated", handler);\n', "utf8");
    await writeFile(join(root, "apps", "legacy-api", "routes.ts"), 'app.get("/v1/legacy", handler);\n', "utf8");

    const result = await scanRepository(root);

    expect(result.interfaces.map((item) => item.path)).toEqual(["/v1/live"]);
    expect(result.sourceFiles).not.toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^fixtures\//),
        expect.stringMatching(/^apps\/legacy-api\//),
      ]),
    );
  });
});
