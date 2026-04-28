import { appendFile, readFile, writeFile } from "node:fs/promises";
import { ensureStateDir, statePath } from "../utils/fs.js";
import { parseJsonObject, stringifyJson, stringifyJsonLine } from "../utils/json.js";
import type { ArchitectureStatus } from "./types.js";
import { validateStatus } from "./validate.js";

export type DevelopmentEvent = {
  timestamp: string;
  summary: string;
  featureIds: string[];
  moduleIds: string[];
  interfaceIds: string[];
  verification: string[];
  riskChanges: string[];
};

export async function readStatusFile(root: string): Promise<ArchitectureStatus> {
  const file = statePath(root, "status.json");
  const parsed = parseJsonObject(await readFile(file, "utf8"), file);
  const validation = validateStatus(parsed);
  if (!validation.ok) {
    const details = validation.errors.map((error) => `${error.path}: ${error.message}`).join("; ");
    throw new Error(`Invalid status file: ${details}`);
  }
  return parsed as ArchitectureStatus;
}

export async function writeStatusFile(root: string, status: ArchitectureStatus): Promise<void> {
  const validation = validateStatus(status);
  if (!validation.ok) {
    const details = validation.errors.map((error) => `${error.path}: ${error.message}`).join("; ");
    throw new Error(`Refusing to write invalid status: ${details}`);
  }
  await ensureStateDir(root);
  await writeFile(statePath(root, "status.json"), stringifyJson(status), "utf8");
}

export async function appendEvent(root: string, event: DevelopmentEvent): Promise<void> {
  await ensureStateDir(root);
  await appendFile(statePath(root, "events.jsonl"), stringifyJsonLine(event), "utf8");
}
