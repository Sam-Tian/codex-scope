import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ScannedCall, ScannedInterface } from "./types.js";
import type { SourceEvidence, SourceEvidenceConfidence, SourceEvidenceKind } from "../state/types.js";

const routePattern =
  /\b(?:router|app)\s*\.\s*(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/gi;
const fetchPattern = /\bfetch\s*\(\s*["'`]([^"'`]+)["'`]/gi;
const axiosPattern =
  /\baxios\s*\.\s*(get|post|put|patch|delete)\s*\(\s*["'`]([^"'`]+)["'`]/gi;
const buildUrlPattern = /\bbuildUrl\s*\(\s*[^,]+,\s*["'`]([^"'`]+)["'`]\s*\)/gi;
const nestMethodPattern = /@(Get|Post|Put|Patch|Delete|Options|Head)\s*\(([^)]*)\)/gi;
const controllerPattern = /@Controller\s*\(([^)]*)\)/gi;

export async function scanTypeScriptNode(root: string, sourceFiles: string[]): Promise<{
  interfaces: ScannedInterface[];
  calls: ScannedCall[];
}> {
  const interfaces: ScannedInterface[] = [];
  const calls: ScannedCall[] = [];

  for (const sourcePath of sourceFiles.filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(file))) {
    const text = await readFile(join(root, sourcePath), "utf8");

    for (const match of text.matchAll(routePattern)) {
      const [methodGroup, path] = match.slice(1);
      if (!methodGroup || !path) {
        continue;
      }
      const method = methodGroup.toUpperCase();
      const evidence = sourceEvidence("route", method, path, sourcePath, "medium");
      interfaces.push({
        id: `${method}:${path}`,
        method,
        path,
        sourcePath,
        confidence: "medium",
        evidence: [evidence],
      });
    }

    interfaces.push(...scanNestRoutes(text, sourcePath));

    for (const match of text.matchAll(fetchPattern)) {
      const path = normalizePathLiteral(match[1]);
      if (!path) {
        continue;
      }
      const method = methodNear(text, match.index ?? 0) ?? "GET";
      const evidence = sourceEvidence("script_call", method, path, sourcePath, method === "GET" ? "low" : "medium");
      calls.push({
        id: `${method}:${path}:${sourcePath}`,
        method,
        path,
        sourcePath,
        confidence: evidence.confidence,
        evidence: [evidence],
      });
    }

    for (const match of text.matchAll(axiosPattern)) {
      const [methodGroup, rawPath] = match.slice(1);
      const path = normalizePathLiteral(rawPath);
      if (!methodGroup || !path) {
        continue;
      }
      const method = methodGroup.toUpperCase();
      const evidence = sourceEvidence("script_call", method, path, sourcePath, "medium");
      calls.push({
        id: `${method}:${path}:${sourcePath}`,
        method,
        path,
        sourcePath,
        confidence: "medium",
        evidence: [evidence],
      });
    }

    for (const match of text.matchAll(buildUrlPattern)) {
      const path = normalizePathLiteral(match[1]);
      if (!path) {
        continue;
      }
      const method = methodNear(text, match.index ?? 0) ?? "GET";
      const evidence = sourceEvidence("script_call", method, path, sourcePath, method === "GET" ? "medium" : "medium");
      calls.push({
        id: `${method}:${path}:${sourcePath}`,
        method,
        path,
        sourcePath,
        confidence: evidence.confidence,
        evidence: [evidence],
      });
    }
  }

  return { interfaces, calls };
}

function scanNestRoutes(text: string, sourcePath: string): ScannedInterface[] {
  const controllerBases = parseDecoratorPaths(firstMatchGroup(text, controllerPattern) ?? "");
  const routes: ScannedInterface[] = [];
  for (const match of text.matchAll(nestMethodPattern)) {
    const [methodGroup, args] = match.slice(1);
    if (!methodGroup) {
      continue;
    }
    const method = methodGroup.toUpperCase();
    for (const base of controllerBases) {
      for (const path of parseDecoratorPaths(args ?? "")) {
        const joined = joinRoutePath(base, path);
        const evidence = sourceEvidence("route", method, joined, sourcePath, "high");
        routes.push({
          id: `${method}:${joined}`,
          method,
          path: joined,
          sourcePath,
          confidence: "high",
          evidence: [evidence],
        });
      }
    }
  }
  return routes;
}

function firstMatchGroup(text: string, pattern: RegExp): string | undefined {
  pattern.lastIndex = 0;
  return pattern.exec(text)?.[1];
}

function parseDecoratorPaths(args: string): string[] {
  const paths = Array.from(args.matchAll(/["'`]([^"'`]*)["'`]/g)).map((match) => match[1] ?? "");
  return paths.length > 0 ? paths : [""];
}

function joinRoutePath(base: string, path: string): string {
  const parts = [base, path]
    .map((part) => part.trim().replace(/^\/+|\/+$/g, ""))
    .filter(Boolean);
  return `/${parts.join("/")}`;
}

function normalizePathLiteral(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  try {
    if (/^https?:\/\//i.test(trimmed)) {
      return normalizePath(new URL(trimmed).pathname);
    }
  } catch {
    return undefined;
  }
  return trimmed.startsWith("/") ? normalizePath(trimmed) : undefined;
}

function normalizePath(path: string): string {
  return path.split(/[?#]/, 1)[0] || "/";
}

function methodNear(text: string, index: number): string | undefined {
  const window = text.slice(index, index + 360);
  return window.match(/\bmethod\s*:\s*["'`](GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)["'`]/i)?.[1]?.toUpperCase();
}

function sourceEvidence(
  kind: SourceEvidenceKind,
  method: string,
  path: string,
  sourcePath: string,
  confidence: SourceEvidenceConfidence,
): SourceEvidence {
  return { kind, method, path, sourcePath, confidence };
}
