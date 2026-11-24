"""Customer-level allocation and descriptive pilot reporting, not proof of causal effect."""

import hashlib
import math
from datetime import datetime, timedelta


def arm_for(customer, seed):
    return "review" if hashlib.sha256(f"{seed}:{customer}".encode()).digest()[0] < 128 else "control"


def summarize(rows, seed, horizon=14):
    if not rows or horizon < 1 or len({r["customer_id"] for r in rows}) != len(rows):
        raise ValueError("Require unique customers and a positive horizon")
    currencies = {r.get("currency") for r in rows}
    if len(currencies) != 1 or not all(
        isinstance(c, str) and len(c) == 3 and c.isupper() for c in currencies
    ):
        raise ValueError("One explicit currency required for both arms")
    groups = {"review": [], "control": []}
    for row in rows:
        enrolled = datetime.fromisoformat(row["enrolled_at"])
        if datetime.fromisoformat(row["observed_until"]) != enrolled + timedelta(days=horizon):
            raise ValueError("Incomplete or unequal observation window")
        if row["arm"] != arm_for(row["customer_id"], seed):
            raise ValueError("Allocation mismatch")
        for key in ["opening_minor", "received_minor", "minutes"]:
            if not math.isfinite(row[key]) or row[key] < 0:
                raise ValueError("Invalid outcome amount/time")
        if any(type(row[k]) is not int for k in ["opening_minor", "received_minor"]):
            raise ValueError("Amounts must use integer minor units")
        if row["opening_minor"] <= 0 or row["received_minor"] > row["opening_minor"]:
            raise ValueError("Invalid receipt denominator")
        groups[row["arm"]].append(row)
    if not all(groups.values()):
        raise ValueError("Both arms must be represented")
    totals = {}
    for arm, records in groups.items():
        opening = sum(r["opening_minor"] for r in records)
        receipts = sum(r["received_minor"] for r in records)
        totals[arm] = {
            "customers": len(records),
            "receipt_fraction": receipts / opening,
            "minutes_per_customer": sum(r["minutes"] for r in records) / len(records),
        }
    return {
        "currency": next(iter(currencies)),
        "horizon_days": horizon,
        "arms": totals,
        "receipt_difference_pp": 100
        * (totals["review"]["receipt_fraction"] - totals["control"]["receipt_fraction"]),
        "limits": "Descriptive intention-to-treat comparison. Allocation checks cannot prove adherence, random recruitment, uncontaminated arms or a causal benefit. One currency, identical measurement windows, and all enrolled customers required; do not remove non-compliers.",
    }
