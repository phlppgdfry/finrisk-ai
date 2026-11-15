import { useEffect, useRef, useId, type ReactNode } from "react";
import { X, ArrowUpRight, Search, ArrowDown, ArrowUp } from "lucide-react";
import {
  type Invoice,
  type Prediction,
  type Feature,
  pct,
  money,
} from "./types";
export function Risk({ value }: { value: number }) {
  return (
    <span className="risk-meter">
      <span className="risk-track">
        <span style={{ width: pct(value) }} />
      </span>
      <b>{pct(value)}</b>
    </span>
  );
}
export function Badge({ band }: { band: string }) {
  return (
    <span className={`badge ${band.toLowerCase()}`}>
      <span />
      {band}
    </span>
  );
}
export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`panel ${className}`}>{children}</section>;
}
export function Distribution({ invoices }: { invoices: Invoice[] }) {
  const counts = Array.from(
    { length: 5 },
    (_, i) =>
      invoices.filter((r) => Math.min(4, Math.floor(r.probability * 5)) === i)
        .length,
  );
  const max = Math.max(...counts, 1);
  const ceiling = Math.ceil(max / 5) * 5;
  return (
    <div className="distribution">
      <svg
        viewBox="0 0 640 230"
        role="img"
        aria-label={`Risk distribution: ${counts.map((n, i) => `${i * 20} to ${(i + 1) * 20} percent: ${n} invoices`).join("; ")}`}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}>
            <line
              x1="42"
              x2="625"
              y1={175 - i * 38}
              y2={175 - i * 38}
              stroke="#e3e7e4"
            />
            <text x="29" y={180 - i * 38} textAnchor="end">
              {Math.round((ceiling * i) / 4)}
            </text>
          </g>
        ))}
        {counts.map((n, i) => (
          <g key={i}>
            <rect
              x={60 + i * 114}
              y={175 - (n / ceiling) * 152}
              width="76"
              height={(n / ceiling) * 152}
              rx="3"
              fill={["#174f3b", "#69955b", "#adc981", "#cadfa2", "#e2edcd"][i]}
            />
            <text
              x={98 + i * 114}
              y={Math.max(15, 165 - (n / ceiling) * 152)}
              textAnchor="middle"
              className="bar-count"
            >
              {n}
            </text>
            <text x={98 + i * 114} y="198" textAnchor="middle">
              {i * 20}–{(i + 1) * 20}%
            </text>
          </g>
        ))}
        <text x="335" y="226" textAnchor="middle">
          Estimated likelihood of late payment
        </text>
      </svg>
    </div>
  );
}
export function InvoiceTable({
  rows,
  onSelect,
  limit,
  query,
  setQuery,
  filter,
  setFilter,
  sort,
  setSort,
}: {
  rows: Invoice[];
  onSelect: (r: Invoice) => void;
  limit?: number;
  query: string;
  setQuery: (s: string) => void;
  filter: string;
  setFilter: (s: string) => void;
  sort: string;
  setSort: (s: string) => void;
}) {
  const filtered = rows
    .filter(
      (r) =>
        (filter === "All" || r.risk_band === filter) &&
        `${r.customer} ${r.invoice_id}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort((a, b) =>
      sort === "amount"
        ? b.amount - a.amount
        : sort === "customer"
          ? a.customer.localeCompare(b.customer)
          : b.probability - a.probability,
    );
  const visible = limit ? filtered.slice(0, limit) : filtered;
  return (
    <Panel className="table-panel">
      <div className="table-heading">
        <div>
          <h2>Your collection priorities</h2>
          <p>
            {rows.length} synthetic invoices · highest risk first by default
          </p>
        </div>
        <label className="search">
          <Search size={16} />
          <input
            aria-label="Search invoices"
            placeholder="Search customer or invoice…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="table-toolbar">
        <div className="segments" aria-label="Filter by risk">
          {["All", "High", "Medium", "Low"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={filter === f ? "selected" : ""}
            >
              {f}
              <span>
                {rows.filter((r) => f === "All" || r.risk_band === f).length}
              </span>
            </button>
          ))}
        </div>
        <span className="subtle">
          Select a row to inspect <ArrowUpRight size={14} />
        </span>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>
                <button
                  className="table-sort"
                  onClick={() => setSort("customer")}
                >
                  Customer{" "}
                  {sort === "customer" ? (
                    <ArrowUp size={12} />
                  ) : (
                    <ArrowDown size={12} />
                  )}
                </button>
              </th>
              <th>
                <button
                  className="table-sort"
                  onClick={() => setSort("amount")}
                >
                  Amount <ArrowDown size={12} />
                </button>
              </th>
              <th>
                <button className="table-sort" onClick={() => setSort("risk")}>
                  Payment risk <ArrowDown size={12} />
                </button>
              </th>
              <th>Due date</th>
              <th>Risk band</th>
              <th>
                <span className="sr-only">Inspect</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.invoice_id}>
                <td>
                  <button className="invoice-link" onClick={() => onSelect(r)}>
                    {r.invoice_id}
                  </button>
                </td>
                <td>
                  <span className="customer">
                    <span className="avatar">{r.initials}</span>
                    {r.customer}
                  </span>
                </td>
                <td className="numeric">{money(r.amount)}</td>
                <td>
                  <Risk value={r.probability} />
                </td>
                <td className="date">
                  {new Date(r.due_date + "T12:00:00").toLocaleDateString(
                    "en-GB",
                    { day: "2-digit", month: "short", year: "numeric" },
                  )}
                </td>
                <td>
                  <Badge band={r.risk_band} />
                </td>
                <td>
                  <button
                    className="icon-button"
                    aria-label={`Inspect ${r.invoice_id}`}
                    onClick={() => onSelect(r)}
                  >
                    <ArrowUpRight size={17} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!visible.length && (
          <div className="empty">
            <Search />
            <h3>No matching invoices</h3>
            <p>Try another customer name or risk band.</p>
            <button
              className="secondary"
              onClick={() => {
                setFilter("All");
                setQuery("");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
      <div className="table-footer">
        Showing {visible.length} of {filtered.length} matching invoices
        <span>Risk at issuance · as of 15 Nov 2026</span>
      </div>
    </Panel>
  );
}
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-heading">
        <h2 id={titleId}>{title}</h2>
        <button
          className="icon-button"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function Sensitivities({ prediction }: { prediction: Prediction }) {
  return (
    <div>
      <h3>What the model responds to</h3>
      <p className="subtle">
        Score change when each feature is replaced by its training mean. Model
        sensitivity, not a causal explanation.
      </p>
      <div className="sensitivity-list">
        {prediction.sensitivities.slice(0, 4).map((s) => (
          <div key={s.feature}>
            <span>{s.label}</span>
            <b className={s.delta > 0 ? "text-rust" : "text-green"}>
              {s.delta > 0 ? "+" : ""}
              {(s.delta * 100).toFixed(1)} pp
            </b>
          </div>
        ))}
      </div>
    </div>
  );
}
export const fields: {
  key: Feature;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  help: string;
}[] = [
  {
    key: "amount",
    label: "Invoice amount",
    min: 100,
    max: 50000,
    step: 0.01,
    unit: "€",
    help: "Value of the newly issued invoice.",
  },
  {
    key: "payment_terms",
    label: "Payment terms",
    min: 14,
    max: 90,
    step: 1,
    unit: "days",
    help: "Agreed days from issuance to payment.",
  },
  {
    key: "customer_tenure",
    label: "Customer tenure",
    min: 1,
    max: 180,
    step: 1,
    unit: "months",
    help: "Months of trading history at issuance.",
  },
  {
    key: "prior_invoices",
    label: "Prior invoices",
    min: 1,
    max: 119,
    step: 1,
    unit: "invoices",
    help: "Previously completed invoices only.",
  },
  {
    key: "prior_late_rate",
    label: "Historical late rate",
    min: 0,
    max: 1,
    step: 0.0001,
    unit: "ratio",
    help: "Share of prior invoices paid after their due date.",
  },
  {
    key: "avg_days_late",
    label: "Historical days late",
    min: 0,
    max: 90,
    step: 0.1,
    unit: "days",
    help: "Average delay across prior late invoices; zero if none.",
  },
  {
    key: "credit_utilisation",
    label: "Credit utilisation",
    min: 0,
    max: 1,
    step: 0.0001,
    unit: "ratio",
    help: "Credit exposure divided by the customer’s credit limit.",
  },
];
