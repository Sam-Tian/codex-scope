import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type ScanConfig = {
  ignoreDirs: string[];
  ignorePathPrefixes: string[];
};

export async function readScanConfig(root: string): Promise<ScanConfig> {
  try {
    const value = JSON.parse(await readFile(join(root, ".codex-architecture", "config.json"), "utf8")) as unknown;
    return parseScanConfig(value);
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      return emptyScanConfig();
    }
    throw error;
  }
}

function parseScanConfig(value: unknown): ScanConfig {
  if (!isObject(value)) {
    throw new Error("Invalid scan config: expected object");
  }
  const scan = value.scan;
  if (scan === undefined) {
    return emptyScanConfig();
  }
  if (!isObject(scan)) {
    throw new Error("Invalid scan config: scan must be an object");
  }
  return {
    ignoreDirs: optionalStringArray(scan.ignoreDirs, "scan.ignoreDirs").map(normalizeDir),
    ignorePathPrefixes: optionalStringArray(scan.ignorePathPrefixes, "scan.ignorePathPrefixes").map(normalizePrefix),
  };
}

function optionalStringArray(value: unknown, path: string): string[] {
  if (value === undefined) {
    return [];
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim().length === 0)) {
    throw new Error(`Invalid scan config: ${path} must be a string array`);
  }
  return value;
}

function normalizeDir(value: string): string {
  return value.trim().replace(/^\/+|\/+$/g, "");
}

function normalizePrefix(value: string): string {
  const normalized = value.trim().replace(/^\/+/g, "");
  return normalized.endsWith("/") ? normalized : `${normalized}/`;
}

function emptyScanConfig(): ScanConfig {
  return { ignoreDirs: [], ignorePathPrefixes: [] };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error;
}
