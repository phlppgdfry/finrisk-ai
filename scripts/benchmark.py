"""Local HTTP latency sample; not a production load test."""

import json
import time
import numpy as np
import httpx
from invoice_risk.data import ROOT


def main():
    invoice = dict(
        amount=4500,
        payment_terms=30,
        customer_tenure=24,
        prior_invoices=30,
        prior_late_rate=0.35,
        avg_days_late=12,
        credit_utilisation=0.7,
    )
    times = []
    with httpx.Client(base_url="http://127.0.0.1:8011", timeout=15) as c:
        for i in range(55):
            start = time.perf_counter()
            r = c.post("/api/predict", json=invoice)
            r.raise_for_status()
            if i >= 5:
                times.append((time.perf_counter() - start) * 1000)
    result = {
        "requests": 50,
        "warmup": 5,
        "concurrency": 1,
        "p50_ms": round(float(np.median(times)), 2),
        "p95_ms": round(float(np.quantile(times, 0.95)), 2),
        "scope": "Local loopback HTTP; includes 8 inferences for reference sensitivities. Hardware-dependent.",
    }
    (ROOT / "artifacts/benchmark.json").write_text(json.dumps(result, indent=2))
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
