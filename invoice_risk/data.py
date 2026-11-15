"""Deterministic synthetic data. Every feature is defined at invoice issuance."""

from pathlib import Path
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
FEATURES = [
    "amount",
    "payment_terms",
    "customer_tenure",
    "prior_invoices",
    "prior_late_rate",
    "avg_days_late",
    "credit_utilisation",
]
LABELS = {
    "amount": "Invoice amount (€)",
    "payment_terms": "Payment terms (days)",
    "customer_tenure": "Customer tenure (months)",
    "prior_invoices": "Prior invoices",
    "prior_late_rate": "Historical late rate",
    "avg_days_late": "Historical days late",
    "credit_utilisation": "Credit utilisation",
}


def generate(n=7200, seed=42):
    rng = np.random.default_rng(seed)
    prior = rng.integers(1, 120, n)
    late_count = rng.binomial(prior, rng.beta(1.5, 4.5, n))
    frame = pd.DataFrame(
        {
            "amount": np.clip(rng.lognormal(8, 1.05, n), 100, 50000).round(2),
            "payment_terms": rng.choice([14, 30, 45, 60, 90], n, p=[0.1, 0.45, 0.15, 0.25, 0.05]),
            "customer_tenure": rng.integers(1, 181, n),
            "prior_invoices": prior,
            "prior_late_rate": (late_count / prior).round(4),
            "avg_days_late": np.clip(rng.gamma(1.7, 5, n) + late_count / prior * 16, 0, 90).round(1),
            "credit_utilisation": rng.beta(2, 2, n).round(4),
        }
    )
    frame.loc[frame.prior_late_rate == 0, "avg_days_late"] = 0
    # This intentionally imperfect generative rule is NOT used for inference.
    logit = (
        -3.9
        + 4.1 * frame.prior_late_rate
        + 0.075 * frame.avg_days_late
        + 2 * frame.credit_utilisation
        + 0.000018 * frame.amount
        + 0.010 * (frame.payment_terms - 30)
        - 0.004 * frame.customer_tenure
        + 1.0 * ((frame.credit_utilisation > 0.75) & (frame.prior_late_rate > 0.3))
    )
    frame["late"] = rng.binomial(1, 1 / (1 + np.exp(-logit)))
    frame["issued_at"] = pd.date_range("2023-01-01", "2025-12-31", periods=n).date.astype(str)
    frame["invoice_id"] = [f"HIST-{seed}-{i:05d}" for i in range(n)]
    return frame


def split(frame):
    """Chronological 60/20/20; validation selects policy, test stays untouched."""
    ordered = frame.sort_values(["issued_at", "invoice_id"]).reset_index(drop=True)
    a, b = int(len(ordered) * 0.6), int(len(ordered) * 0.8)
    return ordered.iloc[:a], ordered.iloc[a:b], ordered.iloc[b:]
