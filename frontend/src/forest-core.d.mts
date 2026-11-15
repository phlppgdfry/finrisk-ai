export interface ForestTree {
  left: number[];
  right: number[];
  feature: number[];
  threshold: number[];
  probability: number[];
  samples: number[];
  impurity: number[];
}
export interface Forest {
  format: number;
  version: string;
  features: string[];
  labels: Record<string, string>;
  model_sha256: string;
  trees: ForestTree[];
  threshold: number;
  reference: Record<
    string,
    { mean: number; std: number; min: number; max: number }
  >;
}
export function treePath(tree: ForestTree, values: number[]): number[];
export function treeScores(forest: Forest, values: number[]): number[];
export function predictProbability(forest: Forest, values: number[]): number;
