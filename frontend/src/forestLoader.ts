import { asset } from "./runtime";
import type { Forest } from "./forest-core.mjs";
let forestPromise: Promise<Forest> | undefined;
export function loadForest(): Promise<Forest> {
  if (!forestPromise)
    forestPromise = fetch(asset("data/forest.json"))
      .then(async (r) => {
        if (!r.ok)
          throw new Error("The model could not be loaded. Please reload.");
        return r.json();
      })
      .catch((e) => {
        forestPromise = undefined;
        throw e;
      });
  return forestPromise;
}
