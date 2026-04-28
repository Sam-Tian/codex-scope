import { mkdir } from "node:fs/promises";
import { join } from "node:path";

export const STATE_DIR = ".codex-architecture";

export function statePath(root: string, file: string): string {
  return join(root, STATE_DIR, file);
}

export async function ensureStateDir(root: string): Promise<string> {
  const dir = join(root, STATE_DIR);
  await mkdir(dir, { recursive: true });
  return dir;
}
