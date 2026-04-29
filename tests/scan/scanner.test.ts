import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { scanRepository } from "../../src/scan/index.js";

const fixtureRoot = join(process.cwd(), "tests/fixtures/ts-node-app");
const aigpFixtureRoot = join(process.cwd(), "tests/fixtures/aigp-representative");

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

  it("detects AIGP-style route, OpenAPI, smoke, and doc evidence", async () => {
    const result = await scanRepository(aigpFixtureRoot);

    expect(result.interfaces).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          method: "GET",
          path: "/ops/overview",
          sourcePath: "apps/api/src/ops-overview.controller.ts",
        }),
        expect.objectContaining({
          method: "GET",
          path: "/ops/control-plane-users",
          sourcePath: "apps/api/src/control-plane-users.controller.ts",
        }),
        expect.objectContaining({
          method: "POST",
          path: "/v1/chat/completions",
          sourcePath: "services/gateway-go/internal/http/handlers/router.go",
        }),
        expect.objectContaining({
          method: "GET",
          path: "/api/ops-overview/report-archives",
          sourcePath: "openapi.yaml",
        }),
      ]),
    );
    expect(result.calls).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          method: "POST",
          path: "/v1/chat/completions",
          sourcePath: "scripts/smoke-chat-completions.mjs",
        }),
        expect.objectContaining({
          method: "GET",
          path: "/ops/overview",
          sourcePath: "scripts/smoke-ops-overview-browser.mjs",
        }),
      ]),
    );
    expect(result.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "route", method: "GET", path: "/ops/overview" }),
        expect.objectContaining({ kind: "route", method: "POST", path: "/v1/chat/completions" }),
        expect.objectContaining({ kind: "openapi", method: "GET", path: "/api/ops-overview/report-archives" }),
        expect.objectContaining({ kind: "script_call", method: "POST", path: "/v1/chat/completions" }),
        expect.objectContaining({ kind: "doc", method: "GET", path: "/ops/control-plane-users" }),
      ]),
    );
  });
});
