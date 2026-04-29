import type {
  FindingDecision,
  FindingDecisionValue,
  ScanFinding,
  ScanFindingKind,
} from "../state/types.js";

export type FindingUpdate = {
  id: string;
  decision: FindingDecisionValue;
  reason: string;
};

export function applyFindingDecisions(
  findings: ScanFinding[],
  decisions: FindingDecision[] | undefined,
  timestamp: string,
): { findings: ScanFinding[]; decisions: FindingDecision[] } {
  const existing = decisions ?? [];
  const byId = new Map(existing.map((decision) => [decision.id, decision]));
  const byFingerprint = new Map(existing.map((decision) => [decision.fingerprint, decision]));
  const matchedIds = new Set<string>();

  const nextFindings = findings.map((finding) => {
    const fingerprint = fingerprintForFinding(finding);
    const decision = byId.get(finding.id) ?? byFingerprint.get(fingerprint);
    if (!decision) {
      return { ...finding, fingerprint, triageStatus: finding.triageStatus ?? "open" };
    }
    matchedIds.add(decision.id);
    return { ...finding, fingerprint, triageStatus: decision.decision };
  });

  const updatedDecisions = existing.map((decision) => {
    const finding = nextFindings.find(
      (item) => item.id === decision.id || item.fingerprint === decision.fingerprint,
    );
    if (finding) {
      return snapshotDecision(
        {
          ...decision,
          id: finding.id,
          fingerprint: finding.fingerprint ?? fingerprintForFinding(finding),
          status: "active",
          lastSeenAt: timestamp,
          resolvedAt: undefined,
        },
        finding,
      );
    }
    if (matchedIds.has(decision.id) || decision.status === "resolved") {
      return decision;
    }
    return {
      ...decision,
      status: "resolved" as const,
      resolvedAt: decision.resolvedAt ?? timestamp,
    };
  });

  return { findings: nextFindings, decisions: updatedDecisions };
}

export function upsertFindingDecisions(
  existing: FindingDecision[] | undefined,
  updates: FindingUpdate[],
  currentFindings: ScanFinding[],
  timestamp: string,
): FindingDecision[] {
  const map = new Map((existing ?? []).map((decision) => [decision.id, decision]));
  const currentById = new Map(currentFindings.map((finding) => [finding.id, finding]));

  for (const update of updates) {
    const finding = currentById.get(update.id);
    const current = map.get(update.id);
    const fingerprint = finding ? fingerprintForFinding(finding) : fingerprintFromFindingId(update.id);
    const next: FindingDecision = {
      ...current,
      id: update.id,
      fingerprint,
      decision: update.decision,
      reason: update.reason,
      status: "active",
      updatedAt: timestamp,
      lastSeenAt: finding ? timestamp : current?.lastSeenAt,
      resolvedAt: undefined,
    };
    map.set(update.id, finding ? snapshotDecision(next, finding) : next);
  }

  return Array.from(map.values());
}

export function fingerprintForFinding(finding: ScanFinding): string {
  return finding.fingerprint ?? fingerprintFromParts(finding.kind, finding.affectedIds[0] ?? finding.id);
}

export function fingerprintFromFindingId(id: string): string {
  if (id.startsWith("missing-in-status:")) {
    return fingerprintFromParts("missing_in_status", id.slice("missing-in-status:".length));
  }
  if (id.startsWith("missing-call-in-status:")) {
    return fingerprintFromParts("missing_call_in_status", id.slice("missing-call-in-status:".length));
  }
  if (id.startsWith("missing-in-code:")) {
    return fingerprintFromParts("missing_in_code", id.slice("missing-in-code:".length));
  }
  if (id.startsWith("scan-error:")) {
    return fingerprintFromParts("scan_error", id.slice("scan-error:".length));
  }
  return id.replace(/-/g, "_");
}

export function fingerprintFromParts(kind: ScanFindingKind, key: string): string {
  return `${kind}:${key}`;
}

export function countOpenFindings(findings: ScanFinding[]): number {
  return findings.filter((finding) => (finding.triageStatus ?? "open") === "open").length;
}

function snapshotDecision(decision: FindingDecision, finding: ScanFinding): FindingDecision {
  return {
    ...decision,
    title: finding.title,
    kind: finding.kind,
    severity: finding.severity,
    affectedIds: finding.affectedIds,
    proposedInterface: finding.proposedInterface,
    sourceEvidence: finding.sourceEvidence,
  };
}
