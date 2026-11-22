"""Evaluate a frozen model locally on authorised invoice records. Never uploads data.
Example: python -m scripts.validate_real private.csv --as-of 2026-01-01
 --source 'internal export' --rights 'permission reference' --output /private/tmp/audit.json
"""

import argparse
import hashlib
import json
from pathlib import Path
import joblib
import pandas as pd
from invoice_risk.api import Invoice
from invoice_risk.data import ROOT, FEATURES
from invoice_risk.decisions import ranking_metrics
from invoice_risk.train import evaluate


def prepare(frame, as_of):
    required = FEATURES + ["invoice_id", "issued_at", "features_as_of", "due_at", "paid_at"]
    missing = set(required) - set(frame.columns)
    if missing:
        raise ValueError("Missing columns: " + ", ".join(sorted(missing)))
    if frame.empty or frame.invoice_id.isna().any() or frame.invoice_id.duplicated().any():
        raise ValueError("Require non-empty data with unique invoice IDs")
    frame = frame.copy()
    for c in ["issued_at", "features_as_of", "due_at"]:
        frame[c] = pd.to_datetime(frame[c], errors="raise", utc=True)
        if frame[c].isna().any():
            raise ValueError("Missing timestamp: " + c)
    frame["paid_at"] = pd.to_datetime(frame.paid_at, errors="raise", utc=True)
    cutoff = pd.Timestamp(as_of)
    cutoff = cutoff.tz_localize("UTC") if cutoff.tzinfo is None else cutoff.tz_convert("UTC")
    if (frame.features_as_of > frame.issued_at).any():
        raise ValueError("Future features: features_as_of must not exceed issued_at")
    if (frame.due_at < frame.issued_at).any() or (frame.paid_at < frame.issued_at).any():
        raise ValueError("Invalid invoice chronology")
    if (frame.due_at >= cutoff).any():
        raise ValueError("Unmatured labels: every due_at must be before as_of")
    for row in frame[FEATURES].to_dict(orient="records"):
        Invoice(**row)
    frame["late"] = (frame.paid_at.isna() | (frame.paid_at > frame.due_at)).astype(int)
    if frame.late.nunique() != 2:
        raise ValueError("Evaluation needs both on-time and late outcomes")
    return frame


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("csv", type=Path)
    for flag in ["as-of", "source", "rights", "output"]:
        p.add_argument("--" + flag, required=True)
    args = p.parse_args()
    if not args.source.strip() or not args.rights.strip():
        p.error("Source and rights references cannot be blank")
    frame = prepare(pd.read_csv(args.csv), args.as_of)
    report = json.loads((ROOT / "artifacts/report.json").read_text())
    model_path = ROOT / "artifacts/model.joblib"
    if hashlib.sha256(model_path.read_bytes()).hexdigest() != report["model_sha256"]:
        raise ValueError("Artifact mismatch; retrain locally")
    model = joblib.load(model_path)
    scores = model.predict_proba(frame[FEATURES])[:, 1]
    strategies = {
        "Frozen forest": scores,
        "Highest amount": frame.amount,
        "Historical late rate": frame.prior_late_rate,
    }
    result = {
        "source": args.source,
        "rights_reference": args.rights,
        "as_of": args.as_of,
        "rows": len(frame),
        "data_sha256": hashlib.sha256(args.csv.read_bytes()).hexdigest(),
        "model_sha256": report["model_sha256"],
        "metrics": evaluate(frame.late, scores, report["threshold"]),
        "capacity": {
            name: ranking_metrics(frame.late, s, frame.amount, min(10, len(frame)))
            for name, s in strategies.items()
        },
        "limits": "User-declared provenance is not independently verified. Timestamp checks cannot prove point-in-time feature construction. Frozen synthetic-trained model; no tuning or economic benefit claim.",
    }
    Path(args.output).write_text(json.dumps(result, indent=2))
    print(f"Evaluated {len(frame)} records locally; aggregate report written to {args.output}")


if __name__ == "__main__":
    main()
