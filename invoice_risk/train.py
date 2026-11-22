"""Run: python -m invoice_risk.train. No test-driven hyperparameter tuning."""

import hashlib
import json
import platform
from datetime import datetime, timezone
import joblib
import numpy as np
import sklearn
from sklearn.ensemble import RandomForestClassifier
from sklearn.dummy import DummyClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    roc_auc_score,
    average_precision_score,
    brier_score_loss,
    precision_score,
    recall_score,
    f1_score,
    confusion_matrix,
)
from sklearn.inspection import permutation_importance
from invoice_risk.decisions import capacity_report
from invoice_risk.data import ROOT, FEATURES, LABELS, generate, split


def evaluate(y, probabilities, threshold):
    prediction = probabilities >= threshold
    tn, fp, fn, tp = confusion_matrix(y, prediction, labels=[0, 1]).ravel()
    return {
        "roc_auc": float(roc_auc_score(y, probabilities)),
        "pr_auc": float(average_precision_score(y, probabilities)),
        "brier": float(brier_score_loss(y, probabilities)),
        "precision": float(precision_score(y, prediction, zero_division=0)),
        "recall": float(recall_score(y, prediction, zero_division=0)),
        "f1": float(f1_score(y, prediction, zero_division=0)),
        "accuracy": float(np.mean(prediction == y)),
        "tn": int(tn),
        "fp": int(fp),
        "fn": int(fn),
        "tp": int(tp),
        "toy_cost": int(fp + 5 * fn),
        "flagged": int(prediction.sum()),
    }


def train():
    out = ROOT / "artifacts"
    out.mkdir(exist_ok=True)
    data = generate()
    tr, va, te = split(data)
    model = RandomForestClassifier(
        n_estimators=220, max_depth=12, min_samples_leaf=12, random_state=42, n_jobs=2
    )
    model.fit(tr[FEATURES], tr.late)
    val_p = model.predict_proba(va[FEATURES])[:, 1]
    candidates = np.round(np.arange(0.05, 0.951, 0.01), 2)
    costs = [
        int(((val_p >= t) & (va.late == 0)).sum() + 5 * ((val_p < t) & (va.late == 1)).sum())
        for t in candidates
    ]
    threshold = float(candidates[int(np.argmin(costs))])
    p = model.predict_proba(te[FEATURES])[:, 1]
    dummy = DummyClassifier(strategy="prior").fit(tr[FEATURES], tr.late)
    logistic = make_pipeline(StandardScaler(), LogisticRegression(max_iter=1000, random_state=42))
    logistic.fit(tr[FEATURES], tr.late)
    lp = logistic.predict_proba(te[FEATURES])[:, 1]
    lvp = logistic.predict_proba(va[FEATURES])[:, 1]
    lt = float(
        min(
            candidates,
            key=lambda t: ((lvp >= t) & (va.late == 0)).sum() + 5 * ((lvp < t) & (va.late == 1)).sum(),
        )
    )
    importance = permutation_importance(
        model, va[FEATURES], va.late, scoring="roc_auc", n_repeats=5, random_state=42, n_jobs=2
    )
    checksum = hashlib.sha256(data.to_csv(index=False).encode()).hexdigest()
    joblib.dump(model, out / "model.joblib")
    artifact_sha = hashlib.sha256((out / "model.joblib").read_bytes()).hexdigest()
    bins = []
    for lo in np.arange(0, 1, 0.1):
        mask = (p >= lo) & (p < lo + 0.1 + (1e-9 if lo > 0.89 else 0))
        if mask.sum():
            bins.append(
                {
                    "predicted": float(p[mask].mean()),
                    "observed": float(te.late[mask].mean()),
                    "count": int(mask.sum()),
                }
            )
    rng = np.random.default_rng(42)
    aucs = []
    for _ in range(250):
        idx = rng.integers(0, len(te), len(te))
        if len(np.unique(te.late.to_numpy()[idx])) == 2:
            aucs.append(roc_auc_score(te.late.to_numpy()[idx], p[idx]))
    thresholds = [{"threshold": float(t), **evaluate(te.late, p, t)} for t in candidates]
    report = {
        "version": "1.0.0",
        "seed": 42,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "data_sha256": checksum,
        "model_sha256": artifact_sha,
        "python_version": platform.python_version(),
        "sklearn_version": sklearn.__version__,
        "rows": len(data),
        "train_rows": len(tr),
        "validation_rows": len(va),
        "test_rows": len(te),
        "split": "Chronological 60 / 20 / 20",
        "periods": {
            name: [part.issued_at.iloc[0], part.issued_at.iloc[-1]]
            for name, part in [("train", tr), ("validation", va), ("test", te)]
        },
        "threshold": threshold,
        "prevalence": float(te.late.mean()),
        "metrics": evaluate(te.late, p, threshold),
        "auc_interval": [float(x) for x in np.quantile(aucs, [0.025, 0.975])],
        "baselines": {
            "Prior dummy": {
                "threshold": 0.5,
                **evaluate(te.late, dummy.predict_proba(te[FEATURES])[:, 1], 0.5),
            },
            "Logistic regression": {"threshold": lt, **evaluate(te.late, lp, lt)},
        },
        "capacity_evaluation": {
            "validation": capacity_report(va, val_p, lvp),
            "test": capacity_report(te, p, lp),
        },
        "thresholds": thresholds,
        "calibration": bins,
        "feature_importance": sorted(
            [
                {
                    "feature": f,
                    "label": LABELS[f],
                    "mean": float(importance.importances_mean[i]),
                    "std": float(importance.importances_std[i]),
                }
                for i, f in enumerate(FEATURES)
            ],
            key=lambda x: x["mean"],
            reverse=True,
        ),
        "slices": [
            {"name": name, "rows": int(mask.sum()), **evaluate(te.late[mask], p[mask], threshold)}
            for name, mask in [
                ("Amount < €5k", te.amount < 5000),
                ("Amount ≥ €5k", te.amount >= 5000),
                ("Tenure < 12 months", te.customer_tenure < 12),
                ("Tenure ≥ 12 months", te.customer_tenure >= 12),
            ]
        ],
        "parameters": model.get_params(),
        "reference": {
            f: {
                "mean": float(tr[f].mean()),
                "std": float(tr[f].std()),
                "min": float(tr[f].min()),
                "max": float(tr[f].max()),
            }
            for f in FEATURES
        },
    }
    (out / "report.json").write_text(json.dumps(report, indent=2))
    print(
        json.dumps(
            {
                "threshold": threshold,
                "metrics": report["metrics"],
                "logistic": report["baselines"]["Logistic regression"],
            },
            indent=2,
        )
    )
    return report


if __name__ == "__main__":
    train()
