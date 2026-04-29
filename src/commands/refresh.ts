import { writeFile } from "node:fs/promises";
import { createScanFindings, sourceEvidenceForInterface } from "../findings/diff.js";
import { renderReportHtml } from "../render/report.js";
import { scanRepository } from "../scan/index.js";
import { readStatusFile, writeStatusFile } from "../state/io.js";
import { calculateProjectProgress } from "../state/progress.js";
import type { InterfaceStatus } from "../state/types.js";
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
  const findings =
    scan.errors.length > 0
      ? createScanFindings({ ...status, interfaces: [] }, { ...scan, interfaces: [] })
      : createScanFindings(status, scan);
  const nextStatus = {
    ...status,
    project: {
      ...status.project,
      sourcePath: options.cwd,
      updatedAt: new Date().toISOString(),
    },
    interfaces: scan.errors.length > 0 ? status.interfaces : attachSourceEvidence(status.interfaces, scan),
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

function attachSourceEvidence(interfaces: InterfaceStatus[], scan: Awaited<ReturnType<typeof scanRepository>>): InterfaceStatus[] {
  return interfaces.map((item) => {
    const sourceEvidence = sourceEvidenceForInterface(item, scan);
    if (sourceEvidence.length === 0) {
      const { sourceEvidence: _sourceEvidence, ...rest } = item;
      return rest;
    }
    return { ...item, sourceEvidence };
  });
}
