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
});
