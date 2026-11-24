"""Explicit freeze/restore of a trusted local release. Publishing never trains."""

import argparse
import hashlib
import json
import re
import shutil
from invoice_risk.data import ROOT

FILES = [
    "artifacts/model.joblib",
    "artifacts/report.json",
    "artifacts/browser-fixtures.json",
    "artifacts/training-data.csv",
    "frontend/public/data/forest.json",
    "frontend/public/data/report.json",
    "frontend/public/data/portfolio.json",
    "frontend/public/data/portfolio.csv",
    "frontend/public/data/sample.csv",
    "frontend/public/data/operations.json",
]


def freeze(version):
    if not re.fullmatch(r"v\d+\.\d+\.\d+", version):
        raise ValueError("Use a semantic release ID, e.g. v1.2.0")
    target = ROOT / "releases" / version
    if target.exists():
        raise ValueError("Immutable release already exists")
    for name in FILES:
        if not (ROOT / name).is_file():
            raise ValueError("Missing artifact: " + name)
    report = json.loads((ROOT / "artifacts/report.json").read_text())
    for name, key in [
        ("artifacts/model.joblib", "model_sha256"),
        ("artifacts/training-data.csv", "data_sha256"),
    ]:
        if hashlib.sha256((ROOT / name).read_bytes()).hexdigest() != report[key]:
            raise ValueError("Candidate/report mismatch: " + name)
    target.mkdir(parents=True)
    hashes = {}
    for name in FILES:
        dest = target / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / name, dest)
        hashes[name] = hashlib.sha256(dest.read_bytes()).hexdigest()
    manifest = {
        "release": version,
        "files": hashes,
        "training": "synthetic seed 42",
        "model_version": json.loads((ROOT / "artifacts/report.json").read_text())["version"],
    }
    (target / "manifest.json").write_text(json.dumps(manifest, indent=2))
    (ROOT / "releases/current.json").write_text(json.dumps({"release": version}, indent=2))


def restore():
    version = json.loads((ROOT / "releases/current.json").read_text())["release"]
    if not re.fullmatch(r"v\d+\.\d+\.\d+", version):
        raise ValueError("Invalid release pointer")
    target = ROOT / "releases" / version
    manifest = json.loads((target / "manifest.json").read_text())
    if manifest.get("release") != version or set(manifest["files"]) != set(FILES):
        raise ValueError("Invalid release manifest")
    for name, expected in manifest["files"].items():
        if hashlib.sha256((target / name).read_bytes()).hexdigest() != expected:
            raise ValueError("Release integrity failure: " + name)
    for name in FILES:
        (ROOT / name).parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(target / name, ROOT / name)
    public = ROOT / "frontend/public/data/release.json"
    public.write_text(json.dumps(manifest, indent=2))
    print("Restored verified immutable release " + version)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("action", choices=["freeze", "restore"])
    parser.add_argument("--version")
    args = parser.parse_args()
    if args.action == "freeze":
        freeze(args.version or "")
    else:
        restore()
