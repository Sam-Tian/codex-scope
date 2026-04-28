import type { ProjectProgress } from "../state/progress.js";
import type {
  ArchitectureStatus,
  FlowStatus,
  InterfaceStatus,
  ModuleStatus,
  RiskStatus,
  ScanFinding,
  WorkStatus,
} from "../state/types.js";
import { embedJson, escapeHtml } from "./html.js";

export type RenderReportOptions = {
  progress: ProjectProgress;
  servedMode: boolean;
};

export function renderReportHtml(status: ArchitectureStatus, options: RenderReportOptions): string {
  const nodeCards = status.modules.map(renderModuleNode).join("\n");
  const featureCards = status.features.map(renderFeatureCard).join("\n");
  const flowRows = status.flows.map(renderFlowRow).join("\n");
  const interfaceRows = status.interfaces.map(renderInterfaceRow).join("\n");
  const findingRows = status.scanFindings.map(renderFindingRow).join("\n");
  const riskRows = status.risks.map(renderRiskRow).join("\n");
  const refreshMode = options.servedMode ? "served" : "static";
  const progressDegrees = Math.max(0, Math.min(100, options.progress.percent)) * 3.6;
  const staticRefresh = options.servedMode
    ? ""
    : '<section id="static-refresh" class="command hidden">Run: codex-scope refresh</section>';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(status.project.name)} Architecture</title>
  <style>${styles()}</style>
</head>
<body>
  <aside class="sidebar">
    <section>
      <p class="eyebrow">${escapeHtml(status.project.phase)}</p>
      <h1>${escapeHtml(status.project.name)}</h1>
      <p class="goal">${escapeHtml(status.project.goal)}</p>
    </section>
    <section class="progress-block">
      <div class="progress-ring" style="--progress-deg:${progressDegrees}deg" aria-label="Project progress ${options.progress.percent}%">
        <span>${options.progress.percent}%</span>
      </div>
      <p>${escapeHtml(options.progress.basis)} progress across ${options.progress.featureCount} active features</p>
    </section>
    <dl class="stats">
      <dt>Features</dt><dd>${status.features.length}</dd>
      <dt>Modules</dt><dd>${status.modules.length}</dd>
      <dt>Interfaces</dt><dd>${status.interfaces.length}</dd>
      <dt>Findings</dt><dd>${status.scanFindings.length}</dd>
    </dl>
    <div class="legend" aria-label="Status legend">
      <span><i class="dot complete"></i>complete or stable</span>
      <span><i class="dot in-progress"></i>in progress or needs verification</span>
      <span><i class="dot blocked"></i>blocked or conflicting</span>
      <span><i class="dot unknown"></i>unknown or not started</span>
    </div>
  </aside>
  <main class="workspace">
    <header class="topbar">
      <div>
        <p class="eyebrow">Architecture Topology</p>
        <h2>Project Supervision View</h2>
      </div>
      <button class="refresh" type="button" data-refresh-mode="${refreshMode}">Refresh</button>
    </header>
    <section class="section">
      <div class="section-title">
        <h3>Modules</h3>
        <span>${status.modules.length} nodes</span>
      </div>
      <div class="nodes">${nodeCards || emptyState("No modules recorded yet.")}</div>
    </section>
    <section class="section split">
      <div>
        <div class="section-title">
          <h3>Features</h3>
          <span>progress line</span>
        </div>
        <div class="stack">${featureCards || emptyState("No features recorded yet.")}</div>
      </div>
      <div>
        <div class="section-title">
          <h3>Traffic Flow</h3>
          <span>${status.flows.length} paths</span>
        </div>
        <div class="stack">${flowRows || emptyState("No traffic flows recorded yet.")}</div>
      </div>
    </section>
    <section class="section split">
      <div>
        <div class="section-title">
          <h3>Interfaces</h3>
          <span>call surfaces</span>
        </div>
        <div class="stack">${interfaceRows || emptyState("No interfaces recorded yet.")}</div>
      </div>
      <div>
        <div class="section-title">
          <h3>Risks And Findings</h3>
          <span>${status.risks.length + status.scanFindings.length} items</span>
        </div>
        <div class="stack">${findingRows}${riskRows || (findingRows ? "" : emptyState("No risks or scan findings."))}</div>
      </div>
    </section>
    ${staticRefresh}
  </main>
  <aside class="details" id="details">
    <p class="eyebrow">Details</p>
    <h2>Project</h2>
    <p>Select a module, feature, interface, flow, risk, or finding to inspect purpose, progress, callers, evidence, and proposed action.</p>
  </aside>
  <script>window.__ARCHITECTURE_STATUS__ = ${embedJson(status)};</script>
  <script>${clientScript()}</script>
</body>
</html>`;
}

function renderModuleNode(module: ModuleStatus): string {
  return `<button class="node ${statusToClass(module.status)}" type="button" data-node-id="${escapeHtml(module.id)}">
    <strong>${escapeHtml(module.name)}</strong>
    <span>${escapeHtml(module.kind)} / ${module.percent}%</span>
  </button>`;
}

function renderFeatureCard(feature: ArchitectureStatus["features"][number]): string {
  return `<button class="list-row" type="button" data-feature-id="${escapeHtml(feature.id)}">
    <strong>${escapeHtml(feature.name)}</strong>
    <span>${escapeHtml(feature.status)} / ${feature.percent}%</span>
  </button>`;
}

function renderFlowRow(flow: FlowStatus): string {
  return `<button class="list-row" type="button" data-flow-id="${escapeHtml(flow.id)}">
    <strong>${escapeHtml(flow.name)}</strong>
    <span>${escapeHtml(flow.steps.join(" -> "))}</span>
  </button>`;
}

function renderInterfaceRow(item: InterfaceStatus): string {
  return `<button class="list-row" type="button" data-interface-id="${escapeHtml(item.id)}">
    <strong>${escapeHtml(interfaceLabel(item))}</strong>
    <span>${escapeHtml(item.testStatus)} test status</span>
  </button>`;
}

function renderFindingRow(finding: ScanFinding): string {
  return `<button class="list-row ${severityToClass(finding.severity)}" type="button" data-finding-id="${escapeHtml(finding.id)}">
    <strong>${escapeHtml(finding.title)}</strong>
    <span>${escapeHtml(finding.kind)}</span>
  </button>`;
}

function renderRiskRow(risk: RiskStatus): string {
  return `<button class="list-row ${severityToClass(risk.severity)}" type="button" data-risk-id="${escapeHtml(risk.id)}">
    <strong>${escapeHtml(risk.title)}</strong>
    <span>${escapeHtml(risk.status)}</span>
  </button>`;
}

function emptyState(message: string): string {
  return `<p class="empty">${escapeHtml(message)}</p>`;
}

function interfaceLabel(item: InterfaceStatus): string {
  return `${item.method ?? item.kind.toUpperCase()} ${item.path ?? item.name}`;
}

function statusToClass(status: WorkStatus): string {
  if (status === "complete") {
    return "complete";
  }
  if (status === "blocked") {
    return "blocked";
  }
  if (status === "unknown" || status === "not_started") {
    return "unknown";
  }
  return "in-progress";
}

function severityToClass(severity: "info" | "warning" | "error"): string {
  if (severity === "error") {
    return "blocked";
  }
  if (severity === "warning") {
    return "in-progress";
  }
  return "unknown";
}

function styles(): string {
  return `
:root{color-scheme:light;--ink:#111827;--muted:#64748b;--line:#cbd5e1;--panel:#ffffff;--bg:#f6f8fb;--green:#15803d;--green-bg:#eaf7ee;--amber:#b45309;--amber-bg:#fff7df;--red:#b91c1c;--red-bg:#fff1f1;--gray:#475569;--gray-bg:#eef2f7;--blue:#1d4ed8}
*{box-sizing:border-box}
body{margin:0;font-family:Inter,Arial,sans-serif;color:var(--ink);background:var(--bg);display:grid;grid-template-columns:minmax(220px,260px) minmax(0,1fr) minmax(260px,340px);min-height:100vh}
button{font:inherit;color:inherit}
.sidebar,.details{background:var(--panel);padding:18px;overflow:auto}
.sidebar{border-right:1px solid var(--line)}
.details{border-left:1px solid var(--line)}
.workspace{padding:18px;overflow:auto}
.eyebrow{margin:0 0 6px;color:var(--blue);font-size:12px;font-weight:800;text-transform:uppercase}
h1,h2,h3{margin:0;letter-spacing:0}
h1{font-size:24px;line-height:1.12}
h2{font-size:20px;line-height:1.2}
h3{font-size:15px}
.goal,.details p{color:var(--muted);line-height:1.5}
.progress-block{display:grid;grid-template-columns:86px 1fr;gap:12px;align-items:center;margin:20px 0}
.progress-ring{width:82px;height:82px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--blue) 0 var(--progress-deg),#dbe3ee var(--progress-deg) 360deg);position:relative;font-weight:800}
.progress-ring::after{content:"";position:absolute;width:60px;height:60px;border-radius:50%;background:var(--panel)}
.progress-ring span{position:relative;z-index:1}
.stats{display:grid;grid-template-columns:1fr auto;gap:8px;margin:18px 0}
.stats dt{color:var(--muted)}
.stats dd{margin:0;font-weight:800}
.legend{display:grid;gap:8px;color:var(--muted);font-size:13px}
.dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:7px;vertical-align:middle;border:1px solid currentColor}
.topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px}
.refresh{border:1px solid var(--line);background:var(--panel);border-radius:8px;padding:9px 12px;cursor:pointer;min-width:84px;text-align:center}
.section{background:transparent;margin-bottom:18px}
.section-title{display:flex;align-items:center;justify-content:space-between;color:var(--muted);margin-bottom:10px}
.section-title span{font-size:12px}
.nodes{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
.node,.list-row{width:100%;border:1px solid var(--line);border-radius:8px;background:var(--panel);padding:12px;text-align:left;cursor:pointer;min-height:68px}
.node strong,.list-row strong{display:block;font-size:14px;line-height:1.3}
.node span,.list-row span{display:block;color:var(--muted);font-size:12px;margin-top:6px;line-height:1.35}
.node,.list-row,.details{min-width:0;overflow-wrap:anywhere}
.split{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.stack{display:grid;gap:8px}
.complete{border-color:var(--green);background:var(--green-bg)}
.in-progress{border-color:var(--amber);background:var(--amber-bg)}
.blocked{border-color:var(--red);background:var(--red-bg)}
.unknown{border-color:var(--gray);background:var(--gray-bg)}
.empty{border:1px dashed var(--line);border-radius:8px;color:var(--muted);padding:12px;margin:0}
.command{border:1px solid var(--amber);background:var(--amber-bg);border-radius:8px;padding:12px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.hidden{display:none}
.details h2{margin-bottom:8px}
.details dl{display:grid;grid-template-columns:90px 1fr;gap:8px;margin:12px 0}
.details dt{color:var(--muted)}
.details dd{margin:0}
.details ul{margin:8px 0 0;padding-left:20px;color:var(--muted)}
@media (max-width:980px){body{display:block}.sidebar,.details{border:0;border-bottom:1px solid var(--line)}.split{grid-template-columns:1fr}.topbar{align-items:flex-start;flex-direction:column}.refresh{width:100%}}
`;
}

function clientScript(): string {
  return `
(function(){
  const status = window.__ARCHITECTURE_STATUS__;
  const details = document.getElementById("details");
  const esc = (value) => String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  const list = (values) => values && values.length ? "<ul>" + values.map((value) => "<li>" + esc(value) + "</li>").join("") + "</ul>" : "<p class=\\"empty\\">None recorded.</p>";
  const setDetails = (title, body) => { details.innerHTML = "<p class=\\"eyebrow\\">Details</p><h2>" + esc(title) + "</h2>" + body; };
  const findById = (items, id) => items.find((item) => item.id === id);

  document.querySelectorAll("[data-node-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const node = findById(status.modules, button.dataset.nodeId);
      if (!node) return setDetails("Missing module", "<p>Node not found.</p>");
      setDetails(node.name, "<dl><dt>Kind</dt><dd>" + esc(node.kind) + "</dd><dt>Status</dt><dd>" + esc(node.status) + "</dd><dt>Progress</dt><dd>" + esc(node.percent) + "%</dd></dl><h3>Depends On</h3>" + list(node.dependsOn) + "<h3>Evidence</h3>" + list(node.evidenceIds));
    });
  });

  document.querySelectorAll("[data-feature-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const feature = findById(status.features, button.dataset.featureId);
      if (!feature) return setDetails("Missing feature", "<p>Feature not found.</p>");
      setDetails(feature.name, "<p>" + esc(feature.purpose) + "</p><dl><dt>Status</dt><dd>" + esc(feature.status) + "</dd><dt>Progress</dt><dd>" + esc(feature.percent) + "%</dd></dl><h3>Acceptance</h3>" + list(feature.acceptance) + "<h3>Interfaces</h3>" + list(feature.interfaceIds));
    });
  });

  document.querySelectorAll("[data-flow-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const flow = findById(status.flows, button.dataset.flowId);
      if (!flow) return setDetails("Missing flow", "<p>Flow not found.</p>");
      setDetails(flow.name, "<dl><dt>Entry</dt><dd>" + esc(flow.entry) + "</dd><dt>Status</dt><dd>" + esc(flow.status) + "</dd></dl><h3>Steps</h3>" + list(flow.steps) + "<h3>Interfaces</h3>" + list(flow.interfaceIds));
    });
  });

  document.querySelectorAll("[data-interface-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = findById(status.interfaces, button.dataset.interfaceId);
      if (!item) return setDetails("Missing interface", "<p>Interface not found.</p>");
      const label = (item.method || item.kind.toUpperCase()) + " " + (item.path || item.name);
      setDetails(label, "<p>" + esc(item.purpose) + "</p><dl><dt>Test</dt><dd>" + esc(item.testStatus) + "</dd><dt>Kind</dt><dd>" + esc(item.kind) + "</dd></dl><h3>Callers</h3>" + list(item.callerIds) + "<h3>Callees</h3>" + list(item.calleeIds) + "<h3>Evidence</h3>" + list(item.evidenceIds));
    });
  });

  document.querySelectorAll("[data-finding-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const finding = findById(status.scanFindings, button.dataset.findingId);
      if (!finding) return setDetails("Missing finding", "<p>Finding not found.</p>");
      setDetails(finding.title, "<p>" + esc(finding.detail) + "</p><dl><dt>Severity</dt><dd>" + esc(finding.severity) + "</dd><dt>Kind</dt><dd>" + esc(finding.kind) + "</dd></dl><h3>Proposal</h3><p>" + esc(finding.proposedAction) + "</p><h3>Affected</h3>" + list(finding.affectedIds));
    });
  });

  document.querySelectorAll("[data-risk-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const risk = findById(status.risks, button.dataset.riskId);
      if (!risk) return setDetails("Missing risk", "<p>Risk not found.</p>");
      setDetails(risk.title, "<dl><dt>Severity</dt><dd>" + esc(risk.severity) + "</dd><dt>Status</dt><dd>" + esc(risk.status) + "</dd></dl><h3>Affected</h3>" + list(risk.affectedIds) + "<h3>Evidence</h3>" + list(risk.evidenceIds));
    });
  });

  document.querySelector("[data-refresh-mode]").addEventListener("click", async (event) => {
    if (event.currentTarget.dataset.refreshMode === "served") {
      const result = await fetch("/refresh", { method: "POST" });
      if (result.ok) location.reload();
      else alert(await result.text());
      return;
    }
    document.getElementById("static-refresh").classList.remove("hidden");
  });
})();
`;
}
