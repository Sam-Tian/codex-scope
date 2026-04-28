import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ScannedCall, ScannedInterface } from "./types.js";

const routePattern =
  /\b(?:router|app)\s*\.\s*(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/gi;
const fetchPattern = /\bfetch\s*\(\s*["'`]([^"'`]+)["'`]/gi;
const axiosPattern =
  /\baxios\s*\.\s*(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/gi;

export async function scanTypeScriptNode(root: string, sourceFiles: string[]): Promise<{
  interfaces: ScannedInterface[];
  calls: ScannedCall[];
}> {
  const interfaces: ScannedInterface[] = [];
  const calls: ScannedCall[] = [];

  for (const sourcePath of sourceFiles.filter((file) => /\.(ts|tsx|js|jsx)$/.test(file))) {
    const text = await readFile(join(root, sourcePath), "utf8");

    for (const match of text.matchAll(routePattern)) {
      const [methodGroup, path] = match.slice(1);
      if (!methodGroup || !path) {
        continue;
      }
      const method = methodGroup.toUpperCase();
      interfaces.push({
        id: `${method}:${path}`,
        method,
        path,
        sourcePath,
        confidence: "medium",
      });
    }

    for (const match of text.matchAll(fetchPattern)) {
      const path = match[1];
      if (!path) {
        continue;
      }
      calls.push({
        id: `GET:${path}:${sourcePath}`,
        method: "GET",
        path,
        sourcePath,
        confidence: "low",
      });
    }

    for (const match of text.matchAll(axiosPattern)) {
      const [methodGroup, path] = match.slice(1);
      if (!methodGroup || !path) {
        continue;
      }
      const method = methodGroup.toUpperCase();
      calls.push({
        id: `${method}:${path}:${sourcePath}`,
        method,
        path,
        sourcePath,
        confidence: "medium",
      });
    }
  }

  return { interfaces, calls };
}
