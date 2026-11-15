import { STATIC_DEMO } from "./runtime";
export const features = [
  "amount",
  "payment_terms",
  "customer_tenure",
  "prior_invoices",
  "prior_late_rate",
  "avg_days_late",
  "credit_utilisation",
] as const;
export type Feature = (typeof features)[number];
export type Inputs = Record<Feature, number>;
export type Prediction = {
  probability: number;
  risk_band: string;
  review: boolean;
  model_version: string;
  latency_ms: number;
  sensitivities: {
    feature: Feature;
    label: string;
    delta: number;
    reference: number;
  }[];
};
export type Invoice = Inputs & {
  invoice_id: string;
  customer: string;
  initials: string;
  due_date: string;
  probability: number;
  risk_band: string;
  review: boolean;
};
export type Metrics = {
  roc_auc: number;
  pr_auc: number;
  brier: number;
  precision: number;
  recall: number;
  f1: number;
  accuracy: number;
  tn: number;
  fp: number;
  fn: number;
  tp: number;
  toy_cost: number;
  flagged: number;
  threshold?: number;
};
export type Report = {
  version: string;
  trained_at: string;
  data_sha256: string;
  model_sha256: string;
  sklearn_version: string;
  rows: number;
  train_rows: number;
  validation_rows: number;
  test_rows: number;
  threshold: number;
  prevalence: number;
  metrics: Metrics;
  auc_interval: number[];
  baselines: Record<string, Metrics>;
  thresholds: (Metrics & { threshold: number })[];
  calibration: { predicted: number; observed: number; count: number }[];
  feature_importance: {
    feature: string;
    label: string;
    mean: number;
    std: number;
  }[];
  slices: (Metrics & { name: string; rows: number })[];
  periods: Record<string, string[]>;
};
export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  if (STATIC_DEMO) {
    const { staticRequest } = await import("./staticApi");
    return staticRequest<T>(url, init);
  }
  const r = await fetch(url, init);
  if (!r.ok) {
    let detail = "";
    try {
      const b = await r.json();
      detail =
        typeof b.detail === "string" ? b.detail : JSON.stringify(b.detail);
    } catch {
      /* non-json */
    }
    throw new Error(detail || `Request failed (${r.status}).`);
  }
  return r.json();
}
export const money = (n: number) =>
  new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);
export const pct = (n: number, d = 0) => `${(n * 100).toFixed(d)}%`;
export function inputsOf(invoice: Inputs): Inputs {
  return Object.fromEntries(features.map((f) => [f, invoice[f]])) as Inputs;
}
