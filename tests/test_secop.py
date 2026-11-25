import hashlib
import json
import pandas as pd
from invoice_risk.data import ROOT
from scripts.benchmark_secop import prepare


def test_public_history_excludes_future_and_same_day_settlements():
    frame = pd.DataFrame(
        [
            dict(
                record_id="a",
                payer_id="payer",
                issued_at="2023-01-01",
                due_at="2023-01-05",
                paid_at="2023-01-10",
                payment_state="Pagado",
            ),
            dict(
                record_id="b",
                payer_id="payer",
                issued_at="2023-01-08",
                due_at="2023-01-15",
                paid_at="2023-01-22",
                payment_state="Pagado",
            ),
            dict(
                record_id="c",
                payer_id="payer",
                issued_at="2023-01-10",
                due_at="2023-01-20",
                paid_at="2023-01-25",
                payment_state="Pagado",
            ),
            dict(
                record_id="d",
                payer_id="payer",
                issued_at="2023-01-15",
                due_at="2023-01-20",
                paid_at="2023-01-30",
                payment_state="Pagado",
            ),
        ]
    )
    data, counts = prepare(frame)
    assert data.settled_history.tolist() == [0, 0, 0, 1]
    assert data.prior_late_rate.tolist() == [0, 0, 0, 1]
    assert counts["accepted"] == 4
    later = frame.copy()
    later.loc[1, "paid_at"] = "2023-03-01"
    changed, _ = prepare(later)
    assert data.settled_history.tolist() == changed.settled_history.tolist()


def test_public_snapshot_and_report_identity():
    folder = ROOT / "benchmarks/secop/snapshot-2026-11-24"
    source = json.loads((folder / "source.json").read_text())
    assert hashlib.sha256((folder / "records.csv").read_bytes()).hexdigest() == source["sha256"]
    report = json.loads((ROOT / "benchmarks/secop/report.json").read_text())
    assert report["source"]["sha256"] == source["sha256"]
    assert (
        report["pipeline_sha256"]
        == hashlib.sha256((ROOT / "scripts/benchmark_secop.py").read_bytes()).hexdigest()
    )
    assert report["status"] == "separate_public_benchmark_not_finrisk_external_validation"
    assert report["splits"]["test"]["rows"] == 245
    assert "Shorter payment-term rule" in report["capacity"]
    assert (
        report["data_quality"]["accepted"]
        == sum(r["rows"] for r in report["splits"].values())
        + report["data_quality"]["outcomes_unavailable_at_train_or_validation_cutoff"]
    )
