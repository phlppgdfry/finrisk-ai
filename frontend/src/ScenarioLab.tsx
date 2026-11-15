import { useState } from "react";
import {
  ArrowRight,
  RotateCcw,
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
} from "lucide-react";
import { Panel, Badge, Sensitivities, fields } from "./components";
import { type Inputs, type Prediction, inputsOf, pct, request } from "./types";
export const defaultScenario: Inputs = {
  amount: 4500,
  payment_terms: 30,
  customer_tenure: 24,
  prior_invoices: 30,
  prior_late_rate: 0.35,
  avg_days_late: 12,
  credit_utilisation: 0.7,
};
export function ScenarioLab({
  initial,
  threshold,
}: {
  initial?: Inputs;
  threshold: number;
}) {
  const [form, setForm] = useState<Inputs>(
    initial ? inputsOf(initial) : defaultScenario,
  );
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [baseline, setBaseline] = useState<Prediction | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  async function run() {
    setBusy(true);
    setError("");
    try {
      const p = await request<Prediction>("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setPrediction(p);
      if (!baseline) setBaseline(p);
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Prediction failed.");
    } finally {
      setBusy(false);
    }
  }
  function preset(risk: string) {
    setForm(
      risk === "low"
        ? {
            amount: 2200,
            payment_terms: 30,
            customer_tenure: 110,
            prior_invoices: 95,
            prior_late_rate: 0.05,
            avg_days_late: 3,
            credit_utilisation: 0.2,
          }
        : risk === "high"
          ? {
              amount: 18000,
              payment_terms: 60,
              customer_tenure: 6,
              prior_invoices: 12,
              prior_late_rate: 0.65,
              avg_days_late: 28,
              credit_utilisation: 0.9,
            }
          : defaultScenario,
    );
    setDirty(true);
  }
  return (
    <>
      <div className="page-intro">
        <div>
          <h1>Explore the what-ifs.</h1>
          <p>Change an invoice profile. See how the Random Forest responds.</p>
        </div>
        <FlaskConical className="page-icon" />
      </div>
      <div className="lab-grid">
        <Panel className="form-panel">
          <div className="section-title">
            <h2>Build a scenario</h2>
            <button
              className="text-button"
              onClick={() => {
                setForm(defaultScenario);
                setPrediction(null);
                setBaseline(null);
                setDirty(false);
                setError("");
              }}
            >
              <RotateCcw size={14} /> Reset
            </button>
          </div>
          <div className="presets">
            <span>Start with</span>
            <button onClick={() => preset("low")}>Reliable customer</button>
            <button onClick={() => preset("high")}>Higher-risk profile</button>
            <button onClick={() => preset("typical")}>Typical invoice</button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run();
            }}
          >
            <div className="fields">
              {fields.map((f) => (
                <label className="field" key={f.key}>
                  <span>
                    {f.label}
                    <small>{f.unit}</small>
                  </span>
                  <input
                    type="number"
                    required
                    min={f.min}
                    max={f.max}
                    step={f.step}
                    value={form[f.key]}
                    onChange={(e) => {
                      const value = e.target.valueAsNumber;
                      setForm((v) => ({
                        ...v,
                        [f.key]: value,
                        ...(f.key === "prior_late_rate" && value === 0
                          ? { avg_days_late: 0 }
                          : {}),
                      }));
                      setDirty(true);
                    }}
                  />
                  <small>{f.help}</small>
                </label>
              ))}
            </div>
            {error && (
              <div className="error" role="alert">
                <AlertCircle size={18} />
                {error}
              </div>
            )}
            <button className="primary full" disabled={busy} type="submit">
              {busy ? (
                <LoaderCircle className="spin" size={17} />
              ) : (
                <FlaskConical size={17} />
              )}{" "}
              {busy ? "Running model…" : "Run prediction"}
              <ArrowRight size={17} />
            </button>
          </form>
        </Panel>
        <div className="lab-result">
          {prediction ? (
            <>
              <section className="prediction-card">
                <div className="section-title">
                  <span>Estimated late-payment risk</span>
                  <Badge band={prediction.risk_band} />
                </div>
                <div className="big-probability">
                  {pct(prediction.probability, 1)}
                </div>
                <div className="probability-track">
                  <span style={{ width: pct(prediction.probability) }} />
                </div>
                <p>
                  {prediction.review
                    ? "Flagged for human follow-up."
                    : "Below the current follow-up threshold."}
                </p>
                <div className="result-meta">
                  <span>Policy threshold {pct(threshold)}</span>
                  <span>
                    {prediction.latency_ms.toFixed(0)} ms · model v
                    {prediction.model_version}
                  </span>
                </div>
                {dirty && (
                  <div className="stale">
                    Inputs changed — run again to update this result.
                  </div>
                )}
                {baseline && baseline !== prediction && (
                  <div className="comparison">
                    Compared with your first run{" "}
                    <strong>
                      {(
                        (prediction.probability - baseline.probability) *
                        100
                      ).toFixed(1)}{" "}
                      percentage points
                    </strong>
                  </div>
                )}
              </section>
              <Panel>
                <Sensitivities prediction={prediction} />
              </Panel>
            </>
          ) : (
            <section className="prediction-card waiting">
              <FlaskConical size={36} />
              <h2>
                A small change.
                <br />A new perspective.
              </h2>
              <p>
                Choose a profile or enter your own values, then run a real model
                prediction.
              </p>
              <div className="result-meta">
                <CheckCircle2 size={15} /> Local inference · no external AI
                service
              </div>
            </section>
          )}
          <div className="note">
            <strong>A scenario is not a promise.</strong>
            <p>
              Scores are uncalibrated estimates from synthetic data. Changing a
              feature shows model behaviour; it does not prove that an action
              will change a real customer’s payment behaviour.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
