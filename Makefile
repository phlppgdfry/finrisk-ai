PYTHON ?= .venv/bin/python
.PHONY: setup train build test check run package benchmark
setup:
	python3.13 -m venv .venv
	.venv/bin/pip install -r requirements-lock.txt
	npm --prefix frontend ci
train:
	$(PYTHON) -m invoice_risk.train
	$(PYTHON) -m scripts.report
	$(PYTHON) -m scripts.export_browser
build:
	npm --prefix frontend run build
test:
	$(PYTHON) -m pytest -q
check:
	.venv/bin/ruff check invoice_risk tests scripts
	$(PYTHON) -m pytest -q
	npm --prefix frontend run check
run:
	$(PYTHON) -m uvicorn invoice_risk.api:app --host 127.0.0.1 --port 8011
package:
	$(PYTHON) -m scripts.report
	$(PYTHON) -m scripts.package
benchmark:
	$(PYTHON) -m scripts.benchmark

.PHONY: pages
pages:
	$(PYTHON) -m scripts.export_browser
	npm --prefix frontend run test:parity
	npm --prefix frontend run build:pages
