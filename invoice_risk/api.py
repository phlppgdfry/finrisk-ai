"""Validated, local-first API. Artifacts are only loaded from our own training run."""

from contextlib import asynccontextmanager
from datetime import date, timedelta
import hashlib
import json
import logging
import time
from typing import Annotated
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, Response, JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field, model_validator
from invoice_risk.data import ROOT, FEATURES, LABELS, generate

log = logging.getLogger("finrisk")


class Invoice(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)
    amount: Annotated[float, Field(ge=100, le=50000)]
    payment_terms: Annotated[int, Field(ge=14, le=90)]
    customer_tenure: Annotated[int, Field(ge=1, le=180)]
    prior_invoices: Annotated[int, Field(ge=1, le=119)]
    prior_late_rate: Annotated[float, Field(ge=0, le=1)]
    avg_days_late: Annotated[float, Field(ge=0, le=90)]
    credit_utilisation: Annotated[float, Field(ge=0, le=1)]

    @model_validator(mode="after")
    def historical_consistency(self):
        if self.prior_late_rate == 0 and self.avg_days_late != 0:
            raise ValueError("With no historical late payments, average days late must be zero.")
        return self


class Batch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    invoices: list[Invoice] = Field(min_length=1, max_length=250)


def band(p):
    return "High" if p >= 0.6 else "Medium" if p >= 0.3 else "Low"


def score(app, records):
    x = pd.DataFrame(records, columns=FEATURES)
    probabilities = app.state.model.predict_proba(x)[:, 1]
    return [
        {
            "probability": round(float(p), 6),
            "risk_band": band(p),
            "review": bool(p >= app.state.report["threshold"]),
            "model_version": app.state.report["version"],
        }
        for p in probabilities
    ]


def make_portfolio(app):
    frame = generate(64, seed=84)
    # Make stored historical fields consistent with the API contract.
    frame.loc[frame.prior_late_rate == 0, "avg_days_late"] = 0
    records = frame[FEATURES].to_dict(orient="records")
    results = score(app, records)
    names = [
        "Northline Logistics",
        "Atelier Vermeer",
        "Dockside Materials",
        "Meridian Foods",
        "Linden Engineering",
        "Studio Forma",
        "Haven Supply",
        "Veldman Packaging",
        "Novum Digital",
        "Brugge Components",
        "Terra Office",
        "Atlas Manufacturing",
        "Moss & Co",
        "Westhaven Services",
        "Clearwater Energy",
        "Fenix Retail",
    ]
    # Fixed as-of date makes the example repeatable. Issuance-stage risk, not arrears scoring.
    asof = date(2026, 11, 15)
    rows = []
    for i, (features, result) in enumerate(zip(records, results)):
        rows.append(
            {
                "invoice_id": f"INV-{26001 + i}",
                "customer": names[i % len(names)],
                "initials": "".join(n[0] for n in names[i % len(names)].split()[:2]),
                "due_date": str(asof + timedelta(days=int(features["payment_terms"]))),
                **features,
                **result,
            }
        )
    return sorted(rows, key=lambda r: r["probability"], reverse=True)


@asynccontextmanager
async def lifespan(app):
    report_path = ROOT / "artifacts/report.json"
    if not report_path.exists():
        raise RuntimeError("Train first: python -m invoice_risk.train")
    app.state.report = json.loads(report_path.read_text())
    model_path = ROOT / "artifacts/model.joblib"
    if hashlib.sha256(model_path.read_bytes()).hexdigest() != app.state.report["model_sha256"]:
        raise RuntimeError("Model checksum mismatch. Retrain to restore trusted local artifacts.")
    app.state.model = joblib.load(model_path)
    app.state.portfolio = make_portfolio(app)
    app.state.requests = 0
    yield


app = FastAPI(
    title="FinRisk AI",
    version="1.0.0",
    lifespan=lifespan,
    description="Synthetic invoice risk research demo. No customer records are stored.",
)


@app.exception_handler(RequestValidationError)
async def validation_error(request, exc):
    # Exclude raw values and exception objects: NaN and ctx are not JSON-safe.
    return JSONResponse(
        status_code=422,
        content={
            "detail": [{"loc": list(e["loc"]), "msg": e["msg"], "type": e["type"]} for e in exc.errors()]
        },
    )


@app.middleware("http")
async def timing(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    response.headers["X-Response-Time-Ms"] = str(round((time.perf_counter() - start) * 1000, 2))
    response.headers["X-Content-Type-Options"] = "nosniff"
    # Log operational metadata, never invoice payloads.
    log.info(
        "%s %s %s %.1fms",
        request.method,
        request.url.path,
        response.status_code,
        (time.perf_counter() - start) * 1000,
    )
    return response


@app.get("/api/health")
def health():
    return {"status": "ready", "model_version": app.state.report["version"], "synthetic": True}


@app.get("/api/report")
def report():
    return app.state.report


@app.get("/api/portfolio")
def portfolio():
    return {
        "invoices": app.state.portfolio,
        "as_of": "2026-11-15",
        "synthetic": True,
        "threshold": app.state.report["threshold"],
    }


@app.post("/api/predict")
def predict(invoice: Invoice):
    start = time.perf_counter()
    result = score(app, [invoice.model_dump()])[0]
    # One-feature reference substitutions describe model sensitivity, not causal SHAP attribution.
    original = invoice.model_dump()
    variants = []
    for f in FEATURES:
        changed = dict(original)
        changed[f] = app.state.report["reference"][f]["mean"]
        variants.append(changed)
    alternate = score(app, variants)
    result["sensitivities"] = sorted(
        [
            {
                "feature": f,
                "label": LABELS[f],
                "delta": round(result["probability"] - alt["probability"], 6),
                "reference": app.state.report["reference"][f]["mean"],
            }
            for f, alt in zip(FEATURES, alternate)
        ],
        key=lambda x: abs(x["delta"]),
        reverse=True,
    )
    result["latency_ms"] = round((time.perf_counter() - start) * 1000, 2)
    return result


@app.post("/api/batch")
def batch(data: Batch):
    records = [i.model_dump() for i in data.invoices]
    results = score(app, records)
    # Simple numerical shift diagnostic; no statistically validated drift alert.
    shifts = []
    for f in FEATURES:
        ref = app.state.report["reference"][f]
        mean = float(np.mean([row[f] for row in records]))
        shifts.append(
            {
                "feature": f,
                "label": LABELS[f],
                "batch_mean": mean,
                "standardised_shift": round((mean - ref["mean"]) / max(ref["std"], 1e-9), 3),
            }
        )
    return {
        "predictions": results,
        "count": len(results),
        "shift_diagnostics": shifts,
        "note": "Mean shift / training standard deviation. Descriptive only; small batches are noisy.",
    }


@app.get("/api/export")
def export():
    frame = pd.DataFrame(app.state.portfolio)
    return Response(
        frame.to_csv(index=False),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="finrisk-synthetic-portfolio.csv"'},
    )


@app.get("/api/model-card")
def model_card():
    return FileResponse(
        ROOT / "docs/MODEL_CARD.md", media_type="text/markdown", filename="FinRisk-AI-model-card.md"
    )


@app.get("/api/source")
def source():
    path = ROOT / "dist/finrisk-ai-source.zip"
    if not path.exists():
        raise HTTPException(404, "Source archive not built. Run python -m scripts.package")
    return FileResponse(path, filename=path.name, media_type="application/zip")


@app.get("/api/sample")
def sample():
    frame = pd.DataFrame([{k: r[k] for k in FEATURES} for r in app.state.portfolio[:5]])
    return Response(
        frame.to_csv(index=False),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="finrisk-import-sample.csv"'},
    )


@app.get("/api/{path:path}", include_in_schema=False)
def unknown_api(path: str):
    raise HTTPException(404, "Unknown API endpoint")


web = ROOT / "frontend/dist"
if web.exists():
    app.mount("/", StaticFiles(directory=web, html=True), name="frontend")
