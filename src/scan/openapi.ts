import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { SourceEvidence } from "../state/types.js";
import type { ScannedInterface } from "./types.js";

const methods = new Set(["get", "post", "put", "patch", "delete", "options", "head"]);

export async function scanOpenApiRoutes(root: string, files: string[]): Promise<ScannedInterface[]> {
  const interfaces: ScannedInterface[] = [];
  for (const sourcePath of files.filter((file) => /\.(ya?ml)$/i.test(file))) {
    const text = await readFile(join(root, sourcePath), "utf8");
    interfaces.push(...scanYamlPaths(text, sourcePath));
  }
  return interfaces;
}

function scanYamlPaths(text: string, sourcePath: string): ScannedInterface[] {
  const interfaces: ScannedInterface[] = [];
  const lines = text.split(/\r?\n/);
  let inPaths = false;
  let pathsIndent = -1;
  let currentPath: string | undefined;
  let currentPathIndent = -1;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const indent = leadingSpaces(line);
    if (!inPaths && /^paths:\s*$/.test(trimmed)) {
      inPaths = true;
      pathsIndent = indent;
      continue;
    }
    if (!inPaths) {
      continue;
    }
    if (indent <= pathsIndent && !/^paths:\s*$/.test(trimmed)) {
      inPaths = false;
      currentPath = undefined;
      continue;
    }

    const pathMatch = line.match(/^(\s*)(["']?\/[^"':]+["']?)\s*:\s*$/);
    if (pathMatch) {
      currentPath = stripQuotes(pathMatch[2] ?? "");
      currentPathIndent = indent;
      continue;
    }

    const methodMatch = line.match(/^(\s*)([a-zA-Z]+)\s*:\s*$/);
    const method = methodMatch?.[2]?.toLowerCase();
    if (currentPath && method && methods.has(method) && indent > currentPathIndent) {
      const upperMethod = method.toUpperCase();
      const evidence: SourceEvidence = {
        kind: "openapi",
        method: upperMethod,
        path: currentPath,
        sourcePath,
        confidence: "high",
      };
      interfaces.push({
        id: `${upperMethod}:${currentPath}`,
        method: upperMethod,
        path: currentPath,
        sourcePath,
        confidence: "high",
        evidence: [evidence],
      });
    }
  }
  return interfaces;
}

function leadingSpaces(line: string): number {
  return line.length - line.trimStart().length;
}

function stripQuotes(value: string): string {
  return value.replace(/^["']|["']$/g, "");
}
