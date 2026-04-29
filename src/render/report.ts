import type { ProjectProgress } from "../state/progress.js";
import type {
  ArchitectureStatus,
  FlowStatus,
  InterfaceStatus,
  ModuleStatus,
  RiskStatus,
  ScanFinding,
  SourceEvidence,
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
    : '<section id="static-refresh" class="command hidden" data-i18n="staticRefresh">Run: codex-scope refresh</section>';

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
      <p data-i18n="progressSummary" data-progress-basis="${escapeHtml(options.progress.basis)}" data-progress-count="${options.progress.featureCount}">${escapeHtml(options.progress.basis)} progress across ${options.progress.featureCount} active features</p>
    </section>
    <dl class="stats">
      <dt data-i18n="statsFeatures">Features</dt><dd>${status.features.length}</dd>
      <dt data-i18n="statsModules">Modules</dt><dd>${status.modules.length}</dd>
      <dt data-i18n="statsInterfaces">Interfaces</dt><dd>${status.interfaces.length}</dd>
      <dt data-i18n="statsFindings">Findings</dt><dd>${status.scanFindings.length}</dd>
    </dl>
    <div class="legend" aria-label="Status legend">
      <span><i class="dot complete"></i><b data-i18n="legendComplete">complete or stable</b></span>
      <span><i class="dot in-progress"></i><b data-i18n="legendProgress">in progress or needs verification</b></span>
      <span><i class="dot blocked"></i><b data-i18n="legendBlocked">blocked or conflicting</b></span>
      <span><i class="dot unknown"></i><b data-i18n="legendUnknown">unknown or not started</b></span>
    </div>
  </aside>
  <main class="workspace">
    <header class="topbar">
      <div>
        <p class="eyebrow" data-i18n="topology">Architecture Topology</p>
        <h2 data-i18n="topTitle">Project Supervision View</h2>
      </div>
      <div class="top-actions">
        <button class="language-toggle" type="button" data-language-toggle aria-label="Switch language to Chinese">中文</button>
        <button class="refresh" type="button" data-refresh-mode="${refreshMode}" data-i18n="refreshButton">Refresh</button>
      </div>
    </header>
    <section class="section">
      <div class="section-title">
        <h3 data-i18n="modulesHeading">Modules</h3>
        <span data-i18n="modulesCount" data-count="${status.modules.length}">${status.modules.length} nodes</span>
      </div>
      <div class="nodes">${nodeCards || emptyState("No modules recorded yet.")}</div>
    </section>
    <section class="section split">
      <div>
        <div class="section-title">
          <h3 data-i18n="featuresHeading">Features</h3>
          <span data-i18n="featuresSubtitle">progress line</span>
        </div>
        <div class="stack">${featureCards || emptyState("No features recorded yet.")}</div>
      </div>
      <div>
        <div class="section-title">
          <h3 data-i18n="flowsHeading">Traffic Flow</h3>
          <span data-i18n="flowsCount" data-count="${status.flows.length}">${status.flows.length} paths</span>
        </div>
        <div class="stack">${flowRows || emptyState("No traffic flows recorded yet.")}</div>
      </div>
    </section>
    <section class="section split">
      <div>
        <div class="section-title">
          <h3 data-i18n="interfacesHeading">Interfaces</h3>
          <span data-i18n="interfacesSubtitle">call surfaces</span>
        </div>
        <div class="stack">${interfaceRows || emptyState("No interfaces recorded yet.")}</div>
      </div>
      <div>
        <div class="section-title">
          <h3 data-i18n="risksHeading">Risks And Findings</h3>
          <span data-i18n="risksCount" data-count="${status.risks.length + status.scanFindings.length}">${status.risks.length + status.scanFindings.length} items</span>
        </div>
        <div class="stack">${findingRows}${riskRows || (findingRows ? "" : emptyState("No risks or scan findings."))}</div>
      </div>
    </section>
    ${staticRefresh}
  </main>
  <aside class="details" id="details">
    <p class="eyebrow" data-i18n="details">Details</p>
    <h2 data-i18n="projectHeading">Project</h2>
    <p data-i18n="detailsIntro">Select a module, feature, interface, flow, risk, or finding to inspect purpose, progress, callers, evidence, and proposed action.</p>
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
    ${renderSourceBadges(item.sourceEvidence)}
    <span>${escapeHtml(item.testStatus)} test status</span>
  </button>`;
}

function renderFindingRow(finding: ScanFinding): string {
  return `<button class="list-row ${severityToClass(finding.severity)}" type="button" data-finding-id="${escapeHtml(finding.id)}">
    <strong>${escapeHtml(finding.title)}</strong>
    ${renderSourceBadges(finding.sourceEvidence)}
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

function renderSourceBadges(evidence: SourceEvidence[] | undefined): string {
  const kinds = Array.from(new Set((evidence ?? []).map((item) => item.kind)));
  if (kinds.length === 0) {
    return "";
  }
  return `<span class="badges">${kinds
    .map((kind) => `<i class="badge" data-source-kind="${escapeHtml(kind)}">${escapeHtml(sourceKindLabel(kind))}</i>`)
    .join("")}</span>`;
}

function sourceKindLabel(kind: SourceEvidence["kind"]): string {
  if (kind === "openapi") {
    return "OpenAPI";
  }
  if (kind === "script_call") {
    return "Smoke";
  }
  if (kind === "doc") {
    return "Docs";
  }
  return "Route";
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
.legend b{font-weight:400}
.dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:7px;vertical-align:middle;border:1px solid currentColor}
.topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:16px}
.top-actions{display:flex;align-items:center;gap:8px}
.refresh,.language-toggle{border:1px solid var(--line);background:var(--panel);border-radius:8px;padding:9px 12px;cursor:pointer;min-width:84px;text-align:center}
.language-toggle{min-width:72px;color:var(--blue);font-weight:800}
.section{background:transparent;margin-bottom:18px}
.section-title{display:flex;align-items:center;justify-content:space-between;color:var(--muted);margin-bottom:10px}
.section-title span{font-size:12px}
.nodes{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}
.node,.list-row{width:100%;border:1px solid var(--line);border-radius:8px;background:var(--panel);padding:12px;text-align:left;cursor:pointer;min-height:68px}
.node strong,.list-row strong{display:block;font-size:14px;line-height:1.3}
.node span,.list-row span{display:block;color:var(--muted);font-size:12px;margin-top:6px;line-height:1.35}
.node,.list-row,.details{min-width:0;overflow-wrap:anywhere}
.badges{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}
.badge{display:inline-block;border:1px solid var(--line);border-radius:999px;background:#fff;padding:2px 7px;color:var(--blue);font-size:11px;font-style:normal;font-weight:800}
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
@media (max-width:980px){body{display:block}.sidebar,.details{border:0;border-bottom:1px solid var(--line)}.split{grid-template-columns:1fr}.topbar{align-items:flex-start;flex-direction:column}.top-actions{width:100%}.refresh,.language-toggle{flex:1}}
`;
}

function clientScript(): string {
  return `
(function(){
  const status = window.__ARCHITECTURE_STATUS__;
  const details = document.getElementById("details");
  const languageButton = document.querySelector("[data-language-toggle]");
  let currentLanguage = "en";
  const messages = {
    en: {
      topology: "Architecture Topology",
      topTitle: "Project Supervision View",
      refreshButton: "Refresh",
      statsFeatures: "Features",
      statsModules: "Modules",
      statsInterfaces: "Interfaces",
      statsFindings: "Findings",
      legendComplete: "complete or stable",
      legendProgress: "in progress or needs verification",
      legendBlocked: "blocked or conflicting",
      legendUnknown: "unknown or not started",
      modulesHeading: "Modules",
      featuresHeading: "Features",
      featuresSubtitle: "progress line",
      flowsHeading: "Traffic Flow",
      interfacesHeading: "Interfaces",
      interfacesSubtitle: "call surfaces",
      risksHeading: "Risks And Findings",
      details: "Details",
      projectHeading: "Project",
      detailsIntro: "Select a module, feature, interface, flow, risk, or finding to inspect purpose, progress, callers, evidence, and proposed action.",
      staticRefresh: "Run: codex-scope refresh",
      none: "None recorded.",
      missingModule: "Missing module",
      missingFeature: "Missing feature",
      missingFlow: "Missing flow",
      missingInterface: "Missing interface",
      missingFinding: "Missing finding",
      missingRisk: "Missing risk",
      nodeNotFound: "Node not found.",
      featureNotFound: "Feature not found.",
      flowNotFound: "Flow not found.",
      interfaceNotFound: "Interface not found.",
      findingNotFound: "Finding not found.",
      riskNotFound: "Risk not found.",
      kind: "Kind",
      status: "Status",
      progress: "Progress",
      dependsOn: "Depends On",
      evidence: "Evidence",
      acceptance: "Acceptance",
      interfaces: "Interfaces",
      entry: "Entry",
      steps: "Steps",
      test: "Test",
      callers: "Callers",
      callees: "Callees",
      sourceEvidence: "Source Evidence",
      severity: "Severity",
      proposal: "Proposal",
      affected: "Affected",
      route: "Route",
      openapi: "OpenAPI",
      script_call: "Smoke",
      doc: "Docs",
    },
    zh: {
      topology: "架构拓扑",
      topTitle: "项目监督视图",
      refreshButton: "刷新",
      statsFeatures: "功能",
      statsModules: "模块",
      statsInterfaces: "接口",
      statsFindings: "发现项",
      legendComplete: "已完成或稳定",
      legendProgress: "进行中或需要验证",
      legendBlocked: "阻塞或冲突",
      legendUnknown: "未知或未开始",
      modulesHeading: "模块",
      featuresHeading: "功能",
      featuresSubtitle: "进度线",
      flowsHeading: "流量路径",
      interfacesHeading: "接口",
      interfacesSubtitle: "调用面",
      risksHeading: "风险与扫描发现",
      details: "详情",
      projectHeading: "项目",
      detailsIntro: "选择模块、功能、接口、流程、风险或发现项，查看目的、进度、调用方、证据和建议动作。",
      staticRefresh: "运行：codex-scope refresh",
      none: "暂无记录。",
      missingModule: "缺少模块",
      missingFeature: "缺少功能",
      missingFlow: "缺少流程",
      missingInterface: "缺少接口",
      missingFinding: "缺少发现项",
      missingRisk: "缺少风险",
      nodeNotFound: "没有找到模块。",
      featureNotFound: "没有找到功能。",
      flowNotFound: "没有找到流程。",
      interfaceNotFound: "没有找到接口。",
      findingNotFound: "没有找到发现项。",
      riskNotFound: "没有找到风险。",
      kind: "类型",
      status: "状态",
      progress: "进度",
      dependsOn: "依赖",
      evidence: "证据",
      acceptance: "验收项",
      interfaces: "接口",
      entry: "入口",
      steps: "步骤",
      test: "测试",
      callers: "调用方",
      callees: "被调用方",
      sourceEvidence: "源代码证据",
      severity: "严重性",
      proposal: "建议",
      affected: "影响范围",
      route: "路由",
      openapi: "OpenAPI",
      script_call: "冒烟脚本",
      doc: "文档",
    },
  };
  const t = (key) => messages[currentLanguage][key] || messages.en[key] || key;
  const dynamicText = (element) => {
    const key = element.dataset.i18n;
    const count = Number(element.dataset.count || 0);
    if (key === "progressSummary") {
      const basis = element.dataset.progressBasis || "";
      const featureCount = Number(element.dataset.progressCount || 0);
      return currentLanguage === "zh"
        ? "基于 " + basis + " 统计，覆盖 " + featureCount + " 个活跃功能"
        : basis + " progress across " + featureCount + " active features";
    }
    if (key === "modulesCount") {
      return currentLanguage === "zh" ? count + " 个节点" : count + " nodes";
    }
    if (key === "flowsCount") {
      return currentLanguage === "zh" ? count + " 条路径" : count + " paths";
    }
    if (key === "risksCount") {
      return currentLanguage === "zh" ? count + " 项" : count + " items";
    }
    return t(key);
  };
  const sourceLabel = (kind) => t(kind === "openapi" ? "openapi" : kind === "script_call" ? "script_call" : kind === "doc" ? "doc" : "route");
  const applyLanguage = (language) => {
    currentLanguage = language;
    if (document.documentElement) {
      document.documentElement.setAttribute("lang", language === "zh" ? "zh-CN" : "en");
    }
    languageButton.textContent = language === "zh" ? "English" : "中文";
    languageButton.setAttribute("aria-label", language === "zh" ? "Switch language to English" : "切换到中文");
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = dynamicText(element);
    });
    document.querySelectorAll("[data-source-kind]").forEach((element) => {
      element.textContent = sourceLabel(element.dataset.sourceKind);
    });
  };
  const esc = (value) => String(value ?? "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
  const list = (values) => values && values.length ? "<ul>" + values.map((value) => "<li>" + esc(value) + "</li>").join("") + "</ul>" : "<p class=\\"empty\\">" + esc(t("none")) + "</p>";
  const sourceEvidence = (items) => items && items.length ? "<ul>" + items.map((item) => "<li><strong>" + esc(sourceLabel(item.kind)) + "</strong> " + esc((item.method || "ANY") + " " + item.path) + " - " + esc(item.sourcePath) + " (" + esc(item.confidence) + ")</li>").join("") + "</ul>" : "<p class=\\"empty\\">" + esc(t("none")) + "</p>";
  const setDetails = (title, body) => { details.innerHTML = "<p class=\\"eyebrow\\">" + esc(t("details")) + "</p><h2>" + esc(title) + "</h2>" + body; };
  const findById = (items, id) => items.find((item) => item.id === id);

  document.querySelectorAll("[data-node-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const node = findById(status.modules, button.dataset.nodeId);
      if (!node) return setDetails(t("missingModule"), "<p>" + esc(t("nodeNotFound")) + "</p>");
      setDetails(node.name, "<dl><dt>" + esc(t("kind")) + "</dt><dd>" + esc(node.kind) + "</dd><dt>" + esc(t("status")) + "</dt><dd>" + esc(node.status) + "</dd><dt>" + esc(t("progress")) + "</dt><dd>" + esc(node.percent) + "%</dd></dl><h3>" + esc(t("dependsOn")) + "</h3>" + list(node.dependsOn) + "<h3>" + esc(t("evidence")) + "</h3>" + list(node.evidenceIds));
    });
  });

  document.querySelectorAll("[data-feature-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const feature = findById(status.features, button.dataset.featureId);
      if (!feature) return setDetails(t("missingFeature"), "<p>" + esc(t("featureNotFound")) + "</p>");
      setDetails(feature.name, "<p>" + esc(feature.purpose) + "</p><dl><dt>" + esc(t("status")) + "</dt><dd>" + esc(feature.status) + "</dd><dt>" + esc(t("progress")) + "</dt><dd>" + esc(feature.percent) + "%</dd></dl><h3>" + esc(t("acceptance")) + "</h3>" + list(feature.acceptance) + "<h3>" + esc(t("interfaces")) + "</h3>" + list(feature.interfaceIds));
    });
  });

  document.querySelectorAll("[data-flow-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const flow = findById(status.flows, button.dataset.flowId);
      if (!flow) return setDetails(t("missingFlow"), "<p>" + esc(t("flowNotFound")) + "</p>");
      setDetails(flow.name, "<dl><dt>" + esc(t("entry")) + "</dt><dd>" + esc(flow.entry) + "</dd><dt>" + esc(t("status")) + "</dt><dd>" + esc(flow.status) + "</dd></dl><h3>" + esc(t("steps")) + "</h3>" + list(flow.steps) + "<h3>" + esc(t("interfaces")) + "</h3>" + list(flow.interfaceIds));
    });
  });

  document.querySelectorAll("[data-interface-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = findById(status.interfaces, button.dataset.interfaceId);
      if (!item) return setDetails(t("missingInterface"), "<p>" + esc(t("interfaceNotFound")) + "</p>");
      const label = (item.method || item.kind.toUpperCase()) + " " + (item.path || item.name);
      setDetails(label, "<p>" + esc(item.purpose) + "</p><dl><dt>" + esc(t("test")) + "</dt><dd>" + esc(item.testStatus) + "</dd><dt>" + esc(t("kind")) + "</dt><dd>" + esc(item.kind) + "</dd></dl><h3>" + esc(t("callers")) + "</h3>" + list(item.callerIds) + "<h3>" + esc(t("callees")) + "</h3>" + list(item.calleeIds) + "<h3>" + esc(t("evidence")) + "</h3>" + list(item.evidenceIds) + "<h3>" + esc(t("sourceEvidence")) + "</h3>" + sourceEvidence(item.sourceEvidence));
    });
  });

  document.querySelectorAll("[data-finding-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const finding = findById(status.scanFindings, button.dataset.findingId);
      if (!finding) return setDetails(t("missingFinding"), "<p>" + esc(t("findingNotFound")) + "</p>");
      setDetails(finding.title, "<p>" + esc(finding.detail) + "</p><dl><dt>" + esc(t("severity")) + "</dt><dd>" + esc(finding.severity) + "</dd><dt>" + esc(t("kind")) + "</dt><dd>" + esc(finding.kind) + "</dd></dl><h3>" + esc(t("proposal")) + "</h3><p>" + esc(finding.proposedAction) + "</p><h3>" + esc(t("affected")) + "</h3>" + list(finding.affectedIds) + "<h3>" + esc(t("sourceEvidence")) + "</h3>" + sourceEvidence(finding.sourceEvidence));
    });
  });

  document.querySelectorAll("[data-risk-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const risk = findById(status.risks, button.dataset.riskId);
      if (!risk) return setDetails(t("missingRisk"), "<p>" + esc(t("riskNotFound")) + "</p>");
      setDetails(risk.title, "<dl><dt>" + esc(t("severity")) + "</dt><dd>" + esc(risk.severity) + "</dd><dt>" + esc(t("status")) + "</dt><dd>" + esc(risk.status) + "</dd></dl><h3>" + esc(t("affected")) + "</h3>" + list(risk.affectedIds) + "<h3>" + esc(t("evidence")) + "</h3>" + list(risk.evidenceIds));
    });
  });

  languageButton.addEventListener("click", () => {
    applyLanguage(currentLanguage === "zh" ? "en" : "zh");
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

  applyLanguage("en");
})();
`;
}
