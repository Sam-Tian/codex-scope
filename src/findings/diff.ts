import type { ScanResult } from "../scan/types.js";
import type { ArchitectureStatus, InterfaceStatus, ProposedInterfaceDraft, ScanFinding, SourceEvidence } from "../state/types.js";
import { fingerprintFromParts } from "./triage.js";

export function createScanFindings(status: ArchitectureStatus, scan: ScanResult): ScanFinding[] {
  const findings: ScanFinding[] = [];
  const confirmed = new Map(
    status.interfaces.filter(isScannableConfirmedInterface).map((item) => [interfaceKey(item.method, item.path), item]),
  );
  const scanned = new Map(scan.interfaces.map((item) => [interfaceKey(item.method, item.path), item]));
  const called = new Map(scan.calls.map((item) => [interfaceKey(item.method, item.path), item]));
  const evidenceByKey = groupEvidenceByKey(scan.evidence);

  for (const [key, scannedInterface] of scanned) {
    if (!confirmed.has(key)) {
      const label = labelFor(scannedInterface.method, scannedInterface.path);
      const sourceEvidence = evidenceFor(
        key,
        scannedInterface.evidence,
        evidenceByKey,
        fallbackEvidence(scannedInterface.method, scannedInterface.path, scannedInterface.sourcePath, scannedInterface.confidence),
      );
      findings.push({
        id: `missing-in-status:${key}`,
        fingerprint: fingerprintFromParts("missing_in_status", key),
        severity: "warning",
        kind: "missing_in_status",
        triageStatus: "open",
        title: `Scanned interface is not recorded: ${label}`,
        detail: `Scanner found ${label} in ${evidenceSummary(sourceEvidence, scannedInterface.sourcePath)}, but status.json has no matching interface.`,
        affectedIds: [key],
        proposedAction: `Confirm whether ${label} belongs in status.json, then add it with purpose, callers, callees, feature ownership, and test status.`,
        evidenceIds: [],
        proposedInterface: proposedInterfaceFor(scannedInterface.method, scannedInterface.path, sourceEvidence),
        sourceEvidence,
      });
    }
  }

  for (const [key, scannedCall] of called) {
    if (!confirmed.has(key) && !scanned.has(key)) {
      const label = labelFor(scannedCall.method, scannedCall.path);
      const sourceEvidence = evidenceFor(key, scannedCall.evidence, evidenceByKey);
      findings.push({
        id: `missing-call-in-status:${key}`,
        fingerprint: fingerprintFromParts("missing_call_in_status", key),
        severity: "info",
        kind: "missing_call_in_status",
        triageStatus: "open",
        title: `Script call is not recorded: ${label}`,
        detail: `Scanner found a script or smoke call to ${label} in ${evidenceSummary(sourceEvidence, scannedCall.sourcePath)}, but status.json has no matching interface.`,
        affectedIds: [key],
        proposedAction: `Confirm whether ${label} is a real project interface. If yes, record it with purpose and ownership; if it is only test scaffolding, leave it as script evidence.`,
        evidenceIds: [],
        sourceEvidence,
      });
    }
  }

  for (const [key, confirmedInterface] of confirmed) {
    if (!scanned.has(key) && !called.has(key)) {
      const label = labelFor(confirmedInterface.method, confirmedInterface.path);
      const sourceEvidence = evidenceFor(key, confirmedInterface.sourceEvidence, evidenceByKey);
      findings.push({
        id: `missing-in-code:${key}`,
        fingerprint: fingerprintFromParts("missing_in_code", key),
        severity: "warning",
        kind: "missing_in_code",
        triageStatus: "open",
        title: `Recorded interface was not found by scanner: ${label}`,
        detail: `status.json records ${label}, but the scanner did not find matching route, OpenAPI, or script-call evidence. This can be a scanner limitation or stale project state.`,
        affectedIds: [confirmedInterface.id],
        proposedAction: `Check whether ${label} still exists. If it was removed, confirm removal from status.json; if it is dynamic, add evidence so the scanner mismatch is explainable.`,
        evidenceIds: confirmedInterface.evidenceIds,
        sourceEvidence,
      });
    }
  }

  for (const error of scan.errors) {
    findings.push({
      id: `scan-error:${error.source}`,
      fingerprint: fingerprintFromParts("scan_error", error.source),
      severity: "error",
      kind: "scan_error",
      triageStatus: "open",
      title: `Scanner error: ${error.source}`,
      detail: error.message,
      affectedIds: [],
      proposedAction:
        "Fix the scanner error, then run codex-scope refresh again. Do not overwrite confirmed state while scanning is failing.",
      evidenceIds: [],
    });
  }

  return findings;
}

export function sourceEvidenceForInterface(item: InterfaceStatus, scan: ScanResult): SourceEvidence[] {
  const key = interfaceKey(item.method, item.path);
  return [
    ...scan.evidence.filter((evidence) => interfaceKey(evidence.method, evidence.path) === key),
    ...(item.sourceEvidence ?? []).filter((evidence) => interfaceKey(evidence.method, evidence.path) === key),
  ].filter(uniqueEvidence);
}

function interfaceKey(method?: string, path?: string): string {
  return `${normalizeMethod(method)}:${path?.trim() ?? ""}`;
}

function labelFor(method?: string, path?: string): string {
  return `${normalizeMethod(method)} ${path ?? "(unknown path)"}`;
}

function normalizeMethod(method?: string): string {
  return method?.trim().toUpperCase() || "ANY";
}

function isScannableConfirmedInterface(item: InterfaceStatus): boolean {
  return item.kind === "http" && typeof item.path === "string" && item.path.trim().length > 0;
}

function groupEvidenceByKey(evidenceItems: SourceEvidence[]): Map<string, SourceEvidence[]> {
  const map = new Map<string, SourceEvidence[]>();
  for (const evidence of evidenceItems) {
    const key = interfaceKey(evidence.method, evidence.path);
    map.set(key, [...(map.get(key) ?? []), evidence]);
  }
  return map;
}

function evidenceFor(
  key: string,
  primary: SourceEvidence[] | undefined,
  evidenceByKey: Map<string, SourceEvidence[]>,
  fallback: SourceEvidence[] = [],
): SourceEvidence[] {
  return [...(primary ?? []), ...(evidenceByKey.get(key) ?? []), ...fallback].filter(uniqueEvidence);
}

function uniqueEvidence(item: SourceEvidence, index: number, items: SourceEvidence[]): boolean {
  const key = `${item.kind}:${interfaceKey(item.method, item.path)}:${item.sourcePath}`;
  return items.findIndex((candidate) => `${candidate.kind}:${interfaceKey(candidate.method, candidate.path)}:${candidate.sourcePath}` === key) === index;
}

function evidenceSummary(evidence: SourceEvidence[], fallback: string): string {
  const sourcePaths = Array.from(new Set(evidence.map((item) => item.sourcePath)));
  return sourcePaths.length > 0 ? sourcePaths.join(", ") : fallback;
}

function proposedInterfaceFor(
  method: string | undefined,
  path: string,
  sourceEvidence: SourceEvidence[],
): ProposedInterfaceDraft {
  const label = labelFor(method, path);
  return {
    id: interfaceKey(method, path),
    name: label,
    kind: "http",
    method: normalizeMethod(method),
    path,
    purpose: `Confirm and document ${label}.`,
    callerIds: [],
    calleeIds: [],
    featureIds: [],
    testStatus: "unknown",
    evidenceIds: [],
    sourceEvidence,
  };
}

function fallbackEvidence(
  method: string | undefined,
  path: string,
  sourcePath: string,
  confidence: SourceEvidence["confidence"],
): SourceEvidence[] {
  const kind = /\.ya?ml$/i.test(sourcePath) ? "openapi" : "route";
  return [{ kind, method: normalizeMethod(method), path, sourcePath, confidence }];
}
