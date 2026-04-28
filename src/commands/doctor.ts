import { access, readFile } from "node:fs/promises";
import { validateStatus } from "../state/validate.js";
import { parseJsonObject } from "../utils/json.js";
import { statePath } from "../utils/fs.js";

export type DoctorResult = {
  ok: boolean;
  messages: string[];
};

export async function runDoctor(options: { cwd: string }): Promise<DoctorResult> {
  const statusPath = statePath(options.cwd, "status.json");
  try {
    await access(statusPath);
  } catch {
    return {
      ok: false,
      messages: ["Missing .codex-architecture/status.json. Run codex-architecture init."],
    };
  }

  const parsed = parseJsonObject(await readFile(statusPath, "utf8"), statusPath);
  const validation = validateStatus(parsed);
  if (!validation.ok) {
    return {
      ok: false,
      messages: validation.errors.map((error) => `${error.path}: ${error.message}`),
    };
  }

  return { ok: true, messages: ["status.json is valid."] };
}
