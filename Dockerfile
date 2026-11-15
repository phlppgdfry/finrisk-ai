FROM node:22-bookworm-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM python:3.13-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 OPENBLAS_NUM_THREADS=1
WORKDIR /app
COPY requirements-lock.txt ./
RUN pip install --no-cache-dir -r requirements-lock.txt
COPY . .
COPY --from=frontend /app/frontend/dist ./frontend/dist
RUN python -m invoice_risk.train && python -m scripts.report && python -m scripts.export_browser && cp -r frontend/public/data frontend/public/reading frontend/dist/ && python -m scripts.package \
    && useradd --create-home --uid 10001 finrisk && chown -R finrisk:finrisk /app
USER finrisk
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/health',timeout=3)"
CMD ["uvicorn", "invoice_risk.api:app", "--host", "0.0.0.0", "--port", "8000"]
