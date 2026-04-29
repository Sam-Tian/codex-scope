import { writeFile } from "node:fs/promises";
import { createScanFindings, sourceEvidenceForInterface } from "../findings/diff.js";
import { applyFindingDecisions, countOpenFindings } from "../findings/triage.js";
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
  const timestamp = new Date().toISOString();
  const findings =
    scan.errors.length > 0
      ? createScanFindings({ ...status, interfaces: [] }, { ...scan, interfaces: [] })
      : createScanFindings(status, scan);
  const triaged = applyFindingDecisions(findings, status.findingDecisions, timestamp);
  const nextStatus = {
    ...status,
    project: {
      ...status.project,
      sourcePath: options.cwd,
      updatedAt: timestamp,
    },
    interfaces: scan.errors.length > 0 ? status.interfaces : attachSourceEvidence(status.interfaces, scan),
    scanFindings: triaged.findings,
    findingDecisions: triaged.decisions.length > 0 ? triaged.decisions : status.findingDecisions,
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

  return { reportPath, findingCount: countOpenFindings(triaged.findings) };
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
