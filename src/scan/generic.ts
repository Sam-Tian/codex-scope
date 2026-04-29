import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";
import type { ScanConfig } from "./config.js";

const defaultIgnoredDirectoryNames = [
  ".codex-architecture",
  ".git",
  ".next",
  ".pnpm-store",
  ".turbo",
  ".worktrees",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "test-results",
];

export async function listFiles(root: string, config: ScanConfig = { ignoreDirs: [], ignorePathPrefixes: [] }): Promise<string[]> {
  const results: string[] = [];
  const ignoredDirectories = new Set([...defaultIgnoredDirectoryNames, ...config.ignoreDirs]);
  await walk(root, root, results, ignoredDirectories, config.ignorePathPrefixes);
  return results.sort();
}

export async function readPackageName(root: string): Promise<string | undefined> {
  try {
    const pkg = JSON.parse(await readFile(join(root, "package.json"), "utf8")) as { name?: string };
    return typeof pkg.name === "string" ? pkg.name : undefined;
  } catch {
    return undefined;
  }
}

export function classifyDocs(files: string[]): string[] {
  return files.filter((file) => /(^|\/)(README|CHANGELOG|docs\/).*\.(md|mdx|txt)$/i.test(file));
}

export function classifyTests(files: string[]): string[] {
  return files.filter((file) => /(\.test\.|\.(spec)\.|__tests__|(^|\/)tests\/).*\.(ts|tsx|js|jsx)$/i.test(file));
}

export function classifySources(files: string[]): string[] {
  return files.filter((file) => /\.(ts|tsx|js|jsx|mjs|cjs|go|py)$/i.test(file) && !classifyTests([file]).length);
}

async function walk(
  root: string,
  current: string,
  results: string[],
  ignoredDirectories: Set<string>,
  ignoredPathPrefixes: string[],
): Promise<void> {
  const entries = await readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = join(current, entry.name);
    const relativePath = relative(root, absolute);
    if (isIgnoredPath(relativePath, ignoredPathPrefixes)) {
      continue;
    }
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) {
      continue;
    }
    if (entry.isDirectory()) {
      await walk(root, absolute, results, ignoredDirectories, ignoredPathPrefixes);
      continue;
    }
    if ((await stat(absolute)).isFile()) {
      results.push(relativePath);
    }
  }
}

function isIgnoredPath(path: string, prefixes: string[]): boolean {
  const normalized = path.replaceAll("\\", "/");
  return prefixes.some((prefix) => normalized === prefix.slice(0, -1) || normalized.startsWith(prefix));
}
