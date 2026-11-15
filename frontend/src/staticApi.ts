import { features, type Inputs, type Prediction } from "./types";
import { asset } from "./runtime";
import { predictProbability, type Forest } from "./forest-core.mjs";
import { loadForest } from "./forestLoader";
const ranges: Record<string, number[]> = {
  amount: [100, 50000],
  payment_terms: [14, 90],
  customer_tenure: [1, 180],
  prior_invoices: [1, 119],
  prior_late_rate: [0, 1],
  avg_days_late: [0, 90],
  credit_utilisation: [0, 1],
};
export function validateRecord(record: unknown): Inputs {
  if (!record || typeof record !== "object" || Array.isArray(record))
    throw new Error("Expected an invoice object.");
  const row = record as Record<string, unknown>;
  if (
    Object.keys(row).length !== features.length ||
    Object.keys(row).some(
      (k) => !features.includes(k as (typeof features)[number]),
    )
  )
    throw new Error("Use exactly the seven supported invoice features.");
  for (const f of features) {
    const v = row[f];
    const [min, max] = ranges[f];
    if (typeof v !== "number" || !Number.isFinite(v) || v < min || v > max)
      throw new Error(
        `${f} must be a finite number between ${min} and ${max}.`,
      );
    if (
      ["payment_terms", "customer_tenure", "prior_invoices"].includes(f) &&
      !Number.isInteger(v)
    )
      throw new Error(`${f} must be an integer.`);
  }
  if (row.prior_late_rate === 0 && row.avg_days_late !== 0)
    throw new Error(
      "With no historical late payments, average days late must be zero.",
    );
  return row as Inputs;
}
function basic(forest: Forest, row: Inputs) {
  const raw = predictProbability(
    forest,
    features.map((f) => row[f]),
  );
  return {
    probability: Number(raw.toFixed(6)),
    risk_band: raw >= 0.6 ? "High" : raw >= 0.3 ? "Medium" : "Low",
    review: raw >= forest.threshold,
    model_version: forest.version,
  };
}
export async function browserPrediction(row: Inputs): Promise<Prediction> {
  const forest = await loadForest();
  const start = performance.now();
  const original = basic(forest, row);
  const sensitivities = features
    .map((f) => {
      const reference = forest.reference[f].mean;
      const alternate = basic(forest, { ...row, [f]: reference });
      return {
        feature: f,
        label: forest.labels[f],
        delta: Number(
          (original.probability - alternate.probability).toFixed(6),
        ),
        reference,
      };
    })
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return {
    ...original,
    sensitivities,
    latency_ms: Math.max(0.01, Number((performance.now() - start).toFixed(2))),
  };
}
export async function staticRequest<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const aborted = () => {
    if (init?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  };
  aborted();
  let result: unknown;
  if (url === "/api/report" || url === "/api/portfolio") {
    const r = await fetch(
      asset(url === "/api/report" ? "data/report.json" : "data/portfolio.json"),
      { signal: init?.signal },
    );
    if (!r.ok) throw new Error("Could not load the demonstration data.");
    result = await r.json();
  } else if (url === "/api/predict") {
    result = await browserPrediction(
      validateRecord(JSON.parse(String(init?.body))),
    );
  } else if (url === "/api/batch") {
    const payload = JSON.parse(String(init?.body));
    if (
      !payload ||
      Object.keys(payload).length !== 1 ||
      !Array.isArray(payload.invoices) ||
      payload.invoices.length < 1 ||
      payload.invoices.length > 250
    )
      throw new Error("Provide between 1 and 250 invoices.");
    const rows = payload.invoices.map(validateRecord) as Inputs[];
    const forest = await loadForest();
    result = {
      predictions: rows.map((row) => basic(forest, row)),
      count: rows.length,
      shift_diagnostics: features.map((f) => {
        const ref = forest.reference[f];
        const mean = rows.reduce((s, row) => s + row[f], 0) / rows.length;
        return {
          feature: f,
          label: forest.labels[f],
          batch_mean: mean,
          standardised_shift: Number(
            ((mean - ref.mean) / Math.max(ref.std, 1e-9)).toFixed(3),
          ),
        };
      }),
    };
  } else throw new Error("This endpoint is not available in the browser demo.");
  aborted();
  return result as T;
}
