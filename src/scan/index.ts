import { classifyDocs, classifySources, classifyTests, listFiles, readPackageName } from "./generic.js";
import { scanDocReferences } from "./docs.js";
import { scanGoRoutes } from "./go.js";
import { scanOpenApiRoutes } from "./openapi.js";
import { scanTypeScriptNode } from "./typescript-node.js";
import type { SourceEvidence } from "../state/types.js";
import type { ScannedCall, ScannedInterface, ScanResult } from "./types.js";

export async function scanRepository(root: string): Promise<ScanResult> {
  try {
    const files = await listFiles(root);
    const docs = classifyDocs(files);
    const sourceFiles = classifySources(files);
    const nodeScan = await scanTypeScriptNode(root, sourceFiles);
    const goInterfaces = await scanGoRoutes(root, sourceFiles);
    const openApiInterfaces = await scanOpenApiRoutes(root, files);
    const docEvidence = await scanDocReferences(root, docs);
    const interfaces = mergeInterfaces([...nodeScan.interfaces, ...goInterfaces, ...openApiInterfaces]);
    const calls = mergeCalls(nodeScan.calls);
    const evidence = mergeEvidence([
      ...interfaces.flatMap((item) => item.evidence ?? []),
      ...calls.flatMap((item) => item.evidence ?? []),
      ...docEvidence,
    ]);

    return {
      root,
      packageName: await readPackageName(root),
      docs,
      testFiles: classifyTests(files),
      sourceFiles,
      interfaces,
      calls,
      evidence,
      errors: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      root,
      docs: [],
      testFiles: [],
      sourceFiles: [],
      interfaces: [],
      calls: [],
      evidence: [],
      errors: [{ source: "scanRepository", message }],
    };
  }
}

function mergeInterfaces(items: ScannedInterface[]): ScannedInterface[] {
  const map = new Map<string, ScannedInterface>();
  for (const item of items) {
    const key = interfaceKey(item.method, item.path);
    const current = map.get(key);
    if (!current) {
      map.set(key, { ...item, evidence: mergeEvidence(item.evidence ?? []) });
      continue;
    }
    map.set(key, {
      ...current,
      confidence: strongerConfidence(current.confidence, item.confidence),
      evidence: mergeEvidence([...(current.evidence ?? []), ...(item.evidence ?? [])]),
    });
  }
  return Array.from(map.values());
}

function mergeCalls(items: ScannedCall[]): ScannedCall[] {
  const map = new Map<string, ScannedCall>();
  for (const item of items) {
    const key = `${interfaceKey(item.method, item.path)}:${item.sourcePath}`;
    const current = map.get(key);
    if (!current) {
      map.set(key, { ...item, evidence: mergeEvidence(item.evidence ?? []) });
      continue;
    }
    map.set(key, {
      ...current,
      confidence: strongerConfidence(current.confidence, item.confidence),
      evidence: mergeEvidence([...(current.evidence ?? []), ...(item.evidence ?? [])]),
    });
  }
  return Array.from(map.values());
}

export function mergeEvidence(items: SourceEvidence[]): SourceEvidence[] {
  const map = new Map<string, SourceEvidence>();
  for (const item of items) {
    map.set(`${item.kind}:${interfaceKey(item.method, item.path)}:${item.sourcePath}`, item);
  }
  return Array.from(map.values());
}

function interfaceKey(method?: string, path?: string): string {
  return `${method?.trim().toUpperCase() || "ANY"}:${path?.trim() ?? ""}`;
}

function strongerConfidence(
  a: "high" | "medium" | "low",
  b: "high" | "medium" | "low",
): "high" | "medium" | "low" {
  const rank = { low: 0, medium: 1, high: 2 };
  return rank[b] > rank[a] ? b : a;
}
