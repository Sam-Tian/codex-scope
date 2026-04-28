import type { ScanResult } from "../scan/types.js";
import type { ArchitectureStatus, ScanFinding } from "../state/types.js";

export function createScanFindings(status: ArchitectureStatus, scan: ScanResult): ScanFinding[] {
  const findings: ScanFinding[] = [];
  const confirmed = new Map(status.interfaces.map((item) => [interfaceKey(item.method, item.path), item]));
  const scanned = new Map(scan.interfaces.map((item) => [interfaceKey(item.method, item.path), item]));

  for (const [key, scannedInterface] of scanned) {
    if (!confirmed.has(key)) {
      const label = labelFor(scannedInterface.method, scannedInterface.path);
      findings.push({
        id: `missing-in-status:${key}`,
        severity: "warning",
        kind: "missing_in_status",
        title: `Scanned interface is not recorded: ${label}`,
        detail: `Scanner found ${label} in ${scannedInterface.sourcePath}, but status.json has no matching interface.`,
        affectedIds: [key],
        proposedAction: `Confirm whether ${label} belongs in status.json, then add it with purpose, callers, callees, feature ownership, and test status.`,
        evidenceIds: [],
      });
    }
  }

  for (const [key, confirmedInterface] of confirmed) {
    if (!scanned.has(key)) {
      const label = labelFor(confirmedInterface.method, confirmedInterface.path);
      findings.push({
        id: `missing-in-code:${key}`,
        severity: "warning",
        kind: "missing_in_code",
        title: `Recorded interface was not found by scanner: ${label}`,
        detail: `status.json records ${label}, but the scanner did not find a matching route. This can be a scanner limitation or stale project state.`,
        affectedIds: [confirmedInterface.id],
        proposedAction: `Check whether ${label} still exists. If it was removed, confirm removal from status.json; if it is dynamic, add evidence so the scanner mismatch is explainable.`,
        evidenceIds: confirmedInterface.evidenceIds,
      });
    }
  }

  for (const error of scan.errors) {
    findings.push({
      id: `scan-error:${error.source}`,
      severity: "error",
      kind: "scan_error",
      title: `Scanner error: ${error.source}`,
      detail: error.message,
      affectedIds: [],
      proposedAction:
        "Fix the scanner error, then run codex-architecture refresh again. Do not overwrite confirmed state while scanning is failing.",
      evidenceIds: [],
    });
  }

  return findings;
}

function interfaceKey(method?: string, path?: string): string {
  return `${method ?? "ANY"}:${path ?? ""}`;
}

function labelFor(method?: string, path?: string): string {
  return `${method ?? "ANY"} ${path ?? "(unknown path)"}`;
}
