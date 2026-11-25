"""Fetch a bounded, non-personal public SECOP sample. No currency assumptions."""

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import urlopen
import pandas as pd
from invoice_risk.data import ROOT

BASE = "https://www.datos.gov.co/resource/uymx-8p3j.json"
SELECT = "id_del_contrato,id_de_pago,fecha_de_emision,fecha_de_vencimiento,fecha_real_de_pago,estado,codigo_entidad"


def fetch(output, cached=None):
    if output.exists():
        raise ValueError("Snapshot exists; choose a new directory")
    metadata_url = "https://www.datos.gov.co/api/views/uymx-8p3j.json"
    if cached:
        metadata = json.loads((cached.parent / "secop-metadata.json").read_text())
    else:
        with urlopen(metadata_url, timeout=90) as response:
            metadata = json.load(response)
    if metadata.get("licenseId") != "CC_40_BY_SA":
        raise ValueError("Source licence changed; review before downloading")
    params = {
        "$select": SELECT,
        "$where": 'estado = "Pagado" AND fecha_real_de_pago IS NOT NULL AND fecha_de_vencimiento IS NOT NULL',
        "$limit": 12000,
    }
    if cached:
        params["$select"] = SELECT.replace(
            "fecha_real_de_pago,estado", "fecha_real_de_pago,valor_total_de_la_factura,estado"
        )
    url = BASE + "?" + urlencode(params)
    if cached:
        raw_response = cached.read_bytes()
        rows = json.loads(raw_response)
    else:
        with urlopen(url, timeout=120) as response:
            raw_response = response.read()
            rows = json.loads(raw_response)
    if not isinstance(rows, list):
        raise ValueError("Unexpected source response")
    queries = [{"url": url, "rows": len(rows)}]
    print(f"Downloaded {len(rows)} public dated payment records", flush=True)
    # Only pseudonymous IDs and dates; no personal names, amounts or contact fields.
    records = []
    for row in rows:
        key = row.get("id_del_contrato", "") + ":" + row.get("id_de_pago", "")
        records.append(
            {
                "record_id": hashlib.sha256(key.encode()).hexdigest(),
                "payer_id": hashlib.sha256(row.get("codigo_entidad", "").encode()).hexdigest()
                if row.get("codigo_entidad")
                else "",
                "issued_at": row.get("fecha_de_emision"),
                "due_at": row.get("fecha_de_vencimiento"),
                "paid_at": row.get("fecha_real_de_pago"),
                "payment_state": row.get("estado"),
            }
        )
    output.mkdir(parents=True)
    frame = pd.DataFrame(records)
    csv = frame.to_csv(index=False)
    (output / "records.csv").write_text(csv)
    manifest = {
        "source": "SECOP II - Plan de pagos",
        "publisher": metadata["attribution"],
        "source_url": "https://www.datos.gov.co/Estad-sticas-Nacionales/SECOP-II-Plan-de-pagos/uymx-8p3j",
        "metadata_url": metadata_url,
        "licence": metadata["license"],
        "retrieved_at": (
            datetime.fromtimestamp(cached.stat().st_mtime, timezone.utc)
            if cached
            else datetime.now(timezone.utc)
        ).isoformat(),
        "sha256": hashlib.sha256(csv.encode()).hexdigest(),
        "rows_downloaded": len(rows),
        "raw_response_sha256": hashlib.sha256(raw_response).hexdigest(),
        "selection": "First 12000 paid API records with nonempty due and actual payment dates, in default source order; then benchmark selects records issued in 2023. Bounded convenience sample, not representative.",
        "queries": queries,
        "transformation": "Contract/payment key and public payer code SHA-256 pseudonyms; retain dates only. No amounts or currency assumptions. SHA-256 is not anonymisation against source lookup.",
    }
    (output / "source.json").write_text(json.dumps(manifest, indent=2))
    return output


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=ROOT / "benchmarks/secop/snapshot-2026-11-24")
    parser.add_argument(
        "--cached", type=Path, help="Reuse a previously retrieved response and adjacent secop-metadata.json"
    )
    args = parser.parse_args()
    print(fetch(args.output, args.cached))
