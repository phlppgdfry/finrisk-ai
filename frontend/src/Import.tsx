import { resource, STATIC_DEMO, REPOSITORY, asset } from "./runtime";
import { useState } from "react";
import { Upload, Download, AlertCircle, LoaderCircle } from "lucide-react";
import { features, type Inputs, type Prediction, request, pct } from "./types";
export function ImportCSV() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [filename, setFilename] = useState("");
  const [result, setResult] = useState<{
    predictions: Prediction[];
    count: number;
    shift_diagnostics: { label: string; standardised_shift: number }[];
  } | null>(null);
  const [records, setRecords] = useState<Inputs[]>([]);
  async function read(file: File) {
    setBusy(true);
    setError("");
    setResult(null);
    setFilename(file.name);
    try {
      if (file.size > 128000)
        throw new Error("File too large. Use a CSV smaller than 128 KB.");
      const text = (await file.text()).replace(/^\uFEFF/, "").trim();
      const lines = text.split(/\r?\n/);
      if (lines.length < 2 || lines.length > 251)
        throw new Error("Use 1–250 rows and one header row.");
      const header = lines[0].split(",").map((s) => s.trim());
      if (
        header.length !== 7 ||
        new Set(header).size !== 7 ||
        features.some((f) => !header.includes(f))
      )
        throw new Error(
          "Use the seven exact columns from the sample. No extra outcome or customer fields.",
        );
      const rows = lines.slice(1).map((line, i) => {
        const cells = line.split(",").map((s) => s.trim());
        if (
          cells.length !== 7 ||
          cells.some((s) => s === "" || !Number.isFinite(Number(s)))
        )
          throw new Error(
            `Row ${i + 2}: expected seven finite numeric values, comma-separated.`,
          );
        return Object.fromEntries(
          header.map((h, j) => [h, Number(cells[j])]),
        ) as Inputs;
      });
      const data = await request<NonNullable<typeof result>>("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoices: rows }),
      });
      setRecords(rows);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not score this file.");
    } finally {
      setBusy(false);
    }
  }
  function download() {
    if (!result) return;
    const rows = [
      features.join(",") + ",probability,risk_band,review",
      ...records.map((row, i) =>
        [
          ...features.map((f) => row[f]),
          result.predictions[i].probability,
          result.predictions[i].risk_band,
          result.predictions[i].review,
        ].join(","),
      ),
    ];
    const url = URL.createObjectURL(
      new Blob([rows.join("\n")], { type: "text/csv" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "finrisk-scored-invoices.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <p>
        Score a numeric CSV with the saved Random Forest. Uploaded values are
        processed in memory and are not added to the demonstration portfolio.{" "}
        {STATIC_DEMO
          ? "On this site, scoring happens entirely in your browser; the CSV is not uploaded."
          : "The local Python API performs the scoring."}
      </p>
      <a className="text-button" href={resource("sample")}>
        <Download size={15} /> Download sample CSV
      </a>
      <label className="upload-zone">
        <Upload size={28} />
        <strong>{busy ? "Scoring invoices…" : "Choose a CSV to score"}</strong>
        <span>Seven numeric features · 1–250 rows · up to 128 KB</span>
        <input
          type="file"
          accept=".csv,text/csv"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void read(f);
            e.target.value = "";
          }}
        />
      </label>
      {busy && <LoaderCircle className="spin" />}
      {error && (
        <div className="error" role="alert">
          <AlertCircle size={18} />
          {error}
        </div>
      )}
      {result && (
        <div className="import-result">
          <h3>{result.count} invoices scored</h3>
          <p>
            {filename} · {result.predictions.filter((r) => r.review).length}{" "}
            flagged for review
          </p>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>CSV row</th>
                  <th>Risk</th>
                  <th>Band</th>
                  <th>Review</th>
                </tr>
              </thead>
              <tbody>
                {result.predictions.slice(0, 10).map((r, i) => (
                  <tr key={i}>
                    <td>{i + 2}</td>
                    <td>{pct(r.probability, 1)}</td>
                    <td>{r.risk_band}</td>
                    <td>{r.review ? "Yes" : "No"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.count > 10 && (
            <p className="subtle">
              First 10 rows shown; download includes all {result.count}.
            </p>
          )}
          <button className="primary" onClick={download}>
            <Download size={16} /> Download scored CSV
          </button>
          <details>
            <summary>Batch shift diagnostic</summary>
            <p className="subtle">
              Batch mean minus training mean, divided by training standard
              deviation. Descriptive only; small batches are noisy. No automatic
              drift verdict.
            </p>
            {result.shift_diagnostics.map((d) => (
              <div className="shift-row" key={d.label}>
                <span>{d.label}</span>
                <b>{d.standardised_shift.toFixed(2)} σ</b>
              </div>
            ))}
          </details>
        </div>
      )}
      <p className="subtle">
        Use synthetic data in this demo. No account, database or upload history
        is created.
      </p>
    </>
  );
}
