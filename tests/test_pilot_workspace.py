import csv
from datetime import datetime, timezone
import pytest
from invoice_risk.pilot_workspace import register, report


def cohort(tmp_path):
    path = tmp_path / "cohort.csv"
    path.write_text("customer_id,currency,opening_minor\n" + "\n".join(f"C{i},EUR,10000" for i in range(20)))
    return path


def registered(tmp_path):
    folder = tmp_path / "private-pilot"
    register(
        cohort(tmp_path),
        folder,
        owner="test owner",
        rights="test fixture",
        source="generated fixture",
        seed="fixed",
        start="2027-01-01T00:00:00+00:00",
        now=datetime(2026, 1, 1, tzinfo=timezone.utc),
    )
    return folder


def complete(folder):
    with (folder / "outcomes.csv").open() as file:
        rows = list(csv.DictReader(file))
    for row in rows:
        row.update(received_minor="5000", minutes="5", observation_complete="yes")
    with (folder / "outcomes.csv").open("w", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    return rows


def test_pilot_refuses_blank_outcomes_and_future_windows(tmp_path):
    folder = registered(tmp_path)
    with pytest.raises(ValueError, match="cash/time"):
        report(folder, now=datetime(2028, 1, 1, tzinfo=timezone.utc))
    complete(folder)
    with pytest.raises(ValueError, match="not finished"):
        report(folder, now=datetime(2027, 1, 2, tzinfo=timezone.utc))
    result = report(folder, now=datetime(2028, 1, 1, tzinfo=timezone.utc))
    assert result["registered_customers"] == 20
    assert result["receipt_difference_pp"] == 0
    assert "customer_id" not in result


def test_pilot_refuses_dropped_customer_or_tampered_protocol(tmp_path):
    folder = registered(tmp_path)
    complete(folder)
    path = folder / "outcomes.csv"
    path.write_text("\n".join(path.read_text().splitlines()[:-1]))
    with pytest.raises(ValueError, match="Full registered cohort"):
        report(folder, now=datetime(2028, 1, 1, tzinfo=timezone.utc))
    protocol = folder / "protocol.json"
    protocol.write_text(protocol.read_text() + " ")
    with pytest.raises(ValueError, match="Protocol changed"):
        report(folder)
    with pytest.raises(ValueError, match="already exists"):
        register(
            cohort(tmp_path),
            folder,
            owner="owner",
            rights="ref",
            source="ref",
            seed="seed",
            start="2027-01-01T00:00:00+00:00",
        )


def test_pilot_refuses_retrospective_allocation(tmp_path):
    with pytest.raises(ValueError, match="before the action period"):
        register(
            cohort(tmp_path),
            tmp_path / "old",
            owner="owner",
            rights="ref",
            source="ref",
            seed="fixed",
            start="2020-01-01T00:00:00+00:00",
        )
