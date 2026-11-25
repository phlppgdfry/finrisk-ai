import { OperationsLab } from "./OperationsLab";
import { resource, STATIC_DEMO, REPOSITORY, asset } from "./runtime";
import { useState, useEffect } from "react";
import {
  BarChart3,
  LayoutDashboard,
  FileText,
  FlaskConical,
  BookOpen,
  ArrowUpRight,
  Download,
  ArrowRight,
  Upload,
  Info,
  ExternalLink,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  GitBranch,
} from "lucide-react";
import {
  InvoiceTable,
  Distribution,
  Panel,
  Modal,
  Badge,
  Sensitivities,
} from "./components";
import { TreeExplorer, ForestGlyph } from "./TreeExplorer";
import { OverviewHero } from "./OverviewHero";
import { ScenarioLab } from "./ScenarioLab";
import { ModelReport } from "./ModelReport";
import { CaseStudy } from "./CaseStudy";
import { ImportCSV } from "./Import";
import {
  type Report,
  type Invoice,
  type Inputs,
  type Prediction,
  request,
  inputsOf,
  money,
  pct,
} from "./types";
const pages = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "operations", label: "Daily workflow", icon: FileText },
  { id: "invoices", label: "Invoices", icon: FileText },
  { id: "scenario", label: "Scenario lab", icon: FlaskConical },
  { id: "learn", label: "How it works", icon: GitBranch },
  { id: "model", label: "Model report", icon: BarChart3 },
  { id: "case-study", label: "Case study", icon: BookOpen },
];
function getPage() {
  const key = window.location.hash.slice(1);
  return pages.some((p) => p.id === key) ? key : "overview";
}
export default function App() {
  const [page, setPage] = useState(getPage);
  const [report, setReport] = useState<Report | null>(null);
  const [rows, setRows] = useState<Invoice[]>([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [sort, setSort] = useState("risk");
  const [selected, setSelected] = useState<Invoice | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [detailError, setDetailError] = useState("");
  const [importing, setImporting] = useState(false);
  const [scenario, setScenario] = useState<Inputs | undefined>();
  function go(p: string) {
    window.location.hash = p;
    setPage(p);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  useEffect(() => {
    const listener = () => setPage(getPage());
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      request<Report>("/api/report", { signal: controller.signal }),
      request<{ invoices: Invoice[] }>("/api/portfolio", {
        signal: controller.signal,
      }),
    ])
      .then(([r, p]) => {
        setReport(r);
        setRows(p.invoices);
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          setError(
            "The demonstration could not be loaded. Please check your connection and reload.",
          );
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    setPrediction(null);
    setDetailError("");
    request<Prediction>("/api/predict", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(inputsOf(selected)),
    })
      .then(setPrediction)
      .catch((e) => {
        if (e.name !== "AbortError") setDetailError(e.message);
      });
    return () => controller.abort();
  }, [selected]);
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const flagged = rows.filter((r) => r.review);
  const exposure = flagged.reduce((s, r) => s + r.amount, 0);
  const tableProps = {
    rows,
    onSelect: setSelected,
    query,
    setQuery,
    filter,
    setFilter,
    sort,
    setSort,
  };
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a href="#overview" className="brand" onClick={() => go("overview")}>
          <span className="brand-mark">
            <i />
            <i />
            <i />
          </span>
          FinRisk <span>AI</span>
        </a>
        <div className="nav-label">WORKBENCH</div>
        <nav aria-label="Main navigation">
          {pages.map(({ id, label, icon: Icon }) => (
            <a
              key={id}
              href={`#${id}`}
              onClick={() => go(id)}
              aria-current={page === id ? "page" : undefined}
              className={page === id ? "active" : ""}
            >
              <Icon size={19} />
              <span>{label}</span>
              {page === id && <span className="nav-dot" />}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-project">
            <span className="mini-label">PORTFOLIO PROJECT</span>
            <strong>Built to be understood.</strong>
            <a href="#case-study" onClick={() => go("case-study")}>
              Explore the project <ArrowUpRight size={15} />
            </a>
          </div>
          <div className="disclosure">
            <Info size={16} />
            <div>
              <strong>Demo invoices: synthetic</strong>
              <p>
                A working ML demonstration.
                <br />
                Not a validated financial model.
              </p>
            </div>
          </div>
          <div className="author">
            Philippe Godfroy <span>v1.3</span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div>
            <span>Workspace</span>
            <span className="crumb">/</span>
            <strong>{pages.find((p) => p.id === page)?.label}</strong>
          </div>
          <div className="topbar-right">
            {report && (
              <span className="online">
                <span />
                {STATIC_DEMO ? "Model runs in your browser" : "Model ready"}
              </span>
            )}
            <a href={REPOSITORY} target="_blank" rel="noreferrer">
              Source code <ExternalLink size={13} />
            </a>
            {page === "overview" && (
              <a
                href={resource("export")}
                download="finrisk-synthetic-portfolio.csv"
              >
                <Download size={13} />
                Export portfolio
              </a>
            )}
            <span className="profile">PG</span>
          </div>
        </header>
        <main id="main-content">
          {error ? (
            <Panel>
              <div className="empty">
                <AlertCircle size={30} />
                <h1>Could not connect.</h1>
                <p>{error}</p>
                <button
                  className="primary"
                  onClick={() => window.location.reload()}
                >
                  Try again
                </button>
              </div>
            </Panel>
          ) : !report ? (
            <div className="loading" role="status">
              <LoaderCircle className="spin" />
              <p>Loading model and scoring the portfolio…</p>
            </div>
          ) : (
            <>
              {page === "overview" && (
                <>
                  <OverviewHero
                    onExplore={() => go("invoices")}
                    onLearn={() => go("learn")}
                  />
                  <div className="stats">
                    {[
                      [
                        "Outstanding balance",
                        money(total),
                        `${rows.length} newly issued invoices`,
                      ],
                      [
                        "Flagged exposure",
                        money(exposure),
                        "Full amount of flagged invoices",
                      ],
                      [
                        "Invoices to review",
                        String(flagged.length),
                        `Policy threshold ${pct(report.threshold)}`,
                      ],
                      [
                        "Model ROC-AUC",
                        report.metrics.roc_auc.toFixed(3),
                        `${report.test_rows.toLocaleString()} held-out synthetic invoices`,
                      ],
                    ].map(([label, value, note]) => (
                      <div className="stat" key={label}>
                        <span>{label}</span>
                        <strong>{value}</strong>
                        <small>{note}</small>
                      </div>
                    ))}
                  </div>
                  <div className="overview-grid">
                    <Panel className="distribution-panel">
                      <div className="section-title">
                        <div>
                          <h2>Know where to focus next.</h2>
                          <p>Synthetic portfolio · scored by Random Forest</p>
                        </div>
                        <span className="chart-tag">
                          {rows.length} invoices
                        </span>
                      </div>
                      <Distribution invoices={rows} />
                      <div className="chart-legend">
                        <span>
                          <i />
                          Lower likelihood
                        </span>
                        <span>
                          <i />
                          Higher likelihood
                        </span>
                      </div>
                    </Panel>
                    <section className="action-panel forest-invitation">
                      <h2>
                        One invoice.
                        <br />
                        220 perspectives.
                      </h2>
                      <ForestGlyph />
                      <button
                        className="lime-button"
                        onClick={() => go("learn")}
                      >
                        Step inside the forest <ArrowRight size={17} />
                      </button>
                      <span className="action-note">
                        Follow the actual model, one split at a time.
                      </span>
                    </section>
                  </div>
                  <InvoiceTable {...tableProps} limit={6} />
                  <div className="below-table">
                    <p>
                      <Info size={14} />
                      Risk bands: Low &lt;30% · Medium 30–60% · High ≥60%.
                      Follow-up uses a separate validation-selected threshold.
                    </p>
                    <button
                      className="text-button"
                      onClick={() => go("invoices")}
                    >
                      View all invoices <ArrowRight size={15} />
                    </button>
                  </div>
                  <div className="overview-bottom">
                    <div>
                      <CheckCircle2 size={16} />
                      Real inference. Reproducible evidence.
                    </div>
                    <button onClick={() => go("model")} className="text-button">
                      See how the model performs <ArrowUpRight size={15} />
                    </button>
                  </div>
                </>
              )}
              {page === "invoices" && (
                <>
                  <div className="page-intro">
                    <div>
                      <h1>Every invoice. A clearer priority.</h1>
                      <p>
                        Inspect the synthetic portfolio, or score a batch of
                        your own synthetic examples.
                      </p>
                    </div>
                    <div className="actions">
                      <button
                        className="secondary"
                        onClick={() => setImporting(true)}
                      >
                        <Upload size={16} /> Score CSV
                      </button>
                      <a
                        className="primary"
                        href={resource("export")}
                        download="finrisk-synthetic-portfolio.csv"
                      >
                        <Download size={16} /> Export portfolio
                      </a>
                    </div>
                  </div>
                  <div className="info-banner">
                    <Info size={17} />
                    <p>
                      {rows.length} invoices at issuance · synthetic snapshot 15
                      November 2026. All balances are outstanding. Scores do not
                      use overdue status or future payment outcomes.
                    </p>
                  </div>
                  <InvoiceTable {...tableProps} />
                  <p className="subtle">
                    Band thresholds: Low &lt;30%, Medium 30–60%, High ≥60%. The
                    follow-up policy flags scores ≥{pct(report.threshold)}{" "}
                    independently of these display bands.
                  </p>
                </>
              )}
              {page === "scenario" && (
                <ScenarioLab
                  key={JSON.stringify(scenario)}
                  initial={scenario}
                  threshold={report.threshold}
                />
              )}
              {page === "learn" && <TreeExplorer />}
              {page === "operations" && <OperationsLab />}
              {page === "model" && <ModelReport report={report} />}
              {page === "case-study" && (
                <CaseStudy
                  report={report}
                  onDemo={() => {
                    setScenario(undefined);
                    go("scenario");
                  }}
                />
              )}
            </>
          )}
          <footer className="workspace-footer">
            <span>FinRisk AI · Independent portfolio by Philippe Godfroy</span>
            <span>Python / Random Forest / FastAPI / React</span>
          </footer>
        </main>
      </div>
      {selected && (
        <Modal title={selected.invoice_id} onClose={() => setSelected(null)}>
          <div className="invoice-detail">
            <span className="customer">
              <span className="avatar">{selected.initials}</span>
              <strong>{selected.customer}</strong>
            </span>
            <div className="detail-amount">
              {money(selected.amount)}
              <Badge band={selected.risk_band} />
            </div>
            <p>Due {selected.due_date} · synthetic invoice at issuance</p>
            <div className="detail-score">
              <span>Estimated late-payment risk</span>
              <strong>{pct(selected.probability, 1)}</strong>
              <p>
                {selected.review
                  ? "Flagged for human follow-up"
                  : "Below the follow-up threshold"}
              </p>
            </div>
            {prediction ? (
              <Sensitivities prediction={prediction} />
            ) : detailError ? (
              <div className="error" role="alert">
                {detailError}
              </div>
            ) : (
              <div className="loading-small">
                <LoaderCircle className="spin" size={18} />
                Analysing model sensitivity…
              </div>
            )}
            <details>
              <summary>View all seven input features</summary>
              <dl className="input-details">
                {Object.entries(inputsOf(selected)).map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </details>
            <button
              className="primary full"
              onClick={() => {
                setScenario(inputsOf(selected));
                setSelected(null);
                go("scenario");
              }}
            >
              Explore this invoice in the lab <ArrowRight size={17} />
            </button>
            <p className="subtle">
              No reminder is sent. A score is a prioritisation aid for human
              review.
            </p>
          </div>
        </Modal>
      )}
      {importing && (
        <Modal title="Score a CSV batch" onClose={() => setImporting(false)}>
          <ImportCSV />
        </Modal>
      )}
    </div>
  );
}
