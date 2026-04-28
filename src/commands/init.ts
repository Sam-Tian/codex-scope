import { access } from "node:fs/promises";
import { writeStatusFile } from "../state/io.js";
import type { ArchitectureStatus, FeatureStatus } from "../state/types.js";
import { statePath } from "../utils/fs.js";

export type InitAnswers = {
  projectId: string;
  projectName: string;
  goal: string;
  phase: string;
  features: string[];
};

export async function runInit(options: { cwd: string; answers: InitAnswers }): Promise<ArchitectureStatus> {
  await assertStatusDoesNotExist(options.cwd);
  const usedFeatureIds = new Map<string, number>();
  const features: FeatureStatus[] = options.answers.features.map((name, index) => ({
    id: uniqueSlug(name, index, usedFeatureIds),
    name,
    purpose: name,
    status: "not_started",
    percent: 0,
    acceptance: [],
    moduleIds: [],
    interfaceIds: [],
    riskIds: [],
    evidenceIds: [],
  }));

  const status: ArchitectureStatus = {
    schemaVersion: 1,
    project: {
      id: options.answers.projectId,
      name: options.answers.projectName,
      goal: options.answers.goal,
      phase: options.answers.phase,
      sourcePath: options.cwd,
      updatedAt: new Date().toISOString(),
    },
    features,
    modules: [],
    interfaces: [],
    flows: [],
    risks: [],
    evidence: [],
    scanFindings: [],
  };

  await writeStatusFile(options.cwd, status);
  return status;
}

async function assertStatusDoesNotExist(root: string): Promise<void> {
  try {
    await access(statePath(root, "status.json"));
  } catch {
    return;
  }
  throw new Error(".codex-architecture/status.json already exists. Refusing to overwrite confirmed project state.");
}

function uniqueSlug(value: string, index: number, used: Map<string, number>): string {
  const base = slug(value, index);
  const count = used.get(base) ?? 0;
  used.set(base, count + 1);
  return count === 0 ? base : `${base}-${count + 1}`;
}

function slug(value: string, index: number): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return normalized || `feature-${index + 1}`;
}
