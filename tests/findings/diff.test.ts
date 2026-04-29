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
  evidence: [],
  errors: [],
};

describe("createScanFindings", () => {
  it("proposes adding scanned routes missing from status", () => {
    expect(createScanFindings(status, scan)).toEqual([
      expect.objectContaining({
        kind: "missing_in_status",
        severity: "warning",
        title: "Scanned interface is not recorded: POST /v1/new",
        triageStatus: "open",
        proposedInterface: expect.objectContaining({
          id: "POST:/v1/new",
          kind: "http",
          method: "POST",
          path: "/v1/new",
          name: "POST /v1/new",
          purpose: "Confirm and document POST /v1/new.",
          testStatus: "unknown",
        }),
        proposedAction:
          "Confirm whether POST /v1/new belongs in status.json, then add it with purpose, callers, callees, feature ownership, and test status.",
      }),
    ]);
  });

  it("prioritizes multi-source route evidence for proposed interfaces", () => {
    const multiEvidenceScan: ScanResult = {
      ...scan,
      interfaces: [
        {
          id: "GET:/api/applications",
          method: "GET",
          path: "/api/applications",
          sourcePath: "apps/api/src/applications.controller.ts",
          confidence: "high",
          evidence: [
            {
              kind: "route",
              method: "GET",
              path: "/api/applications",
              sourcePath: "apps/api/src/applications.controller.ts",
              confidence: "high",
            },
            {
              kind: "openapi",
              method: "GET",
              path: "/api/applications",
              sourcePath: "openapi.yaml",
              confidence: "high",
            },
            {
              kind: "script_call",
              method: "GET",
              path: "/api/applications",
              sourcePath: "scripts/smoke.mjs",
              confidence: "medium",
            },
          ],
        },
      ],
      evidence: [],
      calls: [],
    };

    expect(createScanFindings(status, multiEvidenceScan)[0]).toEqual(
      expect.objectContaining({
        severity: "warning",
        proposedInterface: expect.objectContaining({
          id: "GET:/api/applications",
          sourceEvidence: expect.arrayContaining([
            expect.objectContaining({ kind: "route" }),
            expect.objectContaining({ kind: "openapi" }),
            expect.objectContaining({ kind: "script_call" }),
          ]),
        }),
      }),
    );
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

  it("ignores confirmed interfaces that are outside the route scanner scope", () => {
    const cliOnlyStatus: ArchitectureStatus = {
      ...status,
      interfaces: [
        {
          id: "cli:refresh",
          name: "Refresh CLI",
          kind: "cli",
          purpose: "Refresh report from the command line",
          callerIds: [],
          calleeIds: [],
          featureIds: [],
          testStatus: "unknown",
          evidenceIds: [],
        },
      ],
    };

    expect(createScanFindings(cliOnlyStatus, { ...scan, interfaces: [] })).toEqual([]);
  });

  it("matches status and scan methods case-insensitively", () => {
    const lowerCaseStatus: ArchitectureStatus = {
      ...status,
      interfaces: [
        {
          ...status.interfaces[0],
          method: "get",
        },
      ],
    };

    const nextScan: ScanResult = {
      ...scan,
      interfaces: [
        { id: "GET:/v1/known", method: "GET", path: "/v1/known", sourcePath: "src/routes.ts", confidence: "medium" },
      ],
    };

    expect(createScanFindings(lowerCaseStatus, nextScan)).toEqual([]);
  });

  it("reports scanner errors without changing confirmed state", () => {
    expect(
      createScanFindings(status, {
        ...scan,
        interfaces: scan.interfaces.slice(0, 1),
        errors: [{ source: "scanRepository", message: "permission denied" }],
      }),
    ).toEqual([
      expect.objectContaining({
        kind: "scan_error",
        severity: "error",
        title: "Scanner error: scanRepository",
        detail: "permission denied",
      }),
    ]);
  });

  it("uses route, OpenAPI, and smoke evidence to avoid false missing-in-code findings", () => {
    const aigpStatus: ArchitectureStatus = {
      ...status,
      interfaces: [
        {
          ...status.interfaces[0],
          id: "POST:/v1/chat/completions",
          name: "Chat completions",
          method: "POST",
          path: "/v1/chat/completions",
        },
        {
          ...status.interfaces[0],
          id: "GET:/ops/overview",
          name: "Ops overview",
          method: "GET",
          path: "/ops/overview",
        },
        {
          ...status.interfaces[0],
          id: "GET:/api/ops-overview/report-archives",
          name: "Report archives",
          method: "GET",
          path: "/api/ops-overview/report-archives",
        },
      ],
    };
    const aigpScan: ScanResult = {
      ...scan,
      interfaces: [
        {
          id: "POST:/v1/chat/completions",
          method: "POST",
          path: "/v1/chat/completions",
          sourcePath: "services/gateway-go/internal/http/handlers/router.go",
          confidence: "high",
          evidence: [
            {
              kind: "route",
              method: "POST",
              path: "/v1/chat/completions",
              sourcePath: "services/gateway-go/internal/http/handlers/router.go",
              confidence: "high",
            },
          ],
        },
        {
          id: "GET:/api/ops-overview/report-archives",
          method: "GET",
          path: "/api/ops-overview/report-archives",
          sourcePath: "openapi.yaml",
          confidence: "high",
          evidence: [
            {
              kind: "openapi",
              method: "GET",
              path: "/api/ops-overview/report-archives",
              sourcePath: "openapi.yaml",
              confidence: "high",
            },
          ],
        },
      ],
      calls: [
        {
          id: "GET:/ops/overview:scripts/smoke-ops-overview-browser.mjs",
          method: "GET",
          path: "/ops/overview",
          sourcePath: "scripts/smoke-ops-overview-browser.mjs",
          confidence: "medium",
          evidence: [
            {
              kind: "script_call",
              method: "GET",
              path: "/ops/overview",
              sourcePath: "scripts/smoke-ops-overview-browser.mjs",
              confidence: "medium",
            },
          ],
        },
      ],
      evidence: [],
    };

    expect(createScanFindings(aigpStatus, aigpScan)).toEqual([]);
  });

  it("classifies smoke-only endpoints missing from status separately from routes", () => {
    expect(
      createScanFindings(status, {
        ...scan,
        interfaces: [],
        calls: [
          {
            id: "POST:/v1/smoke-only:scripts/smoke.mjs",
            method: "POST",
            path: "/v1/smoke-only",
            sourcePath: "scripts/smoke.mjs",
            confidence: "medium",
            evidence: [
              {
                kind: "script_call",
                method: "POST",
                path: "/v1/smoke-only",
                sourcePath: "scripts/smoke.mjs",
                confidence: "medium",
              },
            ],
          },
        ],
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "missing_call_in_status",
          title: "Script call is not recorded: POST /v1/smoke-only",
        }),
      ]),
    );
  });
});
