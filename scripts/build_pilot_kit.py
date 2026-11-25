"""Public template kit only; no customer data or outcomes are packaged."""

import zipfile
from invoice_risk.data import ROOT

FILES = [
    "README.md",
    "finance-review.md",
    "contact-routes.md",
    "pilot-request-nl.txt",
    "cohort-template.csv",
    "action-log-template.csv",
    "receipts-template.csv",
]


def build():
    target = ROOT / "frontend/public/reading/finrisk-pilot-kit.zip"
    target.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(target, "w", zipfile.ZIP_DEFLATED) as archive:
        for name in FILES:
            archive.write(ROOT / "docs/pilot" / name, "finrisk-pilot-kit/" + name)
    return target


if __name__ == "__main__":
    print(build())
