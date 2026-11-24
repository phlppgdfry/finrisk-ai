"""Evaluate a frozen model locally on authorised invoice records. Never uploads data.
Example: python -m scripts.validate_real private.csv --ledger private-ledger.json --as-of 2026-01-01
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
    required = FEATURES + [
        "invoice_id",
        "customer_id",
        "issued_at",
        "features_as_of",
        "due_at",
        "paid_at",
        "payment_status",
        "currency",
        "paid_amount",
        "credit_amount",
        "disputed",
    ]
    missing = set(required) - set(frame.columns)
    if missing:
        raise ValueError("Missing columns: " + ", ".join(sorted(missing)))
    if frame.empty or frame.invoice_id.isna().any() or frame.invoice_id.duplicated().any():
        raise ValueError("Require non-empty data with unique invoice IDs")
    if frame.customer_id.isna().any() or frame.customer_id.astype(str).str.strip().eq("").any():
        raise ValueError("Explicit customer IDs required")
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
    if not frame.currency.eq("EUR").all():
        raise ValueError("Frozen model accepts EUR only; route other currencies to manual review")
    if (
        frame.payment_status.isna().any()
        or not frame.payment_status.isin(["paid", "unpaid", "partial"]).all()
    ):
        raise ValueError("Unknown payment status requires reconciliation, not a late label")
    if frame.disputed.isna().any() or not frame.disputed.isin([False, True, 0, 1]).all():
        raise ValueError("Explicit dispute flag required")
    if frame.disputed.astype(bool).any() or (frame.credit_amount != 0).any():
        raise ValueError("Disputes/credits require separate resolution before model evaluation")
    paid = pd.to_numeric(frame.paid_amount, errors="raise")
    if paid.isna().any() or ((paid < 0) | (paid > frame.amount)).any():
        raise ValueError("Invalid paid amount")
    full = frame.payment_status.eq("paid")
    partial = frame.payment_status.eq("partial")
    if (
        (full & ((paid != frame.amount) | frame.paid_at.isna()))
        | (~full & frame.paid_at.notna())
        | (partial & ((paid <= 0) | (paid >= frame.amount)))
        | (frame.payment_status.eq("unpaid") & paid.ne(0))
    ).any():
        raise ValueError("Inconsistent settlement status/amount/date")
    if (frame.paid_at > cutoff).any():
        raise ValueError("Settlement after evaluation cutoff")
    if (frame.prior_invoices == 0).any():
        raise ValueError("Cold-start customers require the manual lane, no forest probability")
    for row in frame[FEATURES].to_dict(orient="records"):
        Invoice(**row)
    frame["late"] = (frame.paid_at.isna() | (frame.paid_at > frame.due_at)).astype(int)
    if frame.late.nunique() != 2:
        raise ValueError("Evaluation needs both on-time and late outcomes")
    return frame


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("csv", type=Path)
    p.add_argument("--ledger", type=Path, required=True, help="Point-in-time invoice/payment event JSON")
    for flag in ["as-of", "source", "rights", "output"]:
        p.add_argument("--" + flag, required=True)
    args = p.parse_args()
    if not args.source.strip() or not args.rights.strip():
        p.error("Source and rights references cannot be blank")
    frame = prepare(pd.read_csv(args.csv), args.as_of)
    from datetime import date
    from invoice_risk.operations import Bill, Event, history

    ledger = json.loads(args.ledger.read_text())
    bills = [
        Bill(**{**b, "issued": date.fromisoformat(b["issued"]), "due": date.fromisoformat(b["due"])})
        for b in ledger["bills"]
    ]
    events = [
        Event(
            **{
                **e,
                "occurred": date.fromisoformat(e["occurred"]),
                "recorded": date.fromisoformat(e["recorded"]),
            }
        )
        for e in ledger["events"]
    ]
    if len({b.id for b in bills}) != len(bills):
        raise ValueError("Duplicate ledger invoice IDs")
    if any(e.invoice not in {b.id for b in bills} for e in events):
        raise ValueError("Ledger event refers to unknown invoice")
    for row in frame.to_dict(orient="records"):
        reconstructed = history(
            bills, events, str(row["customer_id"]), row["issued_at"].date(), str(row["invoice_id"])
        )
        if not reconstructed["prior_invoices"]:
            raise ValueError("No eligible settled history: manual review required")
        for feature in ["prior_invoices", "prior_late_rate", "avg_days_late"]:
            if abs(row[feature] - reconstructed[feature]) > 0.0001:
                raise ValueError("Historical feature mismatch: " + feature)
    report = json.loads((ROOT / "artifacts/report.json").read_text())
    model_path = ROOT / "artifacts/model.joblib"
    if hashlib.sha256(model_path.read_bytes()).hexdigest() != report["model_sha256"]:
        raise ValueError("Artifact mismatch; restore the verified model release")
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
        "ledger_sha256": hashlib.sha256(args.ledger.read_bytes()).hexdigest(),
        "model_sha256": report["model_sha256"],
        "metrics": evaluate(frame.late, scores, report["threshold"]),
        "capacity": {
            name: ranking_metrics(frame.late, s, frame.amount, min(10, len(frame)))
            for name, s in strategies.items()
        },
        "limits": "User-declared provenance is not independently verified. Three historical features were reconstructed from the supplied dated ledger. Source completeness, recorded dates and remaining feature provenance require human audit. Frozen synthetic-trained model; no tuning or economic benefit claim.",
    }
    if Path(args.output).resolve() in {args.csv.resolve(), args.ledger.resolve()}:
        raise ValueError("Output must not overwrite source data")
    Path(args.output).write_text(json.dumps(result, indent=2))
    print(f"Evaluated {len(frame)} records locally; aggregate report written to {args.output}")


if __name__ == "__main__":
    main()
