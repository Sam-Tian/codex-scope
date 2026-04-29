import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { SourceEvidence } from "../state/types.js";
import type { ScannedInterface } from "./types.js";

const goMuxHandlePattern =
  /\b\w+\s*\.\s*Handle(?:Func)?\s*\(\s*["'`](GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s+([^"'`]+)["'`]/gi;

export async function scanGoRoutes(root: string, sourceFiles: string[]): Promise<ScannedInterface[]> {
  const interfaces: ScannedInterface[] = [];
  for (const sourcePath of sourceFiles.filter((file) => /\.go$/i.test(file))) {
    const text = await readFile(join(root, sourcePath), "utf8");
    for (const match of text.matchAll(goMuxHandlePattern)) {
      const method = match[1]?.toUpperCase();
      const path = normalizePath(match[2]);
      if (!method || !path) {
        continue;
      }
      const evidence: SourceEvidence = { kind: "route", method, path, sourcePath, confidence: "high" };
      interfaces.push({
        id: `${method}:${path}`,
        method,
        path,
        sourcePath,
        confidence: "high",
        evidence: [evidence],
      });
    }
  }
  return interfaces;
}

function normalizePath(value: string | undefined): string | undefined {
  const trimmed = value?.trim().split(/\s+/, 1)[0];
  return trimmed?.startsWith("/") ? trimmed : undefined;
}
