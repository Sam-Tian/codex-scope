import type { ArchitectureStatus } from "./types.js";

export type ValidationError = {
  path: string;
  message: string;
};

export type ValidationResult =
  | { ok: true; errors: [] }
  | { ok: false; errors: ValidationError[] };

const workStatuses = new Set(["not_started", "in_progress", "complete", "blocked", "unknown"]);
const moduleKinds = new Set(["frontend", "backend", "worker", "database", "external", "tooling", "unknown"]);

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
    requireString(iface.kind, `${path}.kind`, errors);
    requireString(iface.purpose, `${path}.purpose`, errors);
    requireStringArray(iface.callerIds, `${path}.callerIds`, errors);
    requireStringArray(iface.calleeIds, `${path}.calleeIds`, errors);
    requireStringArray(iface.featureIds, `${path}.featureIds`, errors);
    requireString(iface.testStatus, `${path}.testStatus`, errors);
    requireStringArray(iface.evidenceIds, `${path}.evidenceIds`, errors);
  });

  for (const key of ["flows", "risks", "evidence", "scanFindings"] as const) {
    if (!Array.isArray(status[key])) {
      errors.push({ path: key, message: "Expected array" });
    }
  }

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
