"""Separate date-only benchmark on licensed, paid public-procurement records.
Never evaluates or replaces the seven-feature synthetic FinRisk model.
"""

from collections import defaultdict
import hashlib
import heapq
import json
import numpy as np
import pandas as pd
import sklearn
from pathlib import Path
from sklearn.metrics import roc_auc_score
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from invoice_risk.data import ROOT
from invoice_risk.train import evaluate
from invoice_risk.decisions import ranking_metrics

SNAPSHOT = ROOT / "benchmarks/secop/snapshot-2026-11-24"
FEATURES = ["term_days", "month", "weekday", "settled_history", "prior_late_rate", "prior_mean_delay"]


def prepare(raw):
    frame = raw.copy()
    counts = {"downloaded": len(frame)}
    duplicate = frame.record_id.duplicated(keep=False)
    counts["duplicate_ids_removed"] = int(duplicate.sum())
    frame = frame.loc[~duplicate].copy()  # conflicting snapshots never pick an arbitrary winner
    for c in ["issued_at", "due_at", "paid_at"]:
        frame[c] = pd.to_datetime(frame[c], errors="coerce").dt.normalize()
    valid = (
        frame.payment_state.eq("Pagado")
        & frame.payer_id.notna()
        & frame.payer_id.ne("")
        & frame.issued_at.between("2023-01-01", "2023-12-31")
        & (frame.due_at >= frame.issued_at)
        & (frame.paid_at >= frame.issued_at)
        & (frame.paid_at < pd.Timestamp("2024-04-01"))
        & ((frame.due_at - frame.issued_at).dt.days <= 180)
    )
    counts["invalid_or_outside_window_removed"] = int((~valid).sum())
    frame = frame.loc[valid].sort_values(["issued_at", "record_id"]).copy()
    frame["late"] = (frame.paid_at > frame.due_at).astype(int)
    frame["delay"] = (frame.paid_at - frame.due_at).dt.days
    frame["term_days"] = (frame.due_at - frame.issued_at).dt.days
    frame["month"] = frame.issued_at.dt.month
    frame["weekday"] = frame.issued_at.dt.weekday
    # Sweep settlement events; strictly earlier days only. No same-day or future outcome.
    events = sorted(
        (r.paid_at, i, r.payer_id, r.late, max(0, r.delay)) for i, r in enumerate(frame.itertuples())
    )
    heapq.heapify(events)
    totals = defaultdict(lambda: [0, 0, 0])
    history = []
    for row in frame.itertuples():
        while events and events[0][0] < row.issued_at:
            _, _, payer, late, delay = heapq.heappop(events)
            total = totals[payer]
            total[0] += 1
            total[1] += late
            total[2] += delay
        n, late, delay = totals[row.payer_id]
        history.append((n, late / n if n else 0.0, delay / n if n else 0.0))
    frame[["settled_history", "prior_late_rate", "prior_mean_delay"]] = history
    counts["accepted"] = len(frame)
    return frame, counts


def benchmark(snapshot=SNAPSHOT):
    manifest = json.loads((snapshot / "source.json").read_text())
    if hashlib.sha256((snapshot / "records.csv").read_bytes()).hexdigest() != manifest["sha256"]:
        raise ValueError("Public snapshot checksum mismatch")
    data, counts = prepare(pd.read_csv(snapshot / "records.csv"))
    train_cut = pd.Timestamp("2023-09-01")
    test_cut = pd.Timestamp("2023-11-01")
    train = data.loc[(data.issued_at < train_cut) & (data.paid_at < train_cut)]
    validation = data.loc[
        (data.issued_at >= train_cut) & (data.issued_at < test_cut) & (data.paid_at < test_cut)
    ]
    test = data.loc[data.issued_at >= test_cut]
    if any(len(f) < 30 or f.late.nunique() < 2 for f in [train, validation, test]):
        raise ValueError("Insufficient two-class temporal partitions")
    models = {
        "Random Forest (public-data candidate)": RandomForestClassifier(
            n_estimators=220, max_depth=6, min_samples_leaf=20, random_state=42, n_jobs=2
        ),
        "Logistic regression": make_pipeline(
            StandardScaler(), LogisticRegression(max_iter=1000, random_state=42)
        ),
        "Prior-only baseline": DummyClassifier(strategy="prior"),
    }
    results = {}
    prevalence = float(train.late.mean())
    for name, model in models.items():
        model.fit(train[FEATURES], train.late)
        results[name] = {
            "validation": evaluate(validation.late, model.predict_proba(validation[FEATURES])[:, 1], 0.5),
            "test": evaluate(test.late, model.predict_proba(test[FEATURES])[:, 1], 0.5),
        }
    scores = {name: model.predict_proba(test[FEATURES])[:, 1] for name, model in models.items()}
    scores["Historical late-rate rule"] = np.where(test.settled_history > 0, test.prior_late_rate, prevalence)
    scores["Shorter payment-term rule"] = 1 - test.term_days.to_numpy() / 180
    rule_auc = {
        name: float(roc_auc_score(test.late, score)) for name, score in scores.items() if name not in models
    }
    counts["outcomes_unavailable_at_train_or_validation_cutoff"] = (
        len(data) - len(train) - len(validation) - len(test)
    )
    k = min(10, len(test))
    capacity = {
        name: ranking_metrics(test.late, values, np.zeros(len(test)), k) for name, values in scores.items()
    }
    # Monetary fields intentionally absent: no actual amount or currency interpretation was verified.
    for row in capacity.values():
        row.pop("late_amount_selected", None)
        row.pop("selected_amount", None)
        row.pop("precision_interval", None)
    result = {
        "status": "separate_public_benchmark_not_finrisk_external_validation",
        "experiment_id": "secop-2023-v1",
        "pipeline_sha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        "sklearn_version": sklearn.__version__,
        "source": {
            key: manifest[key]
            for key in ["source", "publisher", "source_url", "licence", "retrieved_at", "sha256", "selection"]
        },
        "data_quality": counts,
        "features": FEATURES,
        "target": "Payment recorded on a later calendar day than the payment due date, among sampled paid records only.",
        "splits": {
            name: {
                "rows": len(f),
                "late": int(f.late.sum()),
                "payer_count": int(f.payer_id.nunique()),
                "cold_start": int(f.settled_history.eq(0).sum()),
                "issued_from": str(f.issued_at.min().date()),
                "issued_to": str(f.issued_at.max().date()),
            }
            for name, f in [("train", train), ("validation", validation), ("test", test)]
        },
        "protocol": "Fixed Jan-Aug training, Sep-Oct validation, Nov-Dec test (2023). Training settlements known before September; validation settlements before November. Final outcomes before April 2024. Fixed 0.5 threshold; no search/tuning or refitting on test. No entity identifiers as features.",
        "models": results,
        "capacity": capacity,
        "rule_auc": rule_auc,
        "limits": [
            "This is a different model and domain: public procurement payments in Colombia, not Belgian corporate receivables or the frozen EUR forest.",
            "Only records marked Pagado with due/payment dates are sampled. Unpaid, partial, disputed and cancelled cases are not represented; results cannot be generalised to all invoices.",
            "The source is an administrative snapshot. Actual settlement dates filter historical features, but recording/availability timestamps and retrospective corrections are not available; no fully audited point-in-time provenance claim.",
            "Paid-only, capped monthly convenience sample; row-level metrics and top-10 pool comparison are not an operational pilot or a representative late-payment rate.",
            "Payment schedule due dates are used as published; a finance owner has not confirmed that they are contractual invoice deadlines. Dates normalised to calendar days; same-day timestamps ignored.",
            "No amount/currency features, cash-recovery estimates, reminder effect, causal benefit, participant or finance reviewer is claimed. Scores are uncalibrated and no payer-cluster confidence intervals are supplied.",
        ],
    }
    out = ROOT / "benchmarks/secop/report.json"
    out.write_text(json.dumps(result, indent=2))
    print(
        json.dumps(
            {
                "quality": counts,
                "splits": result["splits"],
                "test_auc": {name: m["test"]["roc_auc"] for name, m in results.items()},
            },
            indent=2,
        )
    )
    return result


if __name__ == "__main__":
    benchmark()
