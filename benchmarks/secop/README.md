# SECOP II — separate public-data benchmark

This is an additional experiment on actual published administrative payment records. It is **not** validation of the frozen seven-feature EUR FinRisk forest, and it is **not** a finance pilot. No finance reviewer or experimental participant is claimed.

Source and licence: [Colombia Compra Eficiente — SECOP II Plan de pagos](https://www.datos.gov.co/Estad-sticas-Nacionales/SECOP-II-Plan-de-pagos/uymx-8p3j), [official metadata](https://www.datos.gov.co/api/views/uymx-8p3j.json), [CC BY-SA 4.0 and attribution](LICENSE-DATA.md). Retain these credits when reusing the snapshot or report. Software remains separately MIT licensed.

## Scope and protocol

Fetched 24 November 2026: 12,000 source records marked `Pagado`, with nonempty due and actual-payment dates, in default API order. This is a convenience sample, not a random or representative sample. The exact query, retrieval time and snapshot SHA-256 are in `snapshot-2026-11-24/source.json`. No personal names or individual identity fields were requested. The initially retrieved response included invoice amount; that field was discarded without interpretation. No amounts or currencies are retained in the committed snapshot. Only pseudonymous record/payer keys, dates and payment state remain.

Select issuance in 2023, valid issue/due/settlement chronology, terms 0–180 calendar days and settlement before April 2024. Remove all occurrences of duplicate composite IDs instead of choosing an arbitrary version. Normalize dates to calendar days. Outcome: actual payment day later than published payment due day. This is the deadline in the payment plan; a finance owner has not confirmed that it is the contractual invoice deadline.

Of 12,000 records, 6 duplicate-ID rows and 10,821 invalid/out-of-window rows were removed. 1,173 remained. Training is January–August (662 rows); validation September–October (177); final test November–December (245, 99 late). Another 89 records were purged because their payment outcome was not available before the training or validation cutoff. Test payers recur: 168 payer entities across 245 rows.

Six inputs: payment term, month, weekday, previous settled-record count, historical late rate and mean nonnegative delay over all previous settled records. History uses only settlements strictly before the issue day. No payer IDs, future payments, outcomes, monetary values, invented credit utilisation or synthetic substitutes are model features. Absence of sample history is represented by count zero and zero-valued history features; this candidate's approach is separate from the frozen demo's manual cold-start lane.

The source lacks reliable original recording/availability timestamps and correction history. A settlement-date filter therefore does not prove audited point-in-time availability. History is incomplete because the source sample is capped and excludes unpaid records. Payer entity here is the public purchaser; this differs from customers of one Belgian seller.

Fixed candidate: Random Forest, 220 trees, depth 6, minimum leaf 20, seed 42. Logistic regression and prior-only baseline; fixed classification threshold 0.5. No test-driven parameter search or refitting. Shorter-term and historical-late-rate ranking rules are included. The historical rule uses training prevalence when sample history is absent. Same chronological partitions for every comparison.

## Measured result

| Model / rule | Test ROC-AUC | Late found in top 10 |
|---|---:|---:|
| Public-data forest candidate | 0.850 | 10 |
| Logistic regression | 0.825 | 8 |
| Prior-only baseline | 0.500 | 6 |
| Historical late-rate rule | 0.687 | 4 |
| Shorter-payment-term rule | 0.841 | 9 |

The shorter-term rule comes very close to the forest. The small AUC difference is not established as meaningful: no payer-cluster confidence interval or significance test was performed. At zero-day deadlines, the source target and payment term can be closely related; this needs a domain review before using the signal operationally. High scores may reflect administrative conventions and sample selection.

Top 10 is drawn from one historical test pool, not ten new daily interventions. The prior baseline ties every score; its top-10 count follows the fixed chronological/record-key order and is not evidence of discrimination. No cash amount, benefit of reminders, ROI or causal result is estimated. Only paid, completed source records are represented; generalisation to unpaid, partial, disputed or cancelled invoices is unsupported.

## Reproduce

```sh
make restore
python -m scripts.benchmark_secop
```

The benchmark checks the committed snapshot hash before fitting. It writes `benchmarks/secop/report.json`. Locked Python dependencies are in requirements-lock.txt. Network access is unnecessary for reproduction. To deliberately fetch a new snapshot, choose a new output directory with `python -m scripts.fetch_secop --output /PRIVATE/new-public-snapshot`; review source licence/metadata again and do not silently replace this frozen evidence. A new live fetch can return different records as the administrative source changes.

For a genuine corporate validation and intervention study, use [the pilot kit](../../docs/pilot/README.md). A completed backtest on a public convenience sample is not a completed pilot.
