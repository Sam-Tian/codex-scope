import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

export async function listFiles(root: string): Promise<string[]> {
  const results: string[] = [];
  await walk(root, root, results);
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

async function walk(root: string, current: string, results: string[]): Promise<void> {
  const entries = await readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist") {
      continue;
    }
    const absolute = join(current, entry.name);
    if (entry.isDirectory()) {
      await walk(root, absolute, results);
      continue;
    }
    if ((await stat(absolute)).isFile()) {
      results.push(relative(root, absolute));
    }
  }
}
