"""Point-in-time ledger and daily human-review scheduling. Amounts in minor units."""

from dataclasses import dataclass
from datetime import date
import math


@dataclass(frozen=True)
class Bill:
    id: str
    customer: str
    issued: date
    due: date
    amount: int
    currency: str = "EUR"
    status_known: bool = True
    disputed: bool = False

    def __post_init__(self):
        if (
            type(self.amount) is not int
            or self.amount <= 0
            or self.due < self.issued
            or not self.id
            or not self.customer
        ):
            raise ValueError("Invalid invoice")


@dataclass(frozen=True)
class Event:
    invoice: str
    occurred: date
    recorded: date
    amount: int
    currency: str = "EUR"
    kind: str = "payment"

    def __post_init__(self):
        if (
            type(self.amount) is not int
            or self.amount <= 0
            or self.kind not in {"payment", "credit"}
            or self.recorded < self.occurred
        ):
            raise ValueError("Invalid ledger event")


def balance(bill, events, as_of):
    paid = credit = 0
    for e in events:
        if e.invoice != bill.id:
            continue
        if e.currency != bill.currency or e.occurred < bill.issued:
            raise ValueError("Invalid event currency/date")
        if e.occurred <= as_of and e.recorded <= as_of:
            if e.kind == "payment":
                paid += e.amount
            else:
                credit += e.amount
    if paid + credit > bill.amount:
        raise ValueError("Over-allocation requires reconciliation")
    return {"paid": paid, "credit": credit, "open": bill.amount - paid - credit}


def history(bills, events, customer, at, exclude=None):
    """Only cash-settled, uncredited invoices known strictly before the scoring date."""
    completed = []
    for b in bills:
        if b.customer != customer or b.id == exclude or b.issued >= at or not b.status_known or b.disputed:
            continue
        prior = [e for e in events if e.occurred < at and e.recorded < at]
        state = balance(b, prior, at)
        if state["open"] != 0 or state["credit"]:
            continue
        settlement = max(e.occurred for e in prior if e.invoice == b.id)
        completed.append(max(0, (settlement - b.due).days))
    late = [days for days in completed if days > 0]
    return {
        "prior_invoices": len(completed),
        "prior_late_rate": len(late) / len(completed) if completed else None,
        "avg_days_late": sum(late) / len(late) if late else 0,
    }


def daily_queue(
    bills, events, as_of, last_reviews, capacity=10, cooldown_days=7, scores=None, strategy="risk", fx=None
):
    if capacity < 1 or cooldown_days < 1 or strategy not in {"risk", "amount", "history"}:
        raise ValueError("Invalid policy")
    if len({b.id for b in bills}) != len(bills):
        raise ValueError("Duplicate invoice IDs")
    scores = scores or {}
    fx = fx or {"EUR": (1.0, as_of)}
    customer_review = {}
    for bill in bills:
        if bill.id in last_reviews:
            customer_review[bill.customer] = max(
                customer_review.get(bill.customer, date.min), last_reviews[bill.id]
            )
    eligible, exclusions = [], []
    for b in bills:
        if b.issued > as_of:
            continue
        reason = None
        state = balance(b, events, as_of)
        rate = fx.get(b.currency)
        if not b.status_known:
            reason = "unknown_payment_status"
        elif b.disputed:
            reason = "disputed_manual_resolution"
        elif not state["open"]:
            reason = "settled_or_credited"
        elif b.due >= as_of:
            reason = "not_overdue"
        elif not rate or rate[1] > as_of or not math.isfinite(rate[0]) or rate[0] <= 0:
            reason = "missing_valid_fx"
        elif b.customer in customer_review and (as_of - customer_review[b.customer]).days < cooldown_days:
            reason = "cooldown"
        if reason:
            exclusions.append({"invoice_id": b.id, "reason": reason})
            continue
        h = history(bills, events, b.customer, b.issued, b.id)
        score = scores.get(b.id)
        if score is not None and (not math.isfinite(score) or not 0 <= score <= 1):
            raise ValueError("Invalid model score")
        manual = h["prior_invoices"] == 0 or score is None
        eligible.append(
            {
                "invoice_id": b.id,
                "customer": b.customer,
                "currency": b.currency,
                "open_minor": state["open"],
                "base_minor": state["open"] * rate[0],
                "days_overdue": (as_of - b.due).days,
                "score": None if manual else score,
                "lane": "manual_new_or_unsupported" if manual else "model",
                "historical_rate": h["prior_late_rate"],
            }
        )
    manual = sorted(
        [r for r in eligible if r["lane"] != "model"],
        key=lambda r: (-r["days_overdue"], -r["base_minor"], r["invoice_id"]),
    )
    known = [r for r in eligible if r["lane"] == "model"]
    key = "score" if strategy == "risk" else "base_minor" if strategy == "amount" else "historical_rate"
    known.sort(key=lambda r: (-r[key], r["invoice_id"]))
    # Reserve at most two human-review slots; no invented probability for cold-start cases.
    selected = manual[: min(2, capacity)]
    selected = [
        r for i, r in enumerate(selected) if r["customer"] not in {x["customer"] for x in selected[:i]}
    ]
    customers = {r["customer"] for r in selected}
    for row in known + manual[min(2, capacity) :]:
        if len(selected) >= capacity:
            break
        if row["customer"] not in customers:
            selected.append(row)
            customers.add(row["customer"])
    return {
        "as_of": str(as_of),
        "capacity": capacity,
        "selected": selected,
        "eligible": len(eligible),
        "excluded": exclusions,
        "strategy": strategy,
    }
