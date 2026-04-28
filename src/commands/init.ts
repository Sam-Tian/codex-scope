import { writeStatusFile } from "../state/io.js";
import type { ArchitectureStatus, FeatureStatus } from "../state/types.js";

export type InitAnswers = {
  projectId: string;
  projectName: string;
  goal: string;
  phase: string;
  features: string[];
};

export async function runInit(options: { cwd: string; answers: InitAnswers }): Promise<ArchitectureStatus> {
  const features: FeatureStatus[] = options.answers.features.map((name, index) => ({
    id: slug(name, index),
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

function slug(value: string, index: number): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return normalized || `feature-${index + 1}`;
}
