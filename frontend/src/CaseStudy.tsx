import {
  ArrowRight,
  Download,
  ExternalLink,
  CheckCircle2,
  GitBranch,
  Database,
  Network,
  ShieldCheck,
  Code2,
} from "lucide-react";
import { Panel } from "./components";
import { type Report, pct } from "./types";
export function CaseStudy({
  report: r,
  onDemo,
}: {
  report: Report;
  onDemo: () => void;
}) {
  return (
    <>
      <div className="page-intro">
        <div>
          <h1>
            From business question
            <br />
            to working ML product.
          </h1>
          <p>
            FinRisk AI · an independent portfolio project by Philippe Godfroy
          </p>
        </div>
        <a href="/api/source" className="secondary">
          <Download size={16} /> Download source
        </a>
      </div>
      <section className="case-hero">
        <div>
          <h2>
            Who should the finance team
            <br />
            follow up with first?
          </h2>
          <p>
            FinRisk AI explores how invoice-level machine learning can help a
            collections team prioritise its attention — while keeping a human
            responsible for the decision.
          </p>
          <button className="lime-button" onClick={onDemo}>
            Try a scenario <ArrowRight size={17} />
          </button>
        </div>
        <div className="case-summary">
          <span>THE PROJECT AT A GLANCE</span>
          <dl>
            <dt>Role</dt>
            <dd>ML engineering & product prototype</dd>
            <dt>Stack</dt>
            <dd>Python · scikit-learn · FastAPI · React</dd>
            <dt>Evidence</dt>
            <dd>
              {r.rows.toLocaleString()} synthetic invoices · held-out evaluation
            </dd>
            <dt>Scope</dt>
            <dd>Local-first demonstrator · no real financial data</dd>
          </dl>
        </div>
      </section>
      <div className="case-layout">
        <div className="case-numbers">
          <span>01 / Frame</span>
          <h2>Start with the decision.</h2>
        </div>
        <div className="case-prose">
          <h3>A score is only useful if it supports an action.</h3>
          <p>
            The question is not “can we predict a number?” It is whether a team
            can use limited follow-up time more deliberately. This prototype
            predicts whether a newly issued invoice will be paid after its
            agreed due date.
          </p>
          <p>
            The workbench ranks invoices, separates likelihood from monetary
            exposure, and makes the classification threshold visible. Flagged
            exposure is the full amount of flagged invoices; it is not expected
            loss or cash recovered.
          </p>
          <p className="quote">
            “A missed late payment and an unnecessary reminder do not have the
            same operational cost.”
          </p>
        </div>
      </div>
      <div className="case-layout">
        <div className="case-numbers">
          <span>02 / Build</span>
          <h2>One connected system.</h2>
        </div>
        <div>
          <div className="architecture">
            {[
              {
                icon: Database,
                title: "Generate",
                text: "Seeded synthetic invoice history",
              },
              {
                icon: GitBranch,
                title: "Train & evaluate",
                text: "Chronological split · 3 model comparisons",
              },
              {
                icon: Network,
                title: "Serve",
                text: "Validated FastAPI · artifact checksum",
              },
              {
                icon: Code2,
                title: "Explore",
                text: "React dashboard · scenario lab · CSV scoring",
              },
            ].map(({ icon: Icon, title, text }, i) => (
              <div key={title}>
                <span className="arch-icon">
                  <Icon size={20} />
                </span>
                <div>
                  <small>0{i + 1}</small>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
                {i < 3 && <ArrowRight size={18} />}
              </div>
            ))}
          </div>
          <p className="subtle">
            The exact saved model produces dashboard scores, API responses and
            scenario results. There is no hand-coded substitute for inference
            and no external LLM dependency.
          </p>
        </div>
      </div>
      <div className="case-layout">
        <div className="case-numbers">
          <span>03 / Evaluate</span>
          <h2>Make the limits visible.</h2>
        </div>
        <div className="case-prose">
          <h3>Evidence that can be questioned.</h3>
          <p>
            The forest achieves {r.metrics.roc_auc.toFixed(3)} ROC-AUC,{" "}
            {pct(r.metrics.recall, 1)} recall and {pct(r.metrics.precision, 1)}{" "}
            precision on {r.test_rows.toLocaleString()} held-out synthetic
            invoices. A dummy prior and logistic regression provide context. If
            logistic regression performs better, the report says so.
          </p>
          <p>
            A fixed toy cost of five units per missed late invoice and one per
            false alarm selects the threshold on validation data. Test-set
            exploration is visibly separate from the deployed policy. A
            reliability diagram, Brier score, sample slices and bootstrap AUC
            interval expose uncertainty.
          </p>
          <p>
            Permutation importance describes global model signal. Reference
            substitutions describe local sensitivity. Neither proves causality
            or the benefit of an intervention.
          </p>
        </div>
      </div>
      <div className="two-col">
        <Panel>
          <ShieldCheck className="feature-icon" />
          <h2>Engineering with boundaries</h2>
          <ul className="check-list">
            {[
              "Strict input ranges; unknown and future-outcome fields rejected",
              "Batch limits; CSV scoring does not persist uploaded data",
              "Deterministic data, fixed seed and artifact fingerprint",
              "Automated API and model checks; CI and container recipe",
              "No autonomous reminders, credit decisions or revenue claims",
            ].map((s) => (
              <li key={s}>
                <CheckCircle2 size={17} />
                {s}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <h2>What I would validate next</h2>
          <ol className="next-list">
            <li>
              <strong>Real data contract</strong>
              <p>
                Agree on target, issuance-time features, privacy and
                label-maturity windows.
              </p>
            </li>
            <li>
              <strong>Stronger backtesting</strong>
              <p>
                Customer-aware temporal folds, out-of-time validation and
                calibrated scores.
              </p>
            </li>
            <li>
              <strong>Operational pilot</strong>
              <p>
                Measure precision at team capacity and actual collections
                outcomes against a control.
              </p>
            </li>
            <li>
              <strong>Production hardening</strong>
              <p>
                Authentication, audit trails, container scan, drift monitoring
                and rollback policy.
              </p>
            </li>
          </ol>
        </Panel>
      </div>
      <section className="case-footer">
        <div>
          <h2>Explore the evidence.</h2>
          <p>
            Source, model documentation and a live API — all part of the same
            project.
          </p>
        </div>
        <div className="actions">
          <a href="/api/source" className="primary">
            <Download size={16} /> Source ZIP
          </a>
          <a
            href="/docs"
            target="_blank"
            rel="noreferrer"
            className="secondary"
          >
            API docs <ExternalLink size={15} />
          </a>
        </div>
      </section>
      <p className="subtle">
        Built with AI assistance. The repository includes a Dutch learning guide
        and interview walkthrough. This is an independent project, with no
        claimed affiliation to BrightAnalytics.
      </p>
    </>
  );
}
