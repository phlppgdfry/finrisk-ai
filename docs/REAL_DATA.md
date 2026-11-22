# Real-data readiness — status: not yet externally validated

Reviewed 22 November 2026. No real invoice-level validation result is claimed. The current capacity evaluation uses synthetic validation and test data, not production invoices.

## Public-source investigation

- HighRadius internship invoice projects expose invoice-like fields including due and clear dates. The reviewed project describes an internship dataset; its page did not establish independent permission to redistribute the underlying corporate data. A code/notebook license is not proof of dataset rights. Not imported: https://github.com/Hemanth9336/Invoice-Payment-Date-Prediction-Using-ML
- The reviewed invoice thesis describes anonymised/shifted student invoice data. Public code and pseudonymisation do not establish compatibility with our seven issuance-time features or permission for a new public dataset release. Not imported: https://github.com/anneryeo/invoice-payment-prediction-thesis
- UK payment-practices reporting describes genuine business payment statistics, but company/report-period aggregates are not invoice-level outcomes for this classifier. Do not treat an aggregate late-payment percentage as an invoice label: https://www.gov.uk/government/publications/business-payment-practices-and-performance-reporting-requirements/duty-to-report-guidance-to-reporting-on-payment-practices-and-performance

These are scoped findings about the reviewed sources, not a claim that no suitable public dataset exists.

## Working local validation route

`python -m scripts.validate_real PATH.csv --as-of YYYY-MM-DD --source "export reference" --rights "permission/licence reference" --output /private/tmp/finrisk-audit.json`

Required columns: the seven features in DATA_CONTRACT.md plus invoice_id, issued_at, features_as_of, due_at, paid_at. Dates must be parseable. IDs must be unique. Features must satisfy the model domain; features_as_of cannot exceed issued_at. Every due_at must precede the evaluation cutoff. Paid dates cannot precede issuance. The label is paid_at > due_at; an unpaid invoice past due is late. Both classes must be present for ROC-AUC. This is a fixed-model external test, not retraining or a licence-verification service.

Outputs: dataset fingerprint, declared source and rights, model fingerprint, classification metrics and top-10 comparisons against amount/history rules. Inputs stay local; output contains aggregates, not customer rows. Rights declarations and feature timestamps require human verification: a timestamp cannot prove that historical aggregates were correctly constructed. Missing features must be reconstructed point-in-time from eligible completed history, not filled with synthetic values.

Private data and outputs must stay outside the public repository. No messages, requests to dataset owners or uploads were sent.

## What is needed to finish genuine external validation

A dataset or approved internal export with verified reuse rights, a data owner, correct issuance-time history, invoice due/payment dates, matching currency/amount units and label-maturity cutoff. Assess customer recurrence, temporal leakage, domain shift and sampling bias before interpreting results. A successful schema check alone is not validation of operational usefulness.
