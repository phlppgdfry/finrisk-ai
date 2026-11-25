"""Register or analyse a pilot locally; never publish participant data."""

import argparse
import json
from pathlib import Path
from invoice_risk.pilot_workspace import register, report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    subs = parser.add_subparsers(dest="action", required=True)
    init = subs.add_parser("register")
    init.add_argument("--cohort", type=Path, required=True)
    init.add_argument("--workspace", type=Path, required=True)
    for flag in ["owner", "rights", "source", "seed", "start"]:
        init.add_argument("--" + flag, required=True)
    analyse = subs.add_parser("report")
    analyse.add_argument("--workspace", type=Path, required=True)
    analyse.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.action == "register":
        register(
            args.cohort,
            args.workspace,
            owner=args.owner,
            rights=args.rights,
            source=args.source,
            seed=args.seed,
            start=args.start,
        )
        print("Registered local cohort; outcomes are blank. No results or benefit claimed.")
    else:
        if args.output.resolve().is_relative_to(args.workspace.resolve()):
            raise ValueError("Write aggregate outside workspace to preserve source files")
        args.output.write_text(json.dumps(report(args.workspace), indent=2))
        print("Wrote descriptive aggregate; no causal claim")


if __name__ == "__main__":
    main()
