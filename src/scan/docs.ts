import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { SourceEvidence } from "../state/types.js";

const docRoutePattern = /\b(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+(`?)(\/[A-Za-z0-9._~:/?#\[\]@!$&()*+,;=%-]+)/gi;

export async function scanDocReferences(root: string, docs: string[]): Promise<SourceEvidence[]> {
  const evidence: SourceEvidence[] = [];
  for (const sourcePath of docs) {
    const text = await readFile(join(root, sourcePath), "utf8");
    for (const match of text.matchAll(docRoutePattern)) {
      const method = match[1]?.toUpperCase();
      const path = normalizePath(match[3]);
      if (!method || !path) {
        continue;
      }
      evidence.push({ kind: "doc", method, path, sourcePath, confidence: "low" });
    }
  }
  return evidence;
}

function normalizePath(value: string | undefined): string | undefined {
  const trimmed = value?.replace(/[`.,;:)]+$/g, "");
  return trimmed?.startsWith("/") ? trimmed : undefined;
}
