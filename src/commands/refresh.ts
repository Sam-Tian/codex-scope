import { writeFile } from "node:fs/promises";
import { createScanFindings } from "../findings/diff.js";
import { renderReportHtml } from "../render/report.js";
import { scanRepository } from "../scan/index.js";
import { readStatusFile, writeStatusFile } from "../state/io.js";
import { calculateProjectProgress } from "../state/progress.js";
import { statePath } from "../utils/fs.js";

export type RefreshOptions = {
  cwd: string;
  servedMode: boolean;
};

export type RefreshResult = {
  reportPath: string;
  findingCount: number;
};

export async function runRefresh(options: RefreshOptions): Promise<RefreshResult> {
  const status = await readStatusFile(options.cwd);
  const scan = await scanRepository(options.cwd);
  const findings = createScanFindings(status, scan);
  const nextStatus = {
    ...status,
    project: {
      ...status.project,
      sourcePath: options.cwd,
      updatedAt: new Date().toISOString(),
    },
    scanFindings: findings,
  };
  await writeStatusFile(options.cwd, nextStatus);

  const reportPath = statePath(options.cwd, "report.html");
  await writeFile(
    reportPath,
    renderReportHtml(nextStatus, {
      progress: calculateProjectProgress(nextStatus.features),
      servedMode: options.servedMode,
    }),
    "utf8",
  );

  return { reportPath, findingCount: findings.length };
}
