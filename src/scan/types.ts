export type ScanResult = {
  root: string;
  packageName?: string;
  docs: string[];
  testFiles: string[];
  sourceFiles: string[];
  interfaces: ScannedInterface[];
  calls: ScannedCall[];
  errors: ScanError[];
};

export type ScannedInterface = {
  id: string;
  method?: string;
  path: string;
  sourcePath: string;
  confidence: "high" | "medium" | "low";
};

export type ScannedCall = {
  id: string;
  method?: string;
  path: string;
  sourcePath: string;
  confidence: "high" | "medium" | "low";
};

export type ScanError = {
  source: string;
  message: string;
};
