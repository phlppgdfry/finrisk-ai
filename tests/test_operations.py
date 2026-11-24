from datetime import date, timedelta
import pytest
from invoice_risk.operations import Bill, Event, balance, history, daily_queue
from invoice_risk.pilot import arm_for, summarize
from scripts.validate_real import prepare
from test_decisions import records

D = date(2026, 1, 1)


def test_point_in_time_excludes_future_and_late_recorded_events():
    b = Bill("h", "c", D, D + timedelta(days=2), 100)
    e = Event("h", D + timedelta(days=3), D + timedelta(days=9), 100)
    assert history([b], [e], "c", D + timedelta(days=5))["prior_invoices"] == 0
    assert history([b], [e], "c", D + timedelta(days=10))["prior_invoices"] == 1


def test_partial_credit_and_currency():
    b = Bill("i", "c", D, D, 100)
    e = [Event("i", D, D, 30), Event("i", D, D, 20, kind="credit")]
    assert balance(b, e, D) == {"paid": 30, "credit": 20, "open": 50}
    with pytest.raises(ValueError):
        balance(b, [Event("i", D, D, 30, "GBP")], D)
    with pytest.raises(ValueError):
        balance(b, [Event("i", D, D, 101)], D)


def test_queue_capacity_customer_cooldown_and_no_future():
    bills = [Bill(str(i), str(i), D, D, 100) for i in range(20)]
    q = daily_queue(bills, [], D + timedelta(days=1), {}, capacity=10)
    assert len(q["selected"]) == 10
    assert all(r["score"] is None for r in q["selected"])
    reviews = {r["invoice_id"]: D + timedelta(days=1) for r in q["selected"]}
    nextday = daily_queue(bills, [], D + timedelta(days=2), reviews)
    assert not {r["invoice_id"] for r in q["selected"]} & {r["invoice_id"] for r in nextday["selected"]}
    same = Bill("another", "0", D, D, 200)
    q = daily_queue(bills + [same], [], D + timedelta(days=2), {"0": D + timedelta(days=1)})
    assert "0" not in {r["customer"] for r in q["selected"]}


def test_unknown_disputed_and_missing_fx_are_not_auto_selected():
    bills = [
        Bill("a", "a", D, D, 100, status_known=False),
        Bill("b", "b", D, D, 100, disputed=True),
        Bill("c", "c", D, D, 100, "USD"),
    ]
    q = daily_queue(bills, [], D + timedelta(days=1), {})
    assert not q["selected"] and len(q["excluded"]) == 3


def test_status_validation_unknown_is_not_unpaid():
    f = records()
    f.loc[0, "payment_status"] = "unknown"
    f.loc[0, "paid_at"] = None
    with pytest.raises(ValueError, match="Unknown"):
        prepare(f, "2025-03-01")
    f = records()
    f.loc[0, "paid_at"] = None
    with pytest.raises(ValueError, match="Inconsistent"):
        prepare(f, "2025-03-01")
    f = records()
    f.loc[0, "payment_status"] = "partial"
    f.loc[0, "paid_at"] = None
    f.loc[0, "paid_amount"] = 200
    # Both-class requirement is separate from correct partial-payment labeling.
    f.loc[1, "paid_at"] = "2025-01-20"
    assert prepare(f, "2025-03-01").late.tolist() == [1, 0]


def test_pilot_assignment_window_and_outcome_checks():
    customers = [str(i) for i in range(20)]
    rows = [
        dict(
            customer_id=c,
            currency="EUR",
            arm=arm_for(c, "fixed"),
            enrolled_at="2026-01-01",
            observed_until="2026-01-15",
            opening_minor=100,
            received_minor=50,
            minutes=5,
        )
        for c in customers
    ]
    r = summarize(rows, "fixed")
    assert r["receipt_difference_pp"] == 0
    rows[0]["observed_until"] = "2026-01-02"
    with pytest.raises(ValueError, match="Incomplete"):
        summarize(rows, "fixed")


def test_local_evaluation_reconstructs_history_before_scoring(tmp_path, monkeypatch):
    import json
    import sys
    from scripts import validate_real

    frame = records()
    frame["prior_invoices"] = 1
    frame["prior_late_rate"] = 1.0
    frame["avg_days_late"] = 2.0
    source = tmp_path / "input.csv"
    frame.to_csv(source, index=False)
    ledger = tmp_path / "ledger.json"
    ledger.write_text(
        json.dumps(
            {
                "bills": [
                    {
                        "id": "prior",
                        "customer": "C1",
                        "issued": "2024-10-01",
                        "due": "2024-10-31",
                        "amount": 10000,
                    }
                ],
                "events": [
                    {"invoice": "prior", "occurred": "2024-11-02", "recorded": "2024-11-03", "amount": 10000}
                ],
            }
        )
    )
    output = tmp_path / "aggregate.json"
    monkeypatch.setattr(
        sys,
        "argv",
        [
            "validate_real",
            str(source),
            "--ledger",
            str(ledger),
            "--as-of",
            "2025-03-01",
            "--source",
            "synthetic test fixture",
            "--rights",
            "generated locally",
            "--output",
            str(output),
        ],
    )
    validate_real.main()
    aggregate = json.loads(output.read_text())
    assert aggregate["rows"] == 2 and "customer_id" not in aggregate
    frame["prior_invoices"] = 2  # plausible schema, but contradicts event history
    frame.to_csv(source, index=False)
    with pytest.raises(ValueError, match="Historical feature mismatch"):
        validate_real.main()
