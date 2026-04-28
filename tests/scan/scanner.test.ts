import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scanRepository } from "../../src/scan/index.js";

const fixtureRoot = join(process.cwd(), "tests/fixtures/ts-node-app");

describe("scanRepository", () => {
  it("detects package metadata, tests, routes, and HTTP clients", async () => {
    const result = await scanRepository(fixtureRoot);

    expect(result.packageName).toBe("fixture-ts-node-app");
    expect(result.testFiles).toContain("tests/routes.test.ts");
    expect(result.interfaces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: "GET", path: "/v1/projects", sourcePath: "src/routes.ts" }),
        expect.objectContaining({ method: "POST", path: "/v1/api-keys", sourcePath: "src/routes.ts" }),
      ]),
    );
    expect(result.calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ method: "GET", path: "/v1/projects", sourcePath: "src/client.ts" }),
        expect.objectContaining({ method: "POST", path: "/v1/api-keys", sourcePath: "src/client.ts" }),
      ]),
    );
  });
});
