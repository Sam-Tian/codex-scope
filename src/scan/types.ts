import type { SourceEvidence } from "../state/types.js";

export type ScanResult = {
  root: string;
  packageName?: string;
  docs: string[];
  testFiles: string[];
  sourceFiles: string[];
  interfaces: ScannedInterface[];
  calls: ScannedCall[];
  evidence: SourceEvidence[];
  errors: ScanError[];
};

export type ScannedInterface = {
  id: string;
  method?: string;
  path: string;
  sourcePath: string;
  confidence: "high" | "medium" | "low";
  evidence?: SourceEvidence[];
};

export type ScannedCall = {
  id: string;
  method?: string;
  path: string;
  sourcePath: string;
  confidence: "high" | "medium" | "low";
  evidence?: SourceEvidence[];
};

export type ScanError = {
  source: string;
  message: string;
};
