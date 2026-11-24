"""Create a portable archive with source, local model and built UI; never env files."""

from pathlib import Path
import zipfile
from invoice_risk.data import ROOT


def package():
    out = ROOT / "dist/finrisk-ai-source.zip"
    out.parent.mkdir(exist_ok=True)
    excluded = {
        ".venv",
        "node_modules",
        ".git",
        ".pytest_cache",
        ".ruff_cache",
        "__pycache__",
        ".playwright-mcp",
        "test-results",
        "playwright-report",
    }
    allowed_roots = {"invoice_risk", "scripts", "tests", "frontend", "docs", "artifacts", ".github", "releases"}
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(ROOT.rglob("*")):
            rel = path.relative_to(ROOT)
            if not path.is_file() or any(p in excluded for p in rel.parts):
                continue
            if len(rel.parts) > 1 and rel.parts[0] not in allowed_roots:
                continue
            if path.name.startswith(".env") or path.suffix == ".tsbuildinfo" or path.name == ".DS_Store":
                continue
            if rel.parts[0] == "dist":
                continue
            archive.write(path, Path("finrisk-ai") / rel)
    with zipfile.ZipFile(out) as archive:
        assert archive.testzip() is None
        assert "finrisk-ai/artifacts/model.joblib" in archive.namelist()
        assert "finrisk-ai/frontend/dist/index.html" in archive.namelist()
        assert not any(".venv/" in n or "node_modules/" in n or "/.env" in n for n in archive.namelist())
    print(f"{out} ({out.stat().st_size / 1024 / 1024:.1f} MB); archive verified")
    return out


if __name__ == "__main__":
    package()
