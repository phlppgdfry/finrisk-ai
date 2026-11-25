"""Local cohort registration and complete-cohort pilot reporting. No network calls."""

import csv
from datetime import datetime, timedelta, timezone
import hashlib
import json
import re
from invoice_risk.pilot import arm_for, summarize
from invoice_risk.data import ROOT


def register(cohort, folder, *, owner, rights, source, seed, start, now=None):
    resolved = folder.resolve()
    if resolved.is_relative_to(ROOT) and not resolved.is_relative_to(ROOT / "data/private"):
        raise ValueError(
            "Keep participant workspaces outside the public repository or in ignored data/private"
        )
    if folder.exists():
        raise ValueError("Workspace already exists; never overwrite a registered cohort")
    if not all(x.strip() for x in [owner, rights, source, seed]):
        raise ValueError("Owner, rights, source and predeclared seed required")
    begun = datetime.fromisoformat(start)
    if begun.tzinfo is None:
        raise ValueError("Use a timezone-aware enrollment time")
    if begun < (now or datetime.now(timezone.utc)):
        raise ValueError("Register before the action period; no retrospective pilot allocation")
    with cohort.open(newline="") as file:
        reader = csv.DictReader(file)
        if set(reader.fieldnames or []) != {"customer_id", "currency", "opening_minor"}:
            raise ValueError("Cohort needs exactly customer_id,currency,opening_minor")
        rows = list(reader)
    if len(rows) < 2 or len({r["customer_id"] for r in rows}) != len(rows):
        raise ValueError("Require unique customers and at least two participants")
    currencies = {r["currency"] for r in rows}
    if len(currencies) != 1 or not re.fullmatch(r"[A-Z]{3}", next(iter(currencies))):
        raise ValueError("One explicit currency required")
    members = []
    for row in rows:
        if (
            not row["customer_id"].strip()
            or not row["opening_minor"].isdigit()
            or int(row["opening_minor"]) <= 0
        ):
            raise ValueError("Explicit customer ID and positive integer minor amount required")
        members.append(
            {
                **row,
                "opening_minor": int(row["opening_minor"]),
                "arm": arm_for(row["customer_id"], seed),
                "enrolled_at": begun.isoformat(),
                "observed_until": (begun + timedelta(days=14)).isoformat(),
            }
        )
    if len({r["arm"] for r in members}) != 2:
        raise ValueError("Both arms needed; do not seed-shop after observing outcomes")
    protocol = {
        "status": "registered_not_completed",
        "owner": owner,
        "rights_reference": rights,
        "source": source,
        "seed": seed,
        "horizon_days": 14,
        "registered_at": datetime.now(timezone.utc).isoformat(),
        "cohort_sha256": hashlib.sha256(cohort.read_bytes()).hexdigest(),
        "members": members,
        "limits": "Registration records declarations, not verified permission or experimental adherence. Include all enrolled customers and only opening-invoice receipts. No pilot benefit established.",
    }
    payload = json.dumps(protocol, indent=2).encode()
    folder.mkdir(parents=True)
    (folder / "protocol.json").write_bytes(payload)
    (folder / "protocol.sha256").write_text(hashlib.sha256(payload).hexdigest())
    with (folder / "outcomes.csv").open("w", newline="") as file:
        writer = csv.DictWriter(
            file, fieldnames=["customer_id", "received_minor", "minutes", "observation_complete"]
        )
        writer.writeheader()
        writer.writerows({"customer_id": r["customer_id"]} for r in members)
    return protocol


def report(folder, now=None):
    raw = (folder / "protocol.json").read_bytes()
    if hashlib.sha256(raw).hexdigest() != (folder / "protocol.sha256").read_text().strip():
        raise ValueError("Protocol changed; investigate before reporting")
    protocol = json.loads(raw)
    with (folder / "outcomes.csv").open(newline="") as file:
        reader = csv.DictReader(file)
        if set(reader.fieldnames or []) != {
            "customer_id",
            "received_minor",
            "minutes",
            "observation_complete",
        }:
            raise ValueError("Invalid outcome columns")
        outcomes = list(reader)
    expected = {m["customer_id"] for m in protocol["members"]}
    if len(outcomes) != len(expected) or {r["customer_id"] for r in outcomes} != expected:
        raise ValueError("Full registered cohort required; no dropped or added customers")
    lookup = {r["customer_id"]: r for r in outcomes}
    rows = []
    now = now or datetime.now(timezone.utc)
    for member in protocol["members"]:
        outcome = lookup[member["customer_id"]]
        if datetime.fromisoformat(member["observed_until"]) > now:
            raise ValueError("Observation window has not finished")
        if (
            outcome["observation_complete"] != "yes"
            or not outcome["received_minor"].isdigit()
            or not outcome["minutes"].strip()
        ):
            raise ValueError("Explicit complete observation and cash/time values required")
        rows.append(
            {**member, "received_minor": int(outcome["received_minor"]), "minutes": float(outcome["minutes"])}
        )
    summary = summarize(rows, protocol["seed"], protocol["horizon_days"])
    return {
        "status": "descriptive_local_report_not_causal_proof",
        "protocol_sha256": hashlib.sha256(raw).hexdigest(),
        "registered_customers": len(expected),
        **summary,
    }
