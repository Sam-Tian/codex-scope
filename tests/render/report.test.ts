import { describe, expect, it } from "vitest";
import { renderReportHtml } from "../../src/render/report.js";
import type { ArchitectureStatus } from "../../src/state/types.js";

const status: ArchitectureStatus = {
  schemaVersion: 1,
  project: {
    id: "demo",
    name: "Demo",
    goal: "Demo goal",
    phase: "build",
    sourcePath: "/demo",
    updatedAt: "2026-04-28T00:00:00.000Z",
  },
  features: [
    {
      id: "keys",
      name: "API keys",
      purpose: "Manage API keys",
      status: "in_progress",
      percent: 70,
      acceptance: [],
      moduleIds: ["api"],
      interfaceIds: ["post-api-keys"],
      riskIds: [],
      evidenceIds: [],
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
      purpose: "Create key",
      callerIds: [],
      calleeIds: ["api"],
      featureIds: ["keys"],
      testStatus: "partial",
      evidenceIds: [],
    },
  ],
  flows: [
    {
      id: "api-key-flow",
      name: "API key creation",
      entry: "console",
      steps: ["console", "api", "database"],
      interfaceIds: ["post-api-keys"],
      status: "in_progress",
    },
  ],
  risks: [],
  evidence: [],
  scanFindings: [
    {
      id: "missing-in-status:POST:/v1/new",
      severity: "warning",
      kind: "missing_in_status",
      title: "Scanned interface is not recorded: POST /v1/new",
      detail: "Scanner found POST /v1/new in src/routes.ts.",
      affectedIds: ["POST:/v1/new"],
      proposedAction: "Confirm whether POST /v1/new belongs in status.json.",
      evidenceIds: [],
    },
  ],
};

describe("renderReportHtml", () => {
  it("renders project status, graph nodes, details, findings, and static refresh fallback", () => {
    const html = renderReportHtml(status, {
      progress: { percent: 70, basis: "equal", featureCount: 1, weights: [] },
      servedMode: false,
    });

    expect(html).toContain("<!doctype html>");
    expect(html).toContain("Demo");
    expect(html).toContain("API keys");
    expect(html).toContain("POST /v1/api-keys");
    expect(html).toContain("API key creation");
    expect(html).toContain("Scanned interface is not recorded");
    expect(html).toContain("codex-architecture refresh");
    expect(html).toContain("data-node-id=\"api\"");
  });

  it("renders served refresh mode without the static command button behavior", () => {
    const html = renderReportHtml(status, {
      progress: { percent: 70, basis: "equal", featureCount: 1, weights: [] },
      servedMode: true,
    });

    expect(html).toContain("data-refresh-mode=\"served\"");
    expect(html).toContain("fetch(\"/refresh\"");
    expect(html).not.toContain("Run: codex-architecture refresh");
  });

  it("escapes HTML in rendered content and embedded JSON script", () => {
    const html = renderReportHtml(
      {
        ...status,
        project: {
          ...status.project,
          name: "<script>alert(1)</script>",
        },
      },
      {
        progress: { percent: 70, basis: "equal", featureCount: 1, weights: [] },
        servedMode: false,
      },
    );

    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("\\u003cscript>alert(1)\\u003c/script>");
  });
});
