import hashlib
import json
import pytest
from scripts import model_release


def test_release_restore_integrity_and_immutability(tmp_path, monkeypatch):
    monkeypatch.setattr(model_release, "ROOT", tmp_path)
    for name in model_release.FILES:
        path = tmp_path / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text('{"version":"test"}' if name == "artifacts/report.json" else "original")
    report_path = tmp_path / "artifacts/report.json"
    report_path.write_text(
        json.dumps(
            {
                "version": "test",
                "model_sha256": hashlib.sha256(b"original").hexdigest(),
                "data_sha256": hashlib.sha256(b"original").hexdigest(),
            }
        )
    )
    model_release.freeze("v9.0.0")
    with pytest.raises(ValueError, match="already exists"):
        model_release.freeze("v9.0.0")
    working = tmp_path / model_release.FILES[0]
    working.write_text("candidate")
    model_release.restore()
    assert working.read_text() == "original"
    snapshot = tmp_path / "releases/v9.0.0" / model_release.FILES[0]
    snapshot.write_text("corrupted")
    working.write_text("preserve")
    with pytest.raises(ValueError, match="integrity failure"):
        model_release.restore()
    assert working.read_text() == "preserve"  # all hashes checked before copying


def test_published_replay_capacity_cooldown_and_no_invented_scores():
    from invoice_risk.data import ROOT
    from datetime import date

    data = json.loads((ROOT / "frontend/public/data/operations.json").read_text())
    for days in data["replay"].values():
        previous = {}
        for day in days:
            now = date.fromisoformat(day["as_of"])
            rows = day["selected"]
            assert len(rows) <= 10
            assert len({r["customer"] for r in rows}) == len(rows)
            for row in rows:
                assert row["days_overdue"] > 0 and row["open_minor"] > 0
                if row["customer"] in previous:
                    assert (now - previous[row["customer"]]).days >= 7
                previous[row["customer"]] = now
                if row["lane"] != "model":
                    assert row["score"] is None
    manifest = json.loads((ROOT / "releases/v1.2.0/manifest.json").read_text())
    for name, expected in manifest["files"].items():
        assert hashlib.sha256((ROOT / "releases/v1.2.0" / name).read_bytes()).hexdigest() == expected
