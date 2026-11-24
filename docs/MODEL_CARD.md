# FinRisk AI — model card

**Version:** 1.0.0 · **Owner:** Philippe Godfroy · **Data:** entirely synthetic.

## Intended use
An independent educational portfolio demonstrating invoice-level classification, evaluation, API delivery and a human-facing workbench. The target is `late = 1` when a simulated invoice is paid after its due date. The scoring moment is invoice issuance. It is not a probability of default, fraud, non-payment, or expected loss.

No validated real-world financial decisions, automated collection messages, eligibility decisions or credit limits. No affiliation with BrightAnalytics is claimed.

## Data and timing
`invoice_risk/data.py` generates 7,200 rows with NumPy seed 42. Seven features describe values available at issuance: invoice amount, agreed payment terms, customer tenure, count of completed prior invoices, prior late-payment rate, average days late among previously late invoices, and credit utilisation. A customer with zero prior late rate has zero historical average delay.

Labels are sampled from an intentionally noisy logistic rule with an interaction, then a Bernoulli draw. The inference API never uses this rule; it loads the trained forest. Dates span 2023–2025 and are assigned deterministically. Rows are independent examples, not a simulation of repeated customers or causal business interventions. The 64 demo invoices are generated with an independent seed (84), treated as newly issued on 15 November 2026, and have no displayed outcomes.

The chronological 60/20/20 split separates training (4,320), validation (1,440) and test (1,440). Sorting by synthetic dates is a pipeline demonstration: it does not reproduce label-maturity windows, entity recurrence, seasonal shocks or concept drift. For real data, completed historical invoices and target outcomes must be available as of the relevant cutoff, with an embargo where needed.

## Model and decision policy
RandomForestClassifier: 220 trees, maximum depth 12, minimum leaf size 12, seed 42. Fixed parameters, no search against the test set. Two baselines: prior DummyClassifier and StandardScaler + LogisticRegression.

On validation only, search thresholds 0.05 to 0.95 in steps of 0.01. Minimise `FP + 5*FN`; ties choose the lower threshold. This cost ratio is illustrative, not validated business economics. Logistic regression gets its own threshold on the same validation data. The dummy uses 0.5. No numeric identifier, current arrears status or future outcome enters training.

Display risk bands are fixed: Low <30%, Medium 30–60%, High ≥60%. They are separate from the learned follow-up threshold, so a Low-band invoice can be flagged. Flagged exposure is the full amount of flagged invoices, not expected loss. The interface explains this distinction.

## Evaluation and model selection
The exact metrics, confusion matrix, threshold, calibration bins, feature importance, sample slices, split dates and SHA-256 fingerprints live in `artifacts/report.json`; `docs/evaluation.html` is generated from that artifact.

Report ROC-AUC, average precision (labelled PR-AUC), precision, recall, F1, accuracy and Brier score. Average precision is the non-interpolated precision-recall summary, not trapezoidal area. A 250-resample percentile bootstrap estimates an AUC interval under the synthetic sampling distribution. It does not account for generator misspecification or real-world shift.

If logistic regression wins, consider it for a real deployment. The Random Forest remains served here because the project demonstrates forest engineering, not a claim that the forest is universally best. The model report makes the comparison visible. The test threshold slider is exploratory and does not mutate the deployed policy; using it to choose a new policy would require fresh validation and a new untouched test set.

## Explanations and monitoring
Global permutation importance: validation ROC-AUC decrease, five repeats, mean and standard deviation. Correlations can dilute importance.

Local sensitivity replaces one input at a time with its training mean. The difference is shown in percentage points. This is not SHAP, a causal attribution or evidence that an action will improve payment. Mean substitutions can produce unrealistic combinations of correlated features, including fractional counts. They are an illustration of model response only.

Batch shift diagnostic: `(batch mean - training mean) / training standard deviation` per numeric feature. It is descriptive, noisy on small batches, and not an automated or statistically validated drift detector. No claim of production monitoring is made. The benchmark measures warm local HTTP response times at concurrency one; hardware and sensitivity inference overhead affect it.

## Reliability and operational boundaries
Scores are uncalibrated estimates. No fairness audit or performance on real customer records. No automatic training/retraining, authentication, public ingestion, persistent storage, cloud deployment, rollback service or Kubernetes. API ranges restrict inputs to the demonstrated domain; these are model support boundaries, not universal accounting rules. Forest scores require at least one eligible prior settled invoice. The daily-workflow demo routes cold-start customers to human review without a forest probability.

The API validates types, rejects unknown fields, enforces batch limits, and logs operational metadata without request bodies. Model files are generated locally and checked against the paired report hash. Joblib is unsafe for untrusted artifacts; checksums detect accidental mismatch, not a malicious actor who can replace both files. Only load trusted local build artifacts.

The default server and Compose binding are loopback-only. Before public hosting: authentication and authorisation, request-body/rate limits, TLS, dependency/container scanning, structured observability, input/output audit policy, privacy controls and operational ownership. Uploaded batch values are processed in memory without persistence. Production access logs require a separate retention policy.

## Reproducibility
Python 3.13, locked Python dependencies and npm lockfile. Run `make setup train build check package`. Seeds fix data generation and forest sampling. Different numerical libraries/platforms may cause small differences. `trained_at` is expected to change; dataset hash should remain stable on the locked environment. `requirements-lock.txt` captures the tested development environment, including test tools.

## Browser deployment (UI version 1.1)

The GitHub Pages demonstrator exports all 220 actual trees and computes the same forest mean in JavaScript, with float32 input semantics. It has no remote inference backend. The export is tested against 824 Python oracle inputs including split boundaries; numerical tolerance is 1e-12. The tree explorer shows true node paths and bootstrap-weighted leaf probabilities, with unique-row counts separately labelled. Rounded displayed cutoffs are for legibility only. On this static site uploaded CSVs never leave browser memory. Public source archives contain source; regenerate Python artifacts with the training commands.
