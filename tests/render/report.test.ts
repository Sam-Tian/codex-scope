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
    expect(html).toContain("codex-scope refresh");
    expect(html).toContain("data-node-id=\"api\"");
  });

  it("updates the details panel when rendered items are clicked", async () => {
    const html = renderReportHtml(status, {
      progress: { percent: 70, basis: "equal", featureCount: 1, weights: [] },
      servedMode: false,
    });
    const dom = createFakeDocumentFromRenderedHtml(html);

    executeInlineScripts(html, dom.document);

    await dom.nodeButtons[0]?.click();
    expect(dom.details.innerHTML).toContain("API");
    expect(dom.details.innerHTML).toContain("backend");
    expect(dom.details.innerHTML).toContain("Evidence");

    await dom.interfaceButtons[0]?.click();
    expect(dom.details.innerHTML).toContain("POST /v1/api-keys");
    expect(dom.details.innerHTML).toContain("Create key");
    expect(dom.details.innerHTML).toContain("Callers");
    expect(dom.details.innerHTML).toContain("Callees");

    await dom.findingButtons[0]?.click();
    expect(dom.details.innerHTML).toContain("Scanned interface is not recorded");
    expect(dom.details.innerHTML).toContain("Proposal");
    expect(dom.details.innerHTML).toContain("Confirm whether POST /v1/new belongs in status.json.");
  });

  it("renders served refresh mode without the static command button behavior", () => {
    const html = renderReportHtml(status, {
      progress: { percent: 70, basis: "equal", featureCount: 1, weights: [] },
      servedMode: true,
    });

    expect(html).toContain("data-refresh-mode=\"served\"");
    expect(html).toContain("fetch(\"/refresh\"");
    expect(html).not.toContain("Run: codex-scope refresh");
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

type ClickListener = (event: { currentTarget: FakeElement }) => void | Promise<void>;

class FakeElement {
  innerHTML = "";
  readonly classList = {
    remove: (name: string) => {
      this.removedClasses.push(name);
    },
  };
  readonly removedClasses: string[] = [];
  private readonly listeners = new Map<string, ClickListener[]>();

  constructor(readonly dataset: Record<string, string> = {}) {}

  addEventListener(event: string, listener: ClickListener): void {
    const listeners = this.listeners.get(event) ?? [];
    listeners.push(listener);
    this.listeners.set(event, listeners);
  }

  async click(): Promise<void> {
    for (const listener of this.listeners.get("click") ?? []) {
      await listener({ currentTarget: this });
    }
  }
}

function createFakeDocumentFromRenderedHtml(html: string): {
  details: FakeElement;
  document: {
    getElementById: (id: string) => FakeElement;
    querySelector: (selector: string) => FakeElement;
    querySelectorAll: (selector: string) => FakeElement[];
  };
  findingButtons: FakeElement[];
  interfaceButtons: FakeElement[];
  nodeButtons: FakeElement[];
} {
  const details = new FakeElement();
  const staticRefresh = new FakeElement();
  const refreshButton = new FakeElement({ refreshMode: attributeValue(html, "data-refresh-mode") ?? "static" });
  const nodeButtons = dataButtons(html, "data-node-id", "nodeId");
  const featureButtons = dataButtons(html, "data-feature-id", "featureId");
  const flowButtons = dataButtons(html, "data-flow-id", "flowId");
  const interfaceButtons = dataButtons(html, "data-interface-id", "interfaceId");
  const findingButtons = dataButtons(html, "data-finding-id", "findingId");
  const riskButtons = dataButtons(html, "data-risk-id", "riskId");
  const selectorMap = new Map<string, FakeElement[]>([
    ["[data-node-id]", nodeButtons],
    ["[data-feature-id]", featureButtons],
    ["[data-flow-id]", flowButtons],
    ["[data-interface-id]", interfaceButtons],
    ["[data-finding-id]", findingButtons],
    ["[data-risk-id]", riskButtons],
  ]);

  return {
    details,
    document: {
      getElementById: (id: string) => {
        if (id === "details") {
          return details;
        }
        if (id === "static-refresh") {
          return staticRefresh;
        }
        throw new Error(`Unexpected element id: ${id}`);
      },
      querySelector: (selector: string) => {
        if (selector === "[data-refresh-mode]") {
          return refreshButton;
        }
        const element = selectorMap.get(selector)?.[0];
        if (!element) {
          throw new Error(`Unexpected selector: ${selector}`);
        }
        return element;
      },
      querySelectorAll: (selector: string) => selectorMap.get(selector) ?? [],
    },
    findingButtons,
    interfaceButtons,
    nodeButtons,
  };
}

function dataButtons(html: string, attribute: string, datasetKey: string): FakeElement[] {
  return attributeValues(html, attribute).map((value) => new FakeElement({ [datasetKey]: value }));
}

function attributeValue(html: string, attribute: string): string | undefined {
  return attributeValues(html, attribute)[0];
}

function attributeValues(html: string, attribute: string): string[] {
  return [...html.matchAll(new RegExp(`${attribute}="([^"]+)"`, "g"))].map((match) => match[1] ?? "");
}

function executeInlineScripts(html: string, document: ReturnType<typeof createFakeDocumentFromRenderedHtml>["document"]): void {
  const window = {};
  const location = { reload: () => undefined };
  const fetch = async () => ({ ok: true, text: async () => "" });
  const alert = () => undefined;
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1] ?? "");

  for (const script of scripts) {
    new Function("window", "document", "fetch", "location", "alert", script)(window, document, fetch, location, alert);
  }
}
