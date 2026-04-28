import { describe, expect, it } from "vitest";
import { createScanFindings } from "../../src/findings/diff.js";
import type { ScanResult } from "../../src/scan/types.js";
import type { ArchitectureStatus } from "../../src/state/types.js";

const status: ArchitectureStatus = {
  schemaVersion: 1,
  project: {
    id: "demo",
    name: "Demo",
    goal: "Demo",
    phase: "build",
    sourcePath: "/demo",
    updatedAt: "2026-04-28T00:00:00.000Z",
  },
  features: [],
  modules: [],
  interfaces: [
    {
      id: "GET:/v1/known",
      name: "Known",
      kind: "http",
      method: "GET",
      path: "/v1/known",
      purpose: "Known route",
      callerIds: [],
      calleeIds: [],
      featureIds: [],
      testStatus: "unknown",
      evidenceIds: [],
    },
  ],
  flows: [],
  risks: [],
  evidence: [],
  scanFindings: [],
};

const scan: ScanResult = {
  root: "/demo",
  docs: [],
  testFiles: [],
  sourceFiles: [],
  interfaces: [
    { id: "GET:/v1/known", method: "GET", path: "/v1/known", sourcePath: "src/routes.ts", confidence: "medium" },
    { id: "POST:/v1/new", method: "POST", path: "/v1/new", sourcePath: "src/routes.ts", confidence: "medium" },
  ],
  calls: [],
  errors: [],
};

describe("createScanFindings", () => {
  it("proposes adding scanned routes missing from status", () => {
    expect(createScanFindings(status, scan)).toEqual([
      expect.objectContaining({
        kind: "missing_in_status",
        severity: "warning",
        title: "Scanned interface is not recorded: POST /v1/new",
        proposedAction:
          "Confirm whether POST /v1/new belongs in status.json, then add it with purpose, callers, callees, feature ownership, and test status.",
      }),
    ]);
  });

  it("proposes removing confirmed routes missing from scan", () => {
    const nextScan = { ...scan, interfaces: [] };
    expect(createScanFindings(status, nextScan)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "missing_in_code",
          title: "Recorded interface was not found by scanner: GET /v1/known",
        }),
      ]),
    );
  });
});
