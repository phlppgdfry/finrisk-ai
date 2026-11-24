import pandas as pd
import pytest
from invoice_risk.decisions import ranking_metrics
from scripts.validate_real import prepare


def test_capacity_counts_and_stable_ties():
    r = ranking_metrics([1, 0, 1, 0], [0.9, 0.8, 0.8, 0.1], [100, 200, 300, 400], 2)
    assert r["late_found"] == 1 and r["false_alarms"] == 1
    assert r["precision"] == 0.5 and r["recall"] == 0.5
    assert r["late_amount_selected"] == 100
    assert r["precision_interval"][0] < 0.5 < r["precision_interval"][1]


def test_capacity_invalid():
    with pytest.raises(ValueError):
        ranking_metrics([1], [0.5], [100], 2)


def records():
    return pd.DataFrame(
        [
            dict(
                invoice_id=str(i),
                customer_id="C1",
                payment_status="paid",
                currency="EUR",
                paid_amount=4500,
                credit_amount=0,
                disputed=False,
                issued_at="2025-01-01",
                features_as_of="2025-01-01",
                due_at="2025-01-31",
                paid_at=paid,
                amount=4500,
                payment_terms=30,
                customer_tenure=24,
                prior_invoices=30,
                prior_late_rate=0.3,
                avg_days_late=12,
                credit_utilisation=0.7,
            )
            for i, paid in enumerate(["2025-01-20", "2025-02-05"])
        ]
    )


def test_real_gate_derives_labels():
    assert prepare(records(), "2025-03-01").late.tolist() == [0, 1]


def test_real_gate_rejects_future_features_and_unmatured_labels():
    f = records()
    f.loc[0, "features_as_of"] = "2025-01-02"
    with pytest.raises(ValueError, match="Future features"):
        prepare(f, "2025-03-01")
    with pytest.raises(ValueError, match="Unmatured"):
        prepare(records(), "2025-01-20")


def test_real_gate_rejects_duplicates():
    f = records()
    f.loc[1, "invoice_id"] = "0"
    with pytest.raises(ValueError, match="unique"):
        prepare(f, "2025-03-01")
