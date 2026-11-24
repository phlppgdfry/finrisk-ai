"""Deterministic multi-day replay, with point-in-time ledger features. No treatment effect simulated."""

from datetime import date, timedelta
import json
import joblib
import pandas as pd
from invoice_risk.data import ROOT, FEATURES
from invoice_risk.operations import Bill, Event, history, daily_queue


def generate_demo():
    bills, events, scores = [], [], {}
    model = joblib.load(ROOT / "artifacts/model.joblib")
    for i in range(40):
        customer = f"Customer {i + 1:02d}"
        if i % 9:
            for j in range(3):
                issued = date(2026, 1 + j, 1)
                due = issued + timedelta(days=30)
                b = Bill(f"H-{i}-{j}", customer, issued, due, 100000 + i * 1000)
                bills.append(b)
                paid = due + timedelta(days=7 if (i + j) % 3 == 0 else -2)
                events.append(Event(b.id, paid, paid, b.amount))
        issued = date(2026, 10, 22) + timedelta(days=i % 17)
        due = issued + timedelta(days=14)
        currency = "GBP" if i % 11 == 0 else "USD" if i % 7 == 0 else "EUR"
        b = Bill(
            f"OPS-{i + 1:03d}",
            customer,
            issued,
            due,
            10000 + (i * 17321) % 1500000,
            currency=currency,
            status_known=i % 17 != 0,
            disputed=i % 13 == 0,
        )
        bills.append(b)
        if i % 13 == 0:
            events.append(Event(b.id, due, due, b.amount, currency, "credit"))
        elif i % 5:
            partial = b.amount // 3 if i % 4 == 0 else 0
            if partial:
                events.append(
                    Event(b.id, due - timedelta(days=3), due - timedelta(days=3), partial, currency)
                )
            paid = due + timedelta(days=(i * 7) % 23 - 2)
            events.append(Event(b.id, paid, paid, b.amount - partial, currency))
        h = history(bills, events, customer, issued, b.id)
        # Only supported EUR issuance profiles go to the trained forest. Other currencies use manual review.
        if h["prior_invoices"] and currency == "EUR":
            record = dict(
                amount=b.amount / 100,
                payment_terms=14,
                customer_tenure=10,
                credit_utilisation=0.2 + (i % 7) * 0.1,
                **h,
            )
            scores[b.id] = float(model.predict_proba(pd.DataFrame([record], columns=FEATURES))[0, 1])
    replay = {}
    for strategy in ["risk", "amount", "history"]:
        reviews = {}
        days = []
        for offset in range(15):
            day = date(2026, 11, 10) + timedelta(days=offset)
            result = daily_queue(
                bills,
                events,
                day,
                reviews,
                scores=scores,
                strategy=strategy,
                fx={"EUR": (1.0, day), "GBP": (1.18, day)},
            )
            for row in result["selected"]:
                reviews[row["invoice_id"]] = day
            result["reviewed_so_far"] = len(reviews)
            days.append(result)
        replay[strategy] = days
    result = {
        "synthetic": True,
        "capacity": 10,
        "cooldown_days": 7,
        "manual_reserved_slots": 2,
        "fx_note": "Illustrative fixed GBP/EUR rate 1.18, no USD rate. Not market quotes.",
        "replay": replay,
        "limits": "Scores are fixed at issuance. Outcomes/events are predetermined and independent of review. No recovered cash or treatment benefit is attributed to reminders. Historical features use only settled history recorded strictly before issuance.",
    }
    target = ROOT / "frontend/public/data/operations.json"
    target.parent.mkdir(exist_ok=True, parents=True)
    target.write_text(json.dumps(result, indent=2))
    return result


if __name__ == "__main__":
    result = generate_demo()
    print("Exported 15 days × 3 policies of point-in-time ledger replay")
