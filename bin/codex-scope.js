#!/usr/bin/env node
import { runCli } from "../dist/src/cli.js";

const result = await runCli(process.argv.slice(2), {
  cwd: process.cwd(),
  stdout: (line) => console.log(line),
  stderr: (line) => console.error(line),
});

process.exitCode = result.exitCode;
