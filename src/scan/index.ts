import { classifyDocs, classifySources, classifyTests, listFiles, readPackageName } from "./generic.js";
import { scanTypeScriptNode } from "./typescript-node.js";
import type { ScanResult } from "./types.js";

export async function scanRepository(root: string): Promise<ScanResult> {
  try {
    const files = await listFiles(root);
    const sourceFiles = classifySources(files);
    const nodeScan = await scanTypeScriptNode(root, sourceFiles);

    return {
      root,
      packageName: await readPackageName(root),
      docs: classifyDocs(files),
      testFiles: classifyTests(files),
      sourceFiles,
      interfaces: nodeScan.interfaces,
      calls: nodeScan.calls,
      errors: [],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      root,
      docs: [],
      testFiles: [],
      sourceFiles: [],
      interfaces: [],
      calls: [],
      errors: [{ source: "scanRepository", message }],
    };
  }
}
