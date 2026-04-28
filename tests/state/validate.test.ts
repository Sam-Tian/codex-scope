import { describe, expect, it } from "vitest";
import { validateStatus } from "../../src/state/validate.js";
import type { ArchitectureStatus } from "../../src/state/types.js";

const validStatus: ArchitectureStatus = {
  schemaVersion: 1,
  project: {
    id: "magic-router",
    name: "Magic Router",
    goal: "Stabilize invite beta gateway",
    phase: "beta-hardening",
    sourcePath: "/repo",
    updatedAt: "2026-04-28T00:00:00.000Z",
  },
  features: [
    {
      id: "api-keys",
      name: "API key management",
      purpose: "Allow users to create and manage relay keys",
      status: "in_progress",
      percent: 70,
      acceptance: ["User can create a key", "Key appears in console"],
      moduleIds: ["api", "console"],
      interfaceIds: ["post-api-keys"],
      riskIds: [],
      evidenceIds: ["api-key-service"],
    },
  ],
  modules: [
    {
      id: "api",
      name: "API",
      kind: "backend",
      status: "in_progress",
      percent: 70,
      dependsOn: [],
      evidenceIds: ["api-key-service"],
    },
    {
      id: "console",
      name: "Console",
      kind: "frontend",
      status: "in_progress",
      percent: 80,
      dependsOn: ["api"],
      evidenceIds: [],
    },
  ],
  interfaces: [
    {
      id: "post-api-keys",
      name: "Create API key",
      kind: "http",
      method: "POST",
      path: "/v1/api-keys",
      purpose: "Create a relay API key",
      callerIds: ["console"],
      calleeIds: ["api"],
      featureIds: ["api-keys"],
      testStatus: "partial",
      evidenceIds: ["api-key-service"],
    },
  ],
  flows: [
    {
      id: "create-key-flow",
      name: "Create key flow",
      entry: "console",
      steps: ["console", "api"],
      interfaceIds: ["post-api-keys"],
      status: "in_progress",
    },
  ],
  risks: [],
  evidence: [
    {
      id: "api-key-service",
      kind: "code",
      path: "apps/api/src/modules/api-keys/api-keys.service.ts",
      note: "API key service implementation",
    },
  ],
  scanFindings: [],
};

describe("validateStatus", () => {
  it("accepts a complete status document", () => {
    expect(validateStatus(validStatus)).toEqual({ ok: true, errors: [] });
  });

  it("reports exact field paths", () => {
    const invalid = {
      ...validStatus,
      features: [{ ...validStatus.features[0], percent: 120 }],
    };

    expect(validateStatus(invalid)).toEqual({
      ok: false,
      errors: [
        {
          path: "features[0].percent",
          message: "Expected number between 0 and 100",
        },
      ],
    });
  });

  it("requires feature purpose", () => {
    const invalid = {
      ...validStatus,
      features: [{ ...validStatus.features[0], purpose: "" }],
    };

    expect(validateStatus(invalid)).toEqual({
      ok: false,
      errors: [
        {
          path: "features[0].purpose",
          message: "Expected non-empty string",
        },
      ],
    });
  });

  it("accepts positive feature weight", () => {
    const weightedStatus = {
      ...validStatus,
      features: [{ ...validStatus.features[0], weight: 2 }],
    };

    expect(validateStatus(weightedStatus)).toEqual({ ok: true, errors: [] });
  });

  it.each(["high", 0, -1])("rejects invalid feature weight %s", (weight) => {
    const invalid = {
      ...validStatus,
      features: [{ ...validStatus.features[0], weight }],
    };

    expect(validateStatus(invalid)).toEqual({
      ok: false,
      errors: [
        {
          path: "features[0].weight",
          message: "Expected positive finite number",
        },
      ],
    });
  });

  it.each([
    {
      name: "interface kind",
      value: {
        ...validStatus,
        interfaces: [{ ...validStatus.interfaces[0], kind: "socket" }],
      },
      path: "interfaces[0].kind",
      message: "Expected one of: http, event, cli, db, external",
    },
    {
      name: "interface test status",
      value: {
        ...validStatus,
        interfaces: [{ ...validStatus.interfaces[0], testStatus: "skipped" }],
      },
      path: "interfaces[0].testStatus",
      message: "Expected one of: none, partial, passing, failing, unknown",
    },
    {
      name: "flow status",
      value: {
        ...validStatus,
        flows: [{ ...validStatus.flows[0], status: "done" }],
      },
      path: "flows[0].status",
      message: "Expected one of: not_started, in_progress, complete, blocked, unknown",
    },
    {
      name: "risk severity",
      value: {
        ...validStatus,
        risks: [
          {
            id: "stale-beta-risk",
            title: "Stale beta risk",
            severity: "critical",
            status: "open",
            affectedIds: ["api-keys"],
            evidenceIds: ["api-key-service"],
          },
        ],
      },
      path: "risks[0].severity",
      message: "Expected one of: info, warning, error",
    },
    {
      name: "evidence kind",
      value: {
        ...validStatus,
        evidence: [{ ...validStatus.evidence[0], kind: "screenshot" }],
      },
      path: "evidence[0].kind",
      message: "Expected one of: code, test, doc, commit, scan, manual",
    },
    {
      name: "scan finding kind",
      value: {
        ...validStatus,
        scanFindings: [
          {
            id: "finding-1",
            severity: "warning",
            kind: "unknown_gap",
            title: "Unknown gap",
            detail: "Unknown gap detail",
            affectedIds: ["api-keys"],
            proposedAction: "Review the status entry",
            evidenceIds: ["api-key-service"],
          },
        ],
      },
      path: "scanFindings[0].kind",
      message:
        "Expected one of: missing_in_status, missing_in_code, test_mismatch, progress_mismatch, scan_error",
    },
  ])("rejects invalid $name", ({ value, path, message }) => {
    expect(validateStatus(value)).toEqual({
      ok: false,
      errors: [{ path, message }],
    });
  });
});
