# FinRisk AI 1.1 — public showcase verification

## What changed

The site can now run as a GitHub Pages project site with no Python service. `scripts/export_browser.py` exports the saved sklearn forest: all 220 trees, child indices, feature indices, exact float64 thresholds, leaf probabilities, distinct-row counts and impurity. The browser converts inputs with `Math.fround`, follows real branches and averages all tree probabilities. The Python/FastAPI implementation remains available for local use.

A Dutch/English explorer shows the actual path through any tree, other-branch row counts, a stepper, play/pause, editable input values, all 220 per-tree estimates and the forest mean. The tree-to-tree spread is not presented as a confidence interval. Displayed cutoffs are rounded for legibility; branch routing uses the exact exported threshold.

## Verification evidence

Local results: **24 Python tests, 2 portable-engine tests and 14 desktop/mobile static-site tests passed**. The first GitHub quality workflow and Pages deployment both completed successfully: [Pages run](https://github.com/phlppgdfry/finrisk-ai/actions/runs/43749101446), [quality run](https://github.com/phlppgdfry/finrisk-ai/actions/runs/43749101454). Public URL: https://phlppgdfry.github.io/finrisk-ai/.

- Python lint and 24 model/API tests pass.
- Two portable-engine tests check 824 Python oracle predictions plus real-leaf termination and mean aggregation. Maximum observed absolute prediction difference: 2.220446049250313e-16. Cases include the 64 portfolio invoices, 400 independent examples and values on/near split thresholds.
- A dedicated static-site Playwright configuration tests without the Python API. It covers desktop and mobile: existing invoice/search/export/scenario/CSV/model workflows, all six pages, and the actual tree explorer, language switch, profile update, tree selection and playback.
- The original v2 publication workflow retrained on each publication. From release v1.2.0 it restores the checksum-verified fixed release, exports matching artifacts, checks parity and browser behavior before uploading Pages.
- Relative Vite asset paths are used below `/finrisk-ai/`; all model/document/CSV URLs use the same base path. Source links target the real repository.
- On the static site, CSV scoring remains entirely within browser memory. No inference API, private record upload or third-party model service is used.

## Design review

The native CUA adapter failed in the previous session and is now unavailable. The shared Playwright browser is the fallback. Generated references and actual browser renders were opened with `view_image` at the same desktop viewport (1536 × 1024); mobile views are inspected at 390 × 844.

Working design references:

- `docs/design-v2-overview.png`
- `docs/design-v2-learning.png`

Actual renders:

- `docs/v2-overview-desktop.png`
- `docs/v2-learning-desktop.png`
- mobile and published-site screenshots alongside them

| Comparison | Implementation and intentional adaptation |
|---|---|
| Palette | White canvas, forest green text/action panels, lime branches and actions, pale green tree canvas |
| Typography | Editorial serif headings, deliberately sized sans-serif controls; hero wraps to two lines to preserve room for art |
| Composition | Existing sidebar, image-led intro, four metrics, histogram + forest animation, invoice table retained |
| Asset | Built-in Image Gen produced a clean glass tree sculpture; a separate production asset is used rather than rasterising app controls |
| Tables and controls | Existing search, sorting, filters, exports and details remain real interactions |
| Explainability canvas | Real trees have up to 12 splits; the selected path scrolls instead of inventing a short three-level example |
| Translation | Dutch is the initial explanation language; English toggle is available; data and controls update from the same state |
| Motion | Code-native tree connectors and node animation plus stepwise playback; CSS respects reduced-motion preference |
| Responsive | Panels stack; navigation and tree canvas scroll internally; mobile export visibility and selected-node scaling/scrolling regressions were corrected |

Above-the-fold copy review: the main headline, subtitle and two hero actions match the new brief. Differences from the generated concept are recorded here: original brand mark retained, real invoice names/amounts/dates retained, actual model numbers substituted, slim source/export utility bar retained, actual model's deep paths replace illustrative shallow branches. The art is an AI-generated metaphor and is described as such in its alternative text. No invented performance, customers or causal claims were added.

This faithfully applies the reference's visual system and product hierarchy, with these explicit functional adaptations. It is not a pixel-for-pixel reproduction. No unresolved material layout or interaction issue was observed at the checked sizes.

## Asset provenance and prompt

Built-in Image Gen created the two 1536 × 1024 interface concepts and `frontend/public/images/forest-glass.png`. Production asset brief: a high-end studio photograph of a translucent forest-green glass decision-tree sculpture, frosted nodes, small lime endpoints, true white background, delicate shadows, no text/people/logos/money/watermark. The full working prompts also specified the existing six-page product structure, real risk histogram and direct tree inspection. No external runtime image API or secret is needed.

## Limits

All records remain synthetic. The browser export demonstrates portable inference; it is not real-data model validation. No real business pilot, financial return, calibration improvement or causal treatment benefit is claimed. Safari/Firefox and a formal accessibility audit are outside the executed test scope. Production backend hardening remains a separate task.
