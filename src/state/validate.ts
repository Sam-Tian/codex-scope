import type { ArchitectureStatus } from "./types.js";

export type ValidationError = {
  path: string;
  message: string;
};

export type ValidationResult =
  | { ok: true; errors: [] }
  | { ok: false; errors: ValidationError[] };

const workStatuses = new Set(["not_started", "in_progress", "complete", "blocked", "unknown"]);
const testStatuses = new Set(["none", "partial", "passing", "failing", "unknown"]);
const moduleKinds = new Set(["frontend", "backend", "worker", "database", "external", "tooling", "unknown"]);
const interfaceKinds = new Set(["http", "event", "cli", "db", "external"]);
const evidenceKinds = new Set(["code", "test", "doc", "commit", "scan", "manual"]);
const findingSeverities = new Set(["info", "warning", "error"]);
const riskStatuses = new Set(["open", "mitigated", "accepted"]);
const scanFindingKinds = new Set([
  "missing_in_status",
  "missing_in_code",
  "test_mismatch",
  "progress_mismatch",
  "scan_error",
]);

export function validateStatus(value: unknown): ValidationResult {
  const errors: ValidationError[] = [];
  const status = value as Partial<ArchitectureStatus>;

  if (!isObject(value)) {
    return { ok: false, errors: [{ path: "$", message: "Expected object" }] };
  }

  if (status.schemaVersion !== 1) {
    errors.push({ path: "schemaVersion", message: "Expected 1" });
  }

  requireString(status.project?.id, "project.id", errors);
  requireString(status.project?.name, "project.name", errors);
  requireString(status.project?.goal, "project.goal", errors);
  requireString(status.project?.phase, "project.phase", errors);
  requireString(status.project?.sourcePath, "project.sourcePath", errors);
  requireString(status.project?.updatedAt, "project.updatedAt", errors);

  validateArray(status.features, "features", errors, (feature, path) => {
    requireString(feature.id, `${path}.id`, errors);
    requireString(feature.name, `${path}.name`, errors);
    requireString(feature.purpose, `${path}.purpose`, errors);
    requireEnum(feature.status, workStatuses, `${path}.status`, errors);
    requirePercent(feature.percent, `${path}.percent`, errors);
    requireStringArray(feature.acceptance, `${path}.acceptance`, errors);
    requireStringArray(feature.moduleIds, `${path}.moduleIds`, errors);
    requireStringArray(feature.interfaceIds, `${path}.interfaceIds`, errors);
    requireStringArray(feature.riskIds, `${path}.riskIds`, errors);
    requireStringArray(feature.evidenceIds, `${path}.evidenceIds`, errors);
  });

  validateArray(status.modules, "modules", errors, (mod, path) => {
    requireString(mod.id, `${path}.id`, errors);
    requireString(mod.name, `${path}.name`, errors);
    requireEnum(mod.kind, moduleKinds, `${path}.kind`, errors);
    requireEnum(mod.status, workStatuses, `${path}.status`, errors);
    requirePercent(mod.percent, `${path}.percent`, errors);
    requireStringArray(mod.dependsOn, `${path}.dependsOn`, errors);
    requireStringArray(mod.evidenceIds, `${path}.evidenceIds`, errors);
  });

  validateArray(status.interfaces, "interfaces", errors, (iface, path) => {
    requireString(iface.id, `${path}.id`, errors);
    requireString(iface.name, `${path}.name`, errors);
    requireEnum(iface.kind, interfaceKinds, `${path}.kind`, errors);
    requireOptionalString(iface.method, `${path}.method`, errors);
    requireOptionalString(iface.path, `${path}.path`, errors);
    requireString(iface.purpose, `${path}.purpose`, errors);
    requireStringArray(iface.callerIds, `${path}.callerIds`, errors);
    requireStringArray(iface.calleeIds, `${path}.calleeIds`, errors);
    requireStringArray(iface.featureIds, `${path}.featureIds`, errors);
    requireEnum(iface.testStatus, testStatuses, `${path}.testStatus`, errors);
    requireStringArray(iface.evidenceIds, `${path}.evidenceIds`, errors);
  });

  validateArray(status.flows, "flows", errors, (flow, path) => {
    requireString(flow.id, `${path}.id`, errors);
    requireString(flow.name, `${path}.name`, errors);
    requireString(flow.entry, `${path}.entry`, errors);
    requireStringArray(flow.steps, `${path}.steps`, errors);
    requireStringArray(flow.interfaceIds, `${path}.interfaceIds`, errors);
    requireEnum(flow.status, workStatuses, `${path}.status`, errors);
  });

  validateArray(status.risks, "risks", errors, (risk, path) => {
    requireString(risk.id, `${path}.id`, errors);
    requireString(risk.title, `${path}.title`, errors);
    requireEnum(risk.severity, findingSeverities, `${path}.severity`, errors);
    requireEnum(risk.status, riskStatuses, `${path}.status`, errors);
    requireStringArray(risk.affectedIds, `${path}.affectedIds`, errors);
    requireStringArray(risk.evidenceIds, `${path}.evidenceIds`, errors);
  });

  validateArray(status.evidence, "evidence", errors, (evidence, path) => {
    requireString(evidence.id, `${path}.id`, errors);
    requireEnum(evidence.kind, evidenceKinds, `${path}.kind`, errors);
    requireString(evidence.path, `${path}.path`, errors);
    requireString(evidence.note, `${path}.note`, errors);
  });

  validateArray(status.scanFindings, "scanFindings", errors, (finding, path) => {
    requireString(finding.id, `${path}.id`, errors);
    requireEnum(finding.severity, findingSeverities, `${path}.severity`, errors);
    requireEnum(finding.kind, scanFindingKinds, `${path}.kind`, errors);
    requireString(finding.title, `${path}.title`, errors);
    requireString(finding.detail, `${path}.detail`, errors);
    requireStringArray(finding.affectedIds, `${path}.affectedIds`, errors);
    requireString(finding.proposedAction, `${path}.proposedAction`, errors);
    requireStringArray(finding.evidenceIds, `${path}.evidenceIds`, errors);
  });

  return errors.length === 0 ? { ok: true, errors: [] } : { ok: false, errors };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateArray(
  value: unknown,
  path: string,
  errors: ValidationError[],
  validateItem: (item: Record<string, unknown>, path: string) => void,
): void {
  if (!Array.isArray(value)) {
    errors.push({ path, message: "Expected array" });
    return;
  }

  value.forEach((item, index) => {
    if (!isObject(item)) {
      errors.push({ path: `${path}[${index}]`, message: "Expected object" });
      return;
    }
    validateItem(item, `${path}[${index}]`);
  });
}

function requireString(value: unknown, path: string, errors: ValidationError[]): void {
  if (typeof value !== "string" || value.length === 0) {
    errors.push({ path, message: "Expected non-empty string" });
  }
}

function requireOptionalString(value: unknown, path: string, errors: ValidationError[]): void {
  if (value !== undefined && typeof value !== "string") {
    errors.push({ path, message: "Expected string" });
  }
}

function requireStringArray(value: unknown, path: string, errors: ValidationError[]): void {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    errors.push({ path, message: "Expected string array" });
  }
}

function requireEnum(value: unknown, allowed: Set<string>, path: string, errors: ValidationError[]): void {
  if (typeof value !== "string" || !allowed.has(value)) {
    errors.push({ path, message: `Expected one of: ${Array.from(allowed).join(", ")}` });
  }
}

function requirePercent(value: unknown, path: string, errors: ValidationError[]): void {
  if (typeof value !== "number" || value < 0 || value > 100) {
    errors.push({ path, message: "Expected number between 0 and 100" });
  }
}
