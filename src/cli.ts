import { runDoctor } from "./commands/doctor.js";
import { runRefresh } from "./commands/refresh.js";

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

    if (["init", "serve", "update"].includes(command)) {
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

function commandErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes(".codex-architecture/status.json") && message.includes("ENOENT")) {
    return "Missing .codex-architecture/status.json. Run codex-architecture init.";
  }
  return message;
}
