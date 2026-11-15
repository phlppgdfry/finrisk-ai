import csv
import io
import json
import hashlib
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient
from invoice_risk.api import app, Invoice
from invoice_risk.data import FEATURES, ROOT, generate, split
from invoice_risk.train import evaluate

EXAMPLE = dict(
    amount=4500,
    payment_terms=30,
    customer_tenure=24,
    prior_invoices=30,
    prior_late_rate=0.35,
    avg_days_late=12,
    credit_utilisation=0.7,
)


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


def test_generator_is_reproducible():
    pd.testing.assert_frame_equal(generate(100, 42), generate(100, 42))
    assert not generate(100, 42).equals(generate(100, 43))


def test_split_no_overlap_and_chronology():
    parts = split(generate())
    assert [len(p) for p in parts] == [4320, 1440, 1440]
    assert set(parts[0].invoice_id).isdisjoint(parts[1].invoice_id)
    assert set(parts[1].invoice_id).isdisjoint(parts[2].invoice_id)
    assert set(parts[0].invoice_id).isdisjoint(parts[2].invoice_id)
    assert parts[0].issued_at.max() < parts[1].issued_at.min()
    assert parts[1].issued_at.max() < parts[2].issued_at.min()


def test_all_generated_features_obey_contract():
    for record in generate(500)[FEATURES].to_dict(orient="records"):
        Invoice(**record)


def test_target_not_a_feature():
    assert "late" not in FEATURES
    assert len(FEATURES) == 7
    assert not {"paid_at", "days_overdue", "invoice_id", "issued_at"} & set(FEATURES)


def test_health_and_unknown_route(client):
    assert client.get("/api/health").json()["status"] == "ready"
    assert client.get("/api/nonexistent").status_code == 404


def test_prediction_determinism_and_range(client):
    a = client.post("/api/predict", json=EXAMPLE).json()
    b = client.post("/api/predict", json=EXAMPLE).json()
    assert a["probability"] == b["probability"]
    assert 0 <= a["probability"] <= 1
    assert a["review"] == (a["probability"] >= app.state.report["threshold"])
    assert len(a["sensitivities"]) == 7
    assert a["latency_ms"] > 0


@pytest.mark.parametrize(
    "field,value",
    [
        ("amount", -1),
        ("amount", 50001),
        ("payment_terms", 0),
        ("customer_tenure", 0),
        ("prior_invoices", 0),
        ("prior_late_rate", 1.1),
        ("avg_days_late", -1),
        ("credit_utilisation", 2),
    ],
)
def test_reject_out_of_domain(client, field, value):
    assert client.post("/api/predict", json={**EXAMPLE, field: value}).status_code == 422


def test_reject_future_and_extra_fields(client):
    assert client.post("/api/predict", json={**EXAMPLE, "late": 1}).status_code == 422
    assert client.post("/api/predict", json={"amount": 100}).status_code == 422
    assert client.post("/api/predict", json={**EXAMPLE, "prior_late_rate": 0}).status_code == 422


def test_finite_values_rejected(client):
    body = json.dumps({**EXAMPLE, "amount": "NaN"})
    assert (
        client.post("/api/predict", content=body, headers={"Content-Type": "application/json"}).status_code
        == 422
    )
    raw = json.dumps({**EXAMPLE, "amount": float("nan")})
    assert (
        client.post("/api/predict", content=raw, headers={"Content-Type": "application/json"}).status_code
        == 422
    )


def test_batch_equal_single_and_no_mutation(client):
    before = client.get("/api/portfolio").json()
    a = client.post("/api/predict", json=EXAMPLE).json()
    b = client.post("/api/batch", json={"invoices": [EXAMPLE]}).json()
    assert b["predictions"][0]["probability"] == a["probability"]
    assert len(b["shift_diagnostics"]) == 7
    assert client.get("/api/portfolio").json() == before


def test_batch_limits(client):
    assert client.post("/api/batch", json={"invoices": []}).status_code == 422
    assert client.post("/api/batch", json={"invoices": [EXAMPLE] * 251}).status_code == 422
    assert client.post("/api/batch", json={"invoices": [EXAMPLE] * 250}).status_code == 200


def test_portfolio_scores_are_live(client):
    portfolio = client.get("/api/portfolio").json()
    assert portfolio["synthetic"] is True
    assert len(portfolio["invoices"]) == 64
    for row in portfolio["invoices"][::13]:
        result = client.post("/api/predict", json={f: row[f] for f in FEATURES}).json()
        assert row["probability"] == result["probability"]
    assert sorted([r["probability"] for r in portfolio["invoices"]], reverse=True) == [
        r["probability"] for r in portfolio["invoices"]
    ]


def test_csv_export_and_sample(client):
    rows = list(csv.DictReader(io.StringIO(client.get("/api/export").text)))
    assert len(rows) == 64
    assert "late" not in rows[0]
    sample = list(csv.DictReader(io.StringIO(client.get("/api/sample").text)))
    assert set(sample[0]) == set(FEATURES)
    assert client.post("/api/batch", json={"invoices": sample}).status_code == 200


def test_metrics_against_known_confusion():
    r = evaluate(np.array([0, 0, 1, 1]), np.array([0.1, 0.7, 0.2, 0.8]), 0.5)
    assert (r["tn"], r["fp"], r["fn"], r["tp"]) == (1, 1, 1, 1)
    assert r["precision"] == r["recall"] == 0.5
    assert r["toy_cost"] == 6


def test_report_and_artifact_provenance(client):
    r = client.get("/api/report").json()
    assert r["data_sha256"] == hashlib.sha256(generate().to_csv(index=False).encode()).hexdigest()
    assert r["model_sha256"] == hashlib.sha256((ROOT / "artifacts/model.joblib").read_bytes()).hexdigest()
    m = r["metrics"]
    assert m["tn"] + m["fp"] + m["fn"] + m["tp"] == r["test_rows"]
    assert r["auc_interval"][0] < m["roc_auc"] < r["auc_interval"][1]
    assert 0.5 < m["roc_auc"] < 0.99


def test_threshold_selected_only_on_validation(client):
    tr, va, te = split(generate())
    p = app.state.model.predict_proba(va[FEATURES])[:, 1]
    candidates = np.round(np.arange(0.05, 0.951, 0.01), 2)
    costs = [((p >= t) & (va.late == 0)).sum() + 5 * ((p < t) & (va.late == 1)).sum() for t in candidates]
    assert client.get("/api/report").json()["threshold"] == float(candidates[int(np.argmin(costs))])


def test_static_frontend_and_security_header(client):
    response = client.get("/")
    if (ROOT / "frontend/dist").exists():
        assert response.status_code == 200
        assert "FinRisk AI" in response.text
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert float(response.headers["X-Response-Time-Ms"]) >= 0
