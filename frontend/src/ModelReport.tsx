import { useState } from "react";
import { Download, ArrowUpRight, Activity, Info } from "lucide-react";
import { Panel } from "./components";
import { type Report, pct } from "./types";
export function ModelReport({ report: r }: { report: Report }) {
  const [threshold, setThreshold] = useState(r.threshold);
  const m = r.thresholds.reduce(
    (best, row) =>
      Math.abs(row.threshold - threshold) < Math.abs(best.threshold - threshold)
        ? row
        : best,
    r.thresholds[0],
  );
  const models = [
    { name: "Random Forest", ...r.metrics },
    { name: "Logistic regression", ...r.baselines["Logistic regression"] },
    { name: "Prior dummy", ...r.baselines["Prior dummy"] },
  ];
  const maxImportance = Math.max(
    ...r.feature_importance.map((f) => f.mean),
    0.001,
  );
  return (
    <>
      <div className="page-intro">
        <div>
          <h1>Evidence over assumptions.</h1>
          <p>
            Held-out results, honest baselines and the trade-offs behind the
            score.
          </p>
        </div>
        <a className="secondary" href="/api/model-card">
          <Download size={16} /> Model card
        </a>
      </div>
      <div className="report-strip">
        <Activity size={18} />
        <span>Random Forest · 220 trees</span>
        <span>Seed 42</span>
        <span>scikit-learn {r.sklearn_version}</span>
        <span>{r.test_rows.toLocaleString()} test invoices</span>
      </div>
      <div className="stats report-stats">
        {[
          [
            "Test ROC-AUC",
            r.metrics.roc_auc.toFixed(3),
            "95% bootstrap interval " +
              r.auc_interval.map((n) => n.toFixed(3)).join("–"),
          ],
          [
            "PR-AUC",
            r.metrics.pr_auc.toFixed(3),
            `Positive prevalence ${pct(r.prevalence, 1)}`,
          ],
          [
            "Recall",
            pct(r.metrics.recall, 1),
            "At validation-selected threshold",
          ],
          [
            "Precision",
            pct(r.metrics.precision, 1),
            "Of flagged invoices actually late",
          ],
        ].map(([label, value, note]) => (
          <div className="stat" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{note}</small>
          </div>
        ))}
      </div>
      <Panel>
        <div className="section-title">
          <div>
            <h2>Does complexity earn its place?</h2>
            <p>
              Same untouched test set. Each trained model uses its own
              validation-selected threshold.
            </p>
          </div>
          <Info size={18} />
        </div>
        <div className="table-scroll">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>ROC-AUC</th>
                <th>PR-AUC</th>
                <th>Precision</th>
                <th>Recall</th>
                <th>F1</th>
                <th>Brier ↓</th>
              </tr>
            </thead>
            <tbody>
              {models.map((m, i) => (
                <tr key={m.name} className={i === 0 ? "highlight-row" : ""}>
                  <td>
                    <strong>{m.name}</strong>
                    {i === 0 && <small>Served model</small>}
                  </td>
                  {[
                    m.roc_auc,
                    m.pr_auc,
                    m.precision,
                    m.recall,
                    m.f1,
                    m.brier,
                  ].map((n, j) => (
                    <td key={j}>{n.toFixed(3)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="insight">
          <strong>
            {r.baselines["Logistic regression"].roc_auc > r.metrics.roc_auc
              ? "The simpler model wins on ROC-AUC."
              : "Random Forest leads on ROC-AUC."}
          </strong>
          <p>
            This forest is an engineering showcase, not an automatic production
            choice. A simpler model with better evidence deserves consideration.
            Accuracy alone misses the cost of false negatives.
          </p>
        </div>
      </Panel>
      <div className="two-col">
        <Panel>
          <h2>Choose your trade-off</h2>
          <p>
            Explore test-set behaviour. This slider does not change the deployed
            policy.
          </p>
          <label className="threshold-label" htmlFor="threshold">
            Exploratory threshold <b>{pct(threshold)}</b>
          </label>
          <input
            id="threshold"
            type="range"
            min="0.05"
            max="0.95"
            step="0.01"
            value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))}
          />
          <div className="range-labels">
            <span>More follow-up</span>
            <span>Fewer alerts</span>
          </div>
          <div className="confusion">
            <div className="correct">
              <small>Late · flagged</small>
              <strong>{m.tp}</strong>
            </div>
            <div className="wrong">
              <small>On time · flagged</small>
              <strong>{m.fp}</strong>
            </div>
            <div className="wrong">
              <small>Late · missed</small>
              <strong>{m.fn}</strong>
            </div>
            <div className="correct">
              <small>On time · cleared</small>
              <strong>{m.tn}</strong>
            </div>
          </div>
          <div className="policy-stats">
            <span>
              Recall <b>{pct(m.recall)}</b>
            </span>
            <span>
              Precision <b>{pct(m.precision)}</b>
            </span>
            <span>
              Toy cost <b>{m.toy_cost}</b>
            </span>
          </div>
          <p className="subtle">
            Toy cost = 1 × false alarms + 5 × missed late invoices. Illustrative
            units, not euros. Deployed threshold: {pct(r.threshold)}, selected
            only on validation data.
          </p>
          <button
            className="text-button"
            onClick={() => setThreshold(r.threshold)}
          >
            Reset to deployed threshold <ArrowUpRight size={14} />
          </button>
        </Panel>
        <Panel>
          <h2>Which inputs carry signal?</h2>
          <p>Validation permutation importance · drop in ROC-AUC</p>
          <div className="importance">
            {r.feature_importance.map((f) => (
              <div key={f.feature}>
                <div>
                  <span>{f.label}</span>
                  <strong>{f.mean.toFixed(3)}</strong>
                </div>
                <div className="importance-track">
                  <span
                    style={{ width: pct(Math.max(0, f.mean) / maxImportance) }}
                  />
                </div>
                <small>
                  ± {f.std.toFixed(3)} standard deviation · 5 repeats
                </small>
              </div>
            ))}
          </div>
          <p className="subtle">
            Correlated inputs can share importance. This describes the model on
            this synthetic distribution, not causal effects.
          </p>
        </Panel>
      </div>
      <div className="two-col">
        <Panel>
          <h2>Are the probabilities reliable?</h2>
          <p>Brier score {r.metrics.brier.toFixed(3)} · lower is better</p>
          <svg
            className="calibration-chart"
            viewBox="0 0 370 250"
            role="img"
            aria-label="Reliability diagram comparing predicted and observed late rates"
          >
            <line
              x1="45"
              y1="205"
              x2="340"
              y2="20"
              stroke="#bcc7c0"
              strokeDasharray="5 5"
            />
            {[0, 0.25, 0.5, 0.75, 1].map((n) => (
              <g key={n}>
                <line
                  x1="45"
                  x2="340"
                  y1={205 - n * 185}
                  y2={205 - n * 185}
                  stroke="#edf0ed"
                />
                <text x="32" y={209 - n * 185} textAnchor="end">
                  {pct(n)}
                </text>
                <text x={45 + n * 295} y="225" textAnchor="middle">
                  {pct(n)}
                </text>
              </g>
            ))}
            <polyline
              points={r.calibration
                .map(
                  (b) => `${45 + b.predicted * 295},${205 - b.observed * 185}`,
                )
                .join(" ")}
              fill="none"
              stroke="#174f3b"
              strokeWidth="2"
            />
            {r.calibration.map((b, i) => (
              <circle
                key={i}
                cx={45 + b.predicted * 295}
                cy={205 - b.observed * 185}
                r="4"
                fill="#174f3b"
              >
                <title>
                  {b.count} samples: predicted {pct(b.predicted)}, observed{" "}
                  {pct(b.observed)}
                </title>
              </circle>
            ))}
            <text x="190" y="248" textAnchor="middle">
              Predicted late rate · observed on vertical axis
            </text>
          </svg>
          <p className="subtle">
            The forest is not calibrated. Bins with few examples are unstable.
            Bootstrap intervals reflect sampling variation under the synthetic
            generator only.
          </p>
        </Panel>
        <Panel>
          <h2>Look beyond the average</h2>
          <p>Test slices · small samples require caution</p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Segment</th>
                  <th>n</th>
                  <th>AUC</th>
                  <th>Recall</th>
                </tr>
              </thead>
              <tbody>
                {r.slices.map((s) => (
                  <tr key={s.name}>
                    <td>{s.name}</td>
                    <td>{s.rows}</td>
                    <td>{s.roc_auc.toFixed(3)}</td>
                    <td>{pct(s.recall)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="spaced">A reproducible evaluation</h3>
          <div className="split-bar">
            <span style={{ flex: 6 }}>Train · 60%</span>
            <span style={{ flex: 2 }}>Val · 20%</span>
            <span style={{ flex: 2 }}>Test · 20%</span>
          </div>
          <p className="subtle">
            {r.train_rows.toLocaleString()} train /{" "}
            {r.validation_rows.toLocaleString()} validation /{" "}
            {r.test_rows.toLocaleString()} test. Sorted by synthetic issuance
            date. No future payment fields enter the model.
          </p>
          <details>
            <summary>Artifact provenance</summary>
            <dl className="provenance">
              <dt>Generated</dt>
              <dd>{r.trained_at}</dd>
              <dt>Dataset SHA-256</dt>
              <dd>{r.data_sha256}</dd>
              <dt>Model SHA-256</dt>
              <dd>{r.model_sha256}</dd>
              {Object.entries(r.periods).map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v.join(" → ")}</dd>
                </div>
              ))}
            </dl>
          </details>
        </Panel>
      </div>
      <div className="note">
        <strong>What these results can and cannot say</strong>
        <p>
          All data is synthetic. The generator defines the relationship we
          learn; chronological dates do not simulate real market drift,
          recurring customer histories, or delayed label availability. No
          real-world accuracy, financial return, fairness or deployment
          readiness is established.
        </p>
      </div>
    </>
  );
}
