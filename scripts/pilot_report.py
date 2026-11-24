"""Local pilot JSON analysis; never uploads customer rows."""

import argparse
import json
from pathlib import Path
from invoice_risk.pilot import summarize

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("--seed", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if args.input.resolve() == args.output.resolve():
        raise ValueError("Output must differ from input")
    args.output.write_text(json.dumps(summarize(json.loads(args.input.read_text()), args.seed), indent=2))
    print("Wrote descriptive aggregate pilot report; no causal effect established")
