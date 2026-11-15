"""Generate a standalone, shareable evaluation from the actual training artifact."""

import html
import json
from invoice_risk.data import ROOT


def main():
    r = json.loads((ROOT / "artifacts/report.json").read_text())
    m = r["metrics"]
    rows = ""
    for name, metrics in [("Random Forest", m), *r["baselines"].items()]:
        cells = "".join(
            f"<td>{metrics[k]:.3f}</td>" for k in ["roc_auc", "pr_auc", "precision", "recall", "f1", "brier"]
        )
        rows += f"<tr><th>{html.escape(name)}</th>{cells}</tr>"
    text = f"""<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>FinRisk AI · Evaluation</title><style>
    body{{margin:0;background:#f5f7f4;color:#254632;font:16px/1.7 Arial,sans-serif}}main{{max-width:980px;margin:auto;padding:60px 24px}}h1,h2{{font-family:Georgia,serif;font-weight:400;letter-spacing:-1px}}h1{{font-size:48px}}h2{{font-size:29px}}p{{color:#697e64}}section{{background:white;border:1px solid #dfe6d8;border-radius:10px;padding:26px;margin:25px 0}}table{{border-collapse:collapse;width:100%;font-size:13px}}th,td{{text-align:left;padding:12px;border-bottom:1px solid #e9eee4}}.table{{overflow:auto}}.stats{{display:flex;flex-wrap:wrap;gap:30px}}.stats strong{{display:block;font:42px Georgia,serif}}small{{color:#78906a}}code{{overflow-wrap:anywhere;font-size:11px}}li{{margin:12px 0}}a{{color:#51783f}}@media print{{body{{background:white}}main{{padding:0}}section{{break-inside:avoid}}}}</style><main><small>INDEPENDENT PORTFOLIO · PHILIPPE GODFROY</small><h1>FinRisk AI<br>Model evaluation</h1><p>A reproducible Random Forest invoice-payment risk prototype. Synthetic data only; these results do not establish real-world financial performance.</p>
    <section class="stats"><div><small>ROC-AUC</small><strong>{m["roc_auc"]:.3f}</strong></div><div><small>Recall</small><strong>{m["recall"]:.1%}</strong></div><div><small>Precision</small><strong>{m["precision"]:.1%}</strong></div><div><small>Test invoices</small><strong>{r["test_rows"]:,}</strong></div></section>
    <section><h2>Compare against simpler models</h2><div class="table"><table><thead><tr><th>Model</th><th>ROC-AUC</th><th>PR-AUC</th><th>Precision</th><th>Recall</th><th>F1</th><th>Brier ↓</th></tr></thead><tbody>{rows}</tbody></table></div><p>Logistic regression is a serious alternative. This forest is served to demonstrate an end-to-end engineering workflow, not because complexity guarantees better predictions.</p></section>
    <section><h2>Policy and error analysis</h2><p>Deployed threshold: <b>{r["threshold"]:.0%}</b>. Selected on validation data to minimise 1 × false alarms + 5 × missed late invoices, in illustrative cost units. This is not a euro loss estimate.</p><p>True positives {m["tp"]}; false positives {m["fp"]}; true negatives {m["tn"]}; false negatives {m["fn"]}.</p><p>Test prevalence {r["prevalence"]:.1%}. PR-AUC {m["pr_auc"]:.3f}; Brier {m["brier"]:.3f}. ROC-AUC 95% percentile bootstrap interval {r["auc_interval"][0]:.3f}–{r["auc_interval"][1]:.3f}, using 250 resamples.</p></section>
    <section><h2>Protocol and limitations</h2><ul><li>{r["rows"]:,} seeded synthetic observations. Chronological 60/20/20 split: {r["train_rows"]:,} train / {r["validation_rows"]:,} validation / {r["test_rows"]:,} test.</li><li>Seven issuance-time features. No payment outcome or overdue-status fields in the feature matrix.</li><li>Fixed forest parameters. Permutation importance is measured on validation data. The final test set is reserved for reporting.</li><li>Uncalibrated probability estimates. Chronological synthetic dates do not represent real concept drift or mature-label availability.</li><li>Historical rows are independently generated and do not model recurring customer histories. No validated fairness, causal treatment effects or financial returns.</li><li>Before deployment: real-world backtesting, calibration, operational capacity constraints, privacy review, authentication and outcome monitoring.</li></ul></section>
    <section><h2>Provenance</h2><p>Model v{r["version"]} · seed {r["seed"]} · scikit-learn {r["sklearn_version"]}<br>Generated {html.escape(r["trained_at"])}</p><small>Dataset SHA-256</small><p><code>{r["data_sha256"]}</code></p><small>Model SHA-256</small><p><code>{r["model_sha256"]}</code></p></section><p>Run <code>python -m invoice_risk.train</code> and <code>python -m scripts.report</code> to regenerate.</p></main></html>"""
    (ROOT / "docs/evaluation.html").write_text(text)
    print("Generated docs/evaluation.html from artifacts/report.json")


if __name__ == "__main__":
    main()
