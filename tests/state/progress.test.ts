import { describe, expect, it } from "vitest";
import { calculateProjectProgress } from "../../src/state/progress.js";
import type { FeatureStatus } from "../../src/state/types.js";

function feature(id: string, percent: number, weight?: number): FeatureStatus {
  return {
    id,
    name: id,
    purpose: id,
    status: percent === 100 ? "complete" : "in_progress",
    percent,
    weight,
    acceptance: [],
    moduleIds: [],
    interfaceIds: [],
    riskIds: [],
    evidenceIds: [],
  };
}

describe("calculateProjectProgress", () => {
  it("uses equal feature weights by default", () => {
    expect(calculateProjectProgress([feature("a", 100), feature("b", 50)])).toEqual({
      percent: 75,
      basis: "equal",
      featureCount: 2,
      weights: [],
    });
  });

  it("uses weights when any active feature defines weight", () => {
    expect(calculateProjectProgress([feature("a", 100, 3), feature("b", 50, 1)])).toEqual({
      percent: 88,
      basis: "weighted",
      featureCount: 2,
      weights: [
        { featureId: "a", weight: 3 },
        { featureId: "b", weight: 1 },
      ],
    });
  });

  it("ignores unknown features in the project percentage", () => {
    const unknown = feature("unknown", 0);
    unknown.status = "unknown";

    expect(calculateProjectProgress([feature("a", 100), unknown])).toEqual({
      percent: 100,
      basis: "equal",
      featureCount: 1,
      weights: [],
    });
  });
});
