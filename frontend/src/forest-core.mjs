/** Portable sklearn forest evaluator. No network, UI or dependencies. */
export function treePath(tree, values) {
  const path = [];
  let node = 0;
  while (true) {
    path.push(node);
    if (tree.left[node] === -1) return path;
    node =
      Math.fround(values[tree.feature[node]]) <= tree.threshold[node]
        ? tree.left[node]
        : tree.right[node];
  }
}
export function treeScores(forest, values) {
  return forest.trees.map((tree) => {
    const path = treePath(tree, values);
    return tree.probability[path[path.length - 1]];
  });
}
export function predictProbability(forest, values) {
  const scores = treeScores(forest, values);
  return scores.reduce((sum, p) => sum + p, 0) / scores.length;
}
