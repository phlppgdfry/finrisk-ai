# Data contract

Every feature must exist **at invoice issuance**. Prior means completed history available before that invoice. Unknown features are rejected. Outcome fields are not accepted.

| Field | Type / accepted range | Meaning |
|---|---|---|
| amount | finite float, €100–€50,000 | Invoice amount |
| payment_terms | integer, 14–90 days | Agreed issuance-to-due interval |
| customer_tenure | integer, 1–180 months | Trading relationship age |
| prior_invoices | integer, 1–119 | Previously completed invoice count |
| prior_late_rate | finite float, 0–1 | Fraction of completed historical invoices paid late |
| avg_days_late | finite float, 0–90 days | Mean delay among historical late invoices; 0 when none |
| credit_utilisation | finite float, 0–1 | Credit exposure / credit limit at issuance |

If prior_late_rate is zero, avg_days_late must be zero. These are demonstration-domain limits; invoices outside them require new support and validation. This is not a cold-start model. Intermediate terms/rates are accepted even if some values appear infrequently in training; being in range does not guarantee adequate training coverage. The UI presets use observed payment-term categories.

`late` is a training target only. Dates and identifiers are metadata. Actual payment date, collection results, later credit utilisation, days overdue and final realised delay must never enter the issuance-time feature vector.

All demo invoices use a fixed snapshot (15 November 2026); their due dates are snapshot + agreed terms. These are illustrative future due dates, not a live accounts-receivable ledger. Historical test dates are synthetic ordering metadata, with no real label delays or seasonal evolution.

## Batch CSV
Seven exact headers, in any order. 1–250 records. Comma-separated, unquoted numeric cells. No customer names or extra columns. Browser file limit 128 KB; server validates row count and domain. Only numeric data is needed; no private records are required to use the demo.

```csv
amount,payment_terms,customer_tenure,prior_invoices,prior_late_rate,avg_days_late,credit_utilisation
4500,30,24,30,0.35,12,0.7
2200,30,110,95,0.05,3,0.2
```

Output `probability` means estimated late-payment likelihood under the synthetic training distribution, not default. `review` is `probability >= validation-selected threshold`. `risk_band` is fixed display categorisation. The API does not persist uploaded values, send reminders, or mutate the demo portfolio.
