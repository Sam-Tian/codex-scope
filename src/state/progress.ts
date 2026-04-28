import type { FeatureStatus } from "./types.js";

export type ProjectProgress = {
  percent: number;
  basis: "equal" | "weighted";
  featureCount: number;
  weights: Array<{ featureId: string; weight: number }>;
};

export function calculateProjectProgress(features: FeatureStatus[]): ProjectProgress {
  const active = features.filter((feature) => feature.status !== "unknown");
  if (active.length === 0) {
    return { percent: 0, basis: "equal", featureCount: 0, weights: [] };
  }

  const hasWeights = active.some((feature) => typeof feature.weight === "number");
  if (!hasWeights) {
    const total = active.reduce((sum, feature) => sum + feature.percent, 0);
    return {
      percent: Math.round(total / active.length),
      basis: "equal",
      featureCount: active.length,
      weights: [],
    };
  }

  const weights = active.map((feature) => ({
    featureId: feature.id,
    weight: feature.weight ?? 1,
  }));
  const denominator = weights.reduce((sum, item) => sum + item.weight, 0);
  const weightedTotal = active.reduce((sum, feature) => sum + feature.percent * (feature.weight ?? 1), 0);

  return {
    percent: denominator === 0 ? 0 : Math.round(weightedTotal / denominator),
    basis: "weighted",
    featureCount: active.length,
    weights,
  };
}
