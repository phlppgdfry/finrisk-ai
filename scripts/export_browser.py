"""Export the saved forest for real, serverless inference on GitHub Pages."""

import csv
import io
import json
import hashlib
import joblib
import numpy as np
import pandas as pd
from types import SimpleNamespace
from invoice_risk.data import ROOT, FEATURES, LABELS, generate
from invoice_risk.api import make_portfolio


def export():
    out = ROOT / "frontend/public/data"
    out.mkdir(parents=True, exist_ok=True)
    model = joblib.load(ROOT / "artifacts/model.joblib")
    report = json.loads((ROOT / "artifacts/report.json").read_text())
    assert (
        hashlib.sha256((ROOT / "artifacts/model.joblib").read_bytes()).hexdigest() == report["model_sha256"]
    )
    trees = []
    for estimator in model.estimators_:
        t = estimator.tree_
        counts = t.value[:, 0, :]
        positive = counts[:, 1] / counts.sum(axis=1)
        trees.append(
            {
                "left": t.children_left.tolist(),
                "right": t.children_right.tolist(),
                "feature": t.feature.tolist(),
                "threshold": t.threshold.tolist(),
                "probability": positive.tolist(),
                "samples": t.n_node_samples.tolist(),
                "impurity": t.impurity.tolist(),
            }
        )
    forest = {
        "format": 1,
        "version": report["version"],
        "features": FEATURES,
        "labels": LABELS,
        "model_sha256": report["model_sha256"],
        "trees": trees,
        "threshold": report["threshold"],
        "reference": report["reference"],
    }
    app = SimpleNamespace(state=SimpleNamespace(model=model, report=report))
    portfolio = {
        "invoices": make_portfolio(app),
        "as_of": "2026-11-15",
        "synthetic": True,
        "threshold": report["threshold"],
    }
    (out / "forest.json").write_text(json.dumps(forest, separators=(",", ":")))
    (out / "report.json").write_text(json.dumps(report, separators=(",", ":")))
    (out / "portfolio.json").write_text(json.dumps(portfolio, separators=(",", ":")))
    # Python oracle fixtures include all seeded invoices, random examples and near-split values.
    records = generate(400, seed=517)[FEATURES].to_dict(orient="records")
    records.extend([{f: r[f] for f in FEATURES} for r in portfolio["invoices"]])
    for tree in model.estimators_[:30]:
        t = tree.tree_
        for node in np.flatnonzero(t.feature >= 0)[:4]:
            for shift in [-1e-7, 0, 1e-7]:
                r = dict(records[0])
                r[FEATURES[t.feature[node]]] = float(t.threshold[node]) + shift
                records.append(r)
    expected = model.predict_proba(pd.DataFrame(records, columns=FEATURES))[:, 1].tolist()
    fixtures = {"model_sha256": report["model_sha256"], "records": records, "probabilities": expected}
    (ROOT / "artifacts/browser-fixtures.json").write_text(json.dumps(fixtures, separators=(",", ":")))
    fields = list(portfolio["invoices"][0])
    buffer = io.StringIO()
    writer = csv.DictWriter(buffer, fieldnames=fields)
    writer.writeheader()
    writer.writerows(portfolio["invoices"])
    (out / "portfolio.csv").write_text(buffer.getvalue())
    sample = io.StringIO()
    w = csv.DictWriter(sample, fieldnames=FEATURES)
    w.writeheader()
    w.writerows([{f: r[f] for f in FEATURES} for r in portfolio["invoices"][:5]])
    (out / "sample.csv").write_text(sample.getvalue())
    docs = ROOT / "frontend/public/reading"
    docs.mkdir(exist_ok=True)
    for name in ["MODEL_CARD.md", "LEERGIDS_NL.md", "INTERVIEW_NL.md", "DATA_CONTRACT.md", "evaluation.html"]:
        (docs / name).write_bytes((ROOT / "docs" / name).read_bytes())
    print(
        f"Exported {len(trees)} real trees, {(out / 'forest.json').stat().st_size / 1e6:.2f} MB; {len(records)} parity fixtures"
    )
    return forest


if __name__ == "__main__":
    export()
