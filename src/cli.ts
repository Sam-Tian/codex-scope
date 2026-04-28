import { readFile } from "node:fs/promises";
import { runDoctor } from "./commands/doctor.js";
import { runInit, type InitAnswers } from "./commands/init.js";
import { runRefresh } from "./commands/refresh.js";
import { runUpdate } from "./commands/update.js";
import { parseJsonObject } from "./utils/json.js";

export type CliIO = {
  cwd: string;
  stdout: (line: string) => void;
  stderr: (line: string) => void;
};

export type CliResult = {
  exitCode: number;
};

const HELP = `codex-architecture

Commands:
  codex-architecture init
  codex-architecture refresh
  codex-architecture serve
  codex-architecture update --from-codex-summary <file>
  codex-architecture doctor
`;

export async function runCli(args: string[], io: CliIO): Promise<CliResult> {
  const [command] = args;

  try {
    if (!command || command === "--help" || command === "-h") {
      io.stdout(HELP);
      return { exitCode: 0 };
    }

    if (command === "refresh") {
      const result = await runRefresh({ cwd: io.cwd, servedMode: false });
      io.stdout(`Report written: ${result.reportPath}`);
      io.stdout(`Scan findings: ${result.findingCount}`);
      return { exitCode: 0 };
    }

    if (command === "doctor") {
      const result = await runDoctor({ cwd: io.cwd });
      for (const message of result.messages) {
        (result.ok ? io.stdout : io.stderr)(message);
      }
      return { exitCode: result.ok ? 0 : 1 };
    }

    if (command === "init") {
      const answersFile = valueAfter(args, "--answers");
      if (!answersFile) {
        io.stderr(
          "Missing --answers <file>. Ask the user for project details, write an answers JSON file, then pass --answers <file>.",
        );
        return { exitCode: 1 };
      }
      const answers = parseJsonObject(await readFile(answersFile, "utf8"), answersFile) as InitAnswers;
      await runInit({ cwd: io.cwd, answers });
      io.stdout("Initialized .codex-architecture/status.json");
      return { exitCode: 0 };
    }

    if (command === "update") {
      const summaryPath = valueAfter(args, "--from-codex-summary");
      if (!summaryPath) {
        io.stderr("Missing --from-codex-summary <file>");
        return { exitCode: 1 };
      }
      await runUpdate({ cwd: io.cwd, summaryPath });
      io.stdout("Updated architecture status from Codex summary");
      return { exitCode: 0 };
    }

    if (command === "serve") {
      io.stderr(`Command unavailable in current scaffold: ${command}`);
      return { exitCode: 1 };
    }

    io.stderr(`Unknown command: ${command}`);
    io.stderr(HELP);
    return { exitCode: 1 };
  } catch (error) {
    io.stderr(commandErrorMessage(error));
    return { exitCode: 1 };
  }
}

function valueAfter(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  const value = index >= 0 ? args[index + 1] : undefined;
  return value && !value.startsWith("-") ? value : undefined;
}

function commandErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes(".codex-architecture/status.json") && message.includes("ENOENT")) {
    return "Missing .codex-architecture/status.json. Run codex-architecture init.";
  }
  return message;
}
