export type WorkStatus = "not_started" | "in_progress" | "complete" | "blocked" | "unknown";
export type TestStatus = "none" | "partial" | "passing" | "failing" | "unknown";
export type ModuleKind = "frontend" | "backend" | "worker" | "database" | "external" | "tooling" | "unknown";
export type EvidenceKind = "code" | "test" | "doc" | "commit" | "scan" | "manual";
export type FindingSeverity = "info" | "warning" | "error";

export type ArchitectureStatus = {
  schemaVersion: 1;
  project: ProjectInfo;
  features: FeatureStatus[];
  modules: ModuleStatus[];
  interfaces: InterfaceStatus[];
  flows: FlowStatus[];
  risks: RiskStatus[];
  evidence: EvidenceRef[];
  scanFindings: ScanFinding[];
};

export type ProjectInfo = {
  id: string;
  name: string;
  goal: string;
  phase: string;
  sourcePath: string;
  updatedAt: string;
};

export type FeatureStatus = {
  id: string;
  name: string;
  purpose: string;
  status: WorkStatus;
  percent: number;
  weight?: number;
  acceptance: string[];
  moduleIds: string[];
  interfaceIds: string[];
  riskIds: string[];
  evidenceIds: string[];
};

export type ModuleStatus = {
  id: string;
  name: string;
  kind: ModuleKind;
  status: WorkStatus;
  percent: number;
  dependsOn: string[];
  evidenceIds: string[];
};

export type InterfaceStatus = {
  id: string;
  name: string;
  kind: "http" | "event" | "cli" | "db" | "external";
  method?: string;
  path?: string;
  purpose: string;
  callerIds: string[];
  calleeIds: string[];
  featureIds: string[];
  testStatus: TestStatus;
  evidenceIds: string[];
};

export type FlowStatus = {
  id: string;
  name: string;
  entry: string;
  steps: string[];
  interfaceIds: string[];
  status: WorkStatus;
};

export type RiskStatus = {
  id: string;
  title: string;
  severity: FindingSeverity;
  status: "open" | "mitigated" | "accepted";
  affectedIds: string[];
  evidenceIds: string[];
};

export type EvidenceRef = {
  id: string;
  kind: EvidenceKind;
  path: string;
  note: string;
};

export type ScanFinding = {
  id: string;
  severity: FindingSeverity;
  kind: "missing_in_status" | "missing_in_code" | "test_mismatch" | "progress_mismatch" | "scan_error";
  title: string;
  detail: string;
  affectedIds: string[];
  proposedAction: string;
  evidenceIds: string[];
};
