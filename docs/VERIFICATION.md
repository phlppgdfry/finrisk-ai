# Verification and design review

**Historical record for version 1.0. For the public 1.1 showcase, see [V2_VERIFICATION.md](V2_VERIFICATION.md).**

Verified locally on 15 November 2026. This file distinguishes executed checks from supplied deployment configuration.

## Executed checks

| Check | Result |
|---|---|
| Model training | Completed on Python 3.13; 7,200 rows; seed 42 |
| Python lint | Ruff passed |
| Python/API/model suite | 24 passed on macOS; 24 passed inside Linux container |
| Frontend | TypeScript check and Vite production build passed |
| Automated browser suite | 12 passed: 6 desktop + 6 mobile Chromium |
| Browser console | No errors or warnings in the inspected showcase session |
| Desktop inspection | 1487 × 1058 viewport, matching the concept's native width and height |
| Mobile inspection | 390 × 844 screenshot review; automated iPhone 13-sized Chromium tests |
| Page overflow | All five pages fit the mobile document width; wide tables scroll inside their container |
| Docker | Multi-stage image built successfully; model/API tests passed as non-root with read-only Compose filesystem |
| Source package | ZIP CRC check, model/UI presence and environment-file exclusions passed |
| Local API benchmark | 50 warm requests, 5 warmups, concurrency 1: p50 28.72 ms, p95 38.58 ms |

Benchmark scope: loopback HTTP on this Mac, including eight model inference batches per prediction request for the score and reference substitutions. It is not a production load test. See `artifacts/benchmark.json`.

Tests cover input domains, non-finite values, future-field rejection, history consistency, chronological split isolation, deterministic data, score consistency, validation-only threshold selection, checksums, batch limits and exports. Browser tests cover seeded-decimal submission, prediction comparisons, stale-input warnings, model-policy exploration/reset, search, empty state, risk filters, sorting, modal keyboard dismissal, CSV scoring/rejection/download, portfolio download and heading/overflow checks.

One upstream dependency deprecation warning remains: Starlette TestClient references AnyIO's deprecated BlockingPortal alias. It does not affect test outcomes. Playwright's terminal colour environment warning is cosmetic.

## Actual model evidence

The saved local forest achieves ROC-AUC 0.79798, average precision 0.67279, recall 0.85714 and precision 0.42857 on 1,440 synthetic test rows at validation-selected threshold 0.19. Logistic regression achieves ROC-AUC 0.81018. The UI explicitly states that the simpler model wins. No attempt was made to hide this result or tune against the final test set.

Container training produced a slightly different AUC (~0.79801) due to platform-specific numerical behaviour. The README rounds to three decimals; exact provenance and metrics are regenerated inside the container.

## Browser method

The native CUA/Chrome adapter was attempted first. Creating a tab failed twice with an adapter error concerning `timeoutMs`, including when using the documented direct tab API. The connected Playwright browser was used as the fallback for visual inspection and interaction testing. A separate repository Playwright Test suite provides repeatable automated checks.

The generated design concept and final desktop/mobile screenshots were both opened with `view_image`. Screenshots are actual browser renders, not the generated concept presented as a working application.

## Design comparison ledger

Working concept: `docs/design-concept.png` (1487 × 1058), generated with the built-in Image Gen tool. Final screenshots: `docs/dashboard-desktop.png`, `docs/dashboard-viewport.png`, `docs/dashboard-mobile.png`, and the scenario/model/case-study screenshots in this directory.

| Comparison point | Concept evidence | Implemented evidence and decision |
|---|---|---|
| Palette | Forest green navigation/CTA, lime action, white panels, pale gray page | Same palette roles; no stock imagery or replacement gradient |
| Typography | Editorial serif headings with sans-serif controls | Georgia headings, Arial interface; explicit sizing throughout; increased table/form label sizes after review |
| Primary composition | Left navigation, four metrics, chart + dark action panel, full-width invoice table | Preserved. Added slim functional API/readiness bar and compact provenance footer |
| Container model | Restrained bordered panels, unboxed metrics, table-driven workflow | Preserved; no replacement card grid for invoices |
| Table and interactions | Search, bands and inspect action | Real search, band filters, sorting and per-row accessible inspect actions; selection checkbox/footer replaced with direct row inspection |
| Data and copy | Generated placeholder values and illustrative invoices | Replaced with computed euros, 64 scored invoices, actual AUC and risk bands. Removed overdue labels because scoring happens at issuance |
| Chart | Five risk-probability bins | Same five-bin structure, actual counts, accessible description and labelled axes |
| Responsive layout | Desktop reference | Mobile stacks metrics/panels, horizontally scrolls navigation and table, keeps form fields usable; all pages fit document width |
| Icon treatment | Consistent outlined navigation/action icons | Consistent lucide icons; code-native SVG chart and bar-mark wordmark |

Above-the-fold copy review: primary heading, subtitle, metric names, chart heading, action heading and primary action retain the brief. Intentional changes: actual metric values, explanatory policy notes, shorter action-panel text that makes no causal claim, API/readiness bar, project credit and dataset disclosure. All additions support an actual interaction or correct the meaning of the model. No unaccounted copy drift remains.

This is a faithful implementation of the concept's visual system and information hierarchy, with the explicit functional and truthfulness adaptations above. It is not claimed to be a pixel-for-pixel clone of the generated screenshot. No remaining material layout, clipped-content, overflow or interaction issue was observed at the checked sizes.

### Material issues fixed

1. Native HTML number-input steps blocked a real seeded invoice's decimal amount and ratios. Steps now match source precision; the seeded-invoice-to-scenario route is regression-tested.
2. A clipped accessible table label extended the mobile page's scroll width. Its positioning was corrected; all five pages now pass document-width checks.
3. Initial table and form labels were too small on desktop. Sizes and row density were adjusted before final screenshots.
4. Test expectations were corrected to compare rendered confusion counts consistently and to use the actual alphabetical customer ordering. These were test assumptions, not suppressed product errors.
5. Validation errors now omit raw invalid values and exception contexts so non-standard NaN payloads produce JSON-safe 422 responses.

## Design prompt and assets

Built-in Image Gen prompt: a complete desktop FinRisk AI invoice-payment-risk workbench with a 220 px sidebar, Overview/Invoices/Scenario lab/Model report/Case study navigation, a serif main heading, four live-value metrics, a five-bin histogram beside a forest-green scenario CTA, and a full-width searchable invoice table. Pale gray background, white panels, forest green #174f3b, lime #d7ee9c; practical responsive React UI; no photos, fabricated claims or marketing hero.

The concept is a design reference only. All shipped navigation, text, controls, charts, tables and model results are code-native. No runtime image-generation API or credential is required.

## Remaining boundaries

The public repository and GitHub Pages site are published at phlppgdfry/finrisk-ai. New changes are gated by CI and the Pages workflow. Chrome/Chromium was tested; Safari and Firefox were not. No automated accessibility conformance audit was performed. Docker build and in-container tests do not replace load/security testing or real-data evaluation. All financial records are synthetic.

## Operational release v1.2.0 — 24 November 2026

Local checks: 38 Python tests passed, Ruff and TypeScript passed, 824 Python/browser predictions matched (maximum absolute error 2.22e-16), 18 static-site and 18 local API-backed browser tests passed across desktop Chromium and mobile Chromium emulation. Coverage includes dated-ledger history reconstruction and rejection of plausible but mismatched aggregates, unknown settlement status, partials/credits, customer cooldown, capacity, release corruption/overwrite rejection, daily page controls and responsive width. The model, original synthetic training CSV and evaluation report fingerprints agree.

No real-data validation or reminder-effect measurement was performed. A local validator and descriptive pilot reporter are tools for that future work; their existence is not evidence of successful finance deployment. Safari/Firefox and actual mobile hardware were not tested in this update.

## Recruiter demo and public benchmark — 25 November 2026

43 Python checks passed, including full pilot-cohort admission, blank/future-window rejection, protocol tampering, missing participants and strictly earlier settlement history. Static and local API-backed websites: 20 desktop/mobile browser checks passed for each, including actual video metadata/playback and pilot ZIP download. TypeScript, Ruff and 824 Python/browser reference predictions passed.

The silent 69.68-second H.264 video is 1440×810 at 25 fps and under 1 MB. Real browser actions, the same invoice in the dashboard/tree, a separate caption strip and actual release v1.2.0 synthetic predictions. Contact sheets and an enlarged tree frame were reviewed; the tree segment was re-recorded for visibility. Poster is a frame from the video. No fabricated UI, voice, music or customer records.

The public-data benchmark is reproducible offline from the committed CC BY-SA snapshot. Snapshot and pipeline SHA-256 are checked. The final 245-row test is separate from the synthetic demo; no corporate validation, finance reviewer, reminder effect, clustered significance test or production deployment is claimed. See benchmarks/secop for exclusions and sampling/availability limits. The shorter-term rule nearly matches the forest.
