# Decision evaluation update — 22 November 2026

Reuses the established panels, palette and responsive tables; no replacement visual system.

- Added deterministic capacity ranking for 5, 10, 20, 50 and 100 records, comparing forest, logistic regression, amount and history rules.
- Scores select records before outcomes are used. Stable tie-breaking preserves source ordering.
- Shows precision, recall, true/false alerts, lift and indicative 95% Wilson intervals. Random selection is an analytical expectation, not a cherry-picked random seed.
- Capacity 10 was specified before inspecting test results. Other displayed capacities are exploratory. No deployed policy is modified.
- Local test top-10 outcomes: forest 9/10, logistic 10/10, highest amount 4/10, history 10/10. Do not infer universal superiority from ten observations or synthetic data.
- Expanded real-tree explanation and structural comparison from actual export data. 220 is a configured parameter, not a validated optimal number.
- Added local authorised-data admission/evaluation command, with tests for duplicate IDs, future features and unmatured labels. This command is not evidence that any real dataset has been validated.
- Source review: docs/REAL_DATA.md. Genuine external invoice validation remains pending receipt of an authorised, compatible dataset.
