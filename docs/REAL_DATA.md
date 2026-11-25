# Real-data readiness — status: not yet externally validated

Reviewed 22 November 2026. The frozen seven-feature EUR forest has not been externally validated. A separate public-data candidate is documented below. The current capacity evaluation uses synthetic validation and test data, not production invoices.

## Public-source investigation

- HighRadius internship invoice projects expose invoice-like fields including due and clear dates. The reviewed project describes an internship dataset; its page did not establish independent permission to redistribute the underlying corporate data. A code/notebook license is not proof of dataset rights. Not imported: https://github.com/Hemanth9336/Invoice-Payment-Date-Prediction-Using-ML
- The reviewed invoice thesis describes anonymised/shifted student invoice data. Public code and pseudonymisation do not establish compatibility with our seven issuance-time features or permission for a new public dataset release. Not imported: https://github.com/anneryeo/invoice-payment-prediction-thesis
- UK payment-practices reporting describes genuine business payment statistics, but company/report-period aggregates are not invoice-level outcomes for this classifier. Do not treat an aggregate late-payment percentage as an invoice label: https://www.gov.uk/government/publications/business-payment-practices-and-performance-reporting-requirements/duty-to-report-guidance-to-reporting-on-payment-practices-and-performance

These are scoped findings about the reviewed sources, not a claim that no suitable public dataset exists.

## Working local validation route

`python -m scripts.validate_real PATH.csv --ledger PRIVATE-LEDGER.json --as-of YYYY-MM-DD --source "export reference" --rights "permission/licence reference" --output /private/tmp/finrisk-audit.json`

Required columns: seven features in DATA_CONTRACT.md plus invoice_id, customer_id, issued_at, features_as_of, due_at, paid_at, payment_status, currency, paid_amount, credit_amount, disputed. Model amounts are EUR major units; ledger amounts are integer minor units. Status must be explicitly `paid`, `unpaid` or `partial`; unknown is rejected. `paid_at` means full cash settlement, not last partial receipt. Paid requires full amount and date; partial requires a strictly positive incomplete amount and no full-settlement date; unpaid requires zero cash. Credits and disputes need separate resolution. Due dates must precede cutoff; future settlements are rejected. Both outcome classes are required.

Ledger JSON has `bills` and `events` arrays using the fields in [OPERATIONS.md](OPERATIONS.md). The three historical features are recomputed strictly before issuance and compared to input. No eligible history routes to manual review instead of fabricating a score. Day-level dates conservatively exclude same-day events. Other features, snapshot status history, source completeness, currency consistency and source rights still need human audit. A malicious or incomplete ledger can pass syntactic checks; this is not provenance certification.

Outputs: input/ledger/model fingerprints, declared provenance, classification metrics and top-10 amount/history comparisons. No input rows are uploaded or included in the aggregate report. The synthetic-trained frozen model is evaluated without tuning. This admission route is not evidence that external validation has happened.

Private data and outputs must stay outside the public repository. No messages, requests to dataset owners or uploads were sent.

## What is needed to finish genuine external validation

A dataset or approved internal export with verified reuse rights, a data owner, correct issuance-time history, invoice due/payment dates, matching currency/amount units and label-maturity cutoff. Assess customer recurrence, temporal leakage, domain shift and sampling bias before interpreting results. A successful schema check alone is not validation of operational usefulness.

## Additional admitted public source — November 2026

The official SECOP II Plan de pagos metadata states CC BY-SA 4.0 and supplies administrative issuance, payment-due and actual-payment dates. A bounded projection without personal/contact or monetary fields was fetched and frozen. See [the separate benchmark](../benchmarks/secop/README.md) and its [data licence](../benchmarks/secop/LICENSE-DATA.md).

The different six-feature candidate achieved ROC-AUC 0.850 on 245 final test records; a shorter-term rule achieved 0.841. Paid-only sampling, incomplete history, unverified original recording times, public-procurement domain and payment-plan deadline semantics limit interpretation. This is not external validation of the existing EUR forest and does not test reminders. No finance-review participation is claimed.
