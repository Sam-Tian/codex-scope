import { readFile } from "node:fs/promises";
import { appendEvent, readStatusFile, writeStatusFile } from "../state/io.js";
import type { ArchitectureStatus, InterfaceStatus, ModuleStatus, WorkStatus } from "../state/types.js";
import { parseJsonObject } from "../utils/json.js";

type Summary = {
  summary: string;
  featureUpdates?: Array<{ id: string; status: WorkStatus; percent: number }>;
  moduleUpdates?: Array<{ id: string; name: string; kind: ModuleStatus["kind"]; status: WorkStatus; percent: number }>;
  interfaceUpdates?: Array<{ id: string; name: string; method?: string; path?: string; purpose: string }>;
  verification?: string[];
};

export async function runUpdate(options: { cwd: string; summaryPath: string }): Promise<ArchitectureStatus> {
  const status = await readStatusFile(options.cwd);
  const summary = parseJsonObject(await readFile(options.summaryPath, "utf8"), options.summaryPath) as Summary;
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
