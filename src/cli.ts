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

  if (!command || command === "--help" || command === "-h") {
    io.stdout(HELP);
    return { exitCode: 0 };
  }

  if (!["init", "refresh", "serve", "update", "doctor"].includes(command)) {
    io.stderr(`Unknown command: ${command}`);
    io.stderr(HELP);
    return { exitCode: 1 };
  }

  io.stderr(`Command unavailable in current scaffold: ${command}`);
  return { exitCode: 1 };
}
