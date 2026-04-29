import { readFile } from "node:fs/promises";
import { upsertFindingDecisions, type FindingUpdate } from "../findings/triage.js";
import { appendEvent, readStatusFile, writeStatusFile } from "../state/io.js";
import type { ArchitectureStatus, InterfaceStatus, ModuleKind, ModuleStatus, WorkStatus } from "../state/types.js";
import { parseJsonObject } from "../utils/json.js";

type Summary = {
  summary: string;
  featureUpdates?: Array<{ id: string; status: WorkStatus; percent: number }>;
  moduleUpdates?: Array<{ id: string; name: string; kind: ModuleStatus["kind"]; status: WorkStatus; percent: number }>;
  interfaceUpdates?: Array<{ id: string; name: string; method?: string; path?: string; purpose: string }>;
  findingUpdates?: FindingUpdate[];
  verification?: string[];
};

export async function runUpdate(options: { cwd: string; summaryPath: string }): Promise<ArchitectureStatus> {
  const status = await readStatusFile(options.cwd);
  const summary = validateSummary(parseJsonObject(await readFile(options.summaryPath, "utf8"), options.summaryPath));
  const timestamp = new Date().toISOString();

  const next: ArchitectureStatus = {
    ...status,
    project: { ...status.project, updatedAt: timestamp },
    features: status.features.map((feature) => {
      const update = summary.featureUpdates?.find((item) => item.id === feature.id);
      return update ? { ...feature, status: update.status, percent: update.percent } : feature;
    }),
    modules: upsertModules(status.modules, summary.moduleUpdates ?? []),
    interfaces: upsertInterfaces(status.interfaces, summary.interfaceUpdates ?? []),
    findingDecisions: upsertFindingDecisions(
      status.findingDecisions,
      summary.findingUpdates ?? [],
      status.scanFindings,
      timestamp,
    ),
  };

  await writeStatusFile(options.cwd, next);
  await appendEvent(options.cwd, {
    timestamp,
    summary: summary.summary,
    featureIds: summary.featureUpdates?.map((item) => item.id) ?? [],
    moduleIds: summary.moduleUpdates?.map((item) => item.id) ?? [],
    interfaceIds: summary.interfaceUpdates?.map((item) => item.id) ?? [],
    verification: summary.verification ?? [],
    riskChanges: [],
  });
  return next;
}

function validateSummary(value: unknown): Summary {
  if (!isObject(value)) {
    throw new Error("Invalid summary: expected object");
  }
  if (typeof value.summary !== "string" || value.summary.length === 0) {
    throw new Error("Invalid summary: summary must be a non-empty string");
  }

  const featureUpdates = optionalArray(value.featureUpdates, "featureUpdates").map((item, index) => {
    if (!isObject(item)) {
      throw new Error(`Invalid summary: featureUpdates[${index}] must be an object`);
    }
    const id = requireString(item.id, `featureUpdates[${index}].id`);
    const status = requireWorkStatus(item.status, `featureUpdates[${index}].status`);
    const percent = requirePercent(item.percent, `featureUpdates[${index}].percent`);
    return { id, status, percent };
  });

  const moduleUpdates = optionalArray(value.moduleUpdates, "moduleUpdates").map((item, index) => {
    if (!isObject(item)) {
      throw new Error(`Invalid summary: moduleUpdates[${index}] must be an object`);
    }
    return {
      id: requireString(item.id, `moduleUpdates[${index}].id`),
      name: requireString(item.name, `moduleUpdates[${index}].name`),
      kind: requireModuleKind(item.kind, `moduleUpdates[${index}].kind`),
      status: requireWorkStatus(item.status, `moduleUpdates[${index}].status`),
      percent: requirePercent(item.percent, `moduleUpdates[${index}].percent`),
    };
  });

  const interfaceUpdates = optionalArray(value.interfaceUpdates, "interfaceUpdates").map((item, index) => {
    if (!isObject(item)) {
      throw new Error(`Invalid summary: interfaceUpdates[${index}] must be an object`);
    }
    return {
      id: requireString(item.id, `interfaceUpdates[${index}].id`),
      name: requireString(item.name, `interfaceUpdates[${index}].name`),
      method: optionalString(item.method, `interfaceUpdates[${index}].method`),
      path: optionalString(item.path, `interfaceUpdates[${index}].path`),
      purpose: requireString(item.purpose, `interfaceUpdates[${index}].purpose`),
    };
  });

  const findingUpdates = optionalArray(value.findingUpdates, "findingUpdates").map((item, index) => {
    if (!isObject(item)) {
      throw new Error(`Invalid summary: findingUpdates[${index}] must be an object`);
    }
    return {
      id: requireString(item.id, `findingUpdates[${index}].id`),
      decision: requireFindingDecision(item.decision, `findingUpdates[${index}].decision`),
      reason: requireString(item.reason, `findingUpdates[${index}].reason`),
    };
  });

  return {
    summary: value.summary,
    featureUpdates,
    moduleUpdates,
    interfaceUpdates,
    findingUpdates,
    verification: optionalStringArray(value.verification, "verification"),
  };
}

function upsertModules(existing: ModuleStatus[], updates: NonNullable<Summary["moduleUpdates"]>): ModuleStatus[] {
  const map = new Map(existing.map((item) => [item.id, item]));
  for (const update of updates) {
    const current = map.get(update.id);
    map.set(update.id, {
      ...current,
      id: update.id,
      name: update.name,
      kind: update.kind,
      status: update.status,
      percent: update.percent,
      dependsOn: current?.dependsOn ?? [],
      evidenceIds: current?.evidenceIds ?? [],
    });
  }
  return Array.from(map.values());
}

function upsertInterfaces(existing: InterfaceStatus[], updates: NonNullable<Summary["interfaceUpdates"]>): InterfaceStatus[] {
  const map = new Map(existing.map((item) => [item.id, item]));
  for (const update of updates) {
    const current = map.get(update.id);
    map.set(update.id, {
      ...current,
      id: update.id,
      name: update.name,
      kind: current?.kind ?? "http",
      method: update.method ?? current?.method,
      path: update.path ?? current?.path,
      purpose: update.purpose,
      callerIds: current?.callerIds ?? [],
      calleeIds: current?.calleeIds ?? [],
      featureIds: current?.featureIds ?? [],
      testStatus: current?.testStatus ?? "unknown",
      evidenceIds: current?.evidenceIds ?? [],
    });
  }
  return Array.from(map.values());
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalArray(value: unknown, path: string): unknown[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw new Error(`Invalid summary: ${path} must be an array`);
  }
  return value;
}

function requireString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Invalid summary: ${path} must be a non-empty string`);
  }
  return value;
}

function optionalString(value: unknown, path: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value !== "string") {
    throw new Error(`Invalid summary: ${path} must be a string`);
  }
  return value;
}

function requireWorkStatus(value: unknown, path: string): WorkStatus {
  if (
    value === "not_started" ||
    value === "in_progress" ||
    value === "complete" ||
    value === "blocked" ||
    value === "unknown"
  ) {
    return value;
  }
  throw new Error(`Invalid summary: ${path} must be a valid work status`);
}

function requireModuleKind(value: unknown, path: string): ModuleKind {
  if (
    value === "frontend" ||
    value === "backend" ||
    value === "worker" ||
    value === "database" ||
    value === "external" ||
    value === "tooling" ||
    value === "unknown"
  ) {
    return value;
  }
  throw new Error(`Invalid summary: ${path} must be a valid module kind`);
}

function requireFindingDecision(value: unknown, path: string): FindingUpdate["decision"] {
  if (value === "accepted" || value === "ignored" || value === "scanner_limit") {
    return value;
  }
  throw new Error(`Invalid summary: ${path} must be accepted, ignored, or scanner_limit`);
}

function requirePercent(value: unknown, path: string): number {
  if (typeof value !== "number" || value < 0 || value > 100) {
    throw new Error(`Invalid summary: ${path} must be a number between 0 and 100`);
  }
  return value;
}

function optionalStringArray(value: unknown, path: string): string[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Invalid summary: ${path} must be a string array`);
  }
  return value;
}
