"""Render real browser footage with a separate caption strip. Requires FFmpeg."""

import argparse
import json
from pathlib import Path
import subprocess
from invoice_risk.data import ROOT


def run(*args):
    subprocess.run(["ffmpeg", "-hide_banner", "-y", *map(str, args)], check=True)


def render(folder):
    metadata = json.loads((folder / "capture.json").read_text())
    media = ROOT / "frontend/public/media"
    media.mkdir(parents=True, exist_ok=True)
    run(
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        folder / "captions.txt",
        "-vf",
        "fps=25",
        "-fps_mode",
        "cfr",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-t",
        str(metadata["duration"]),
        folder / "captions-fixed.mp4",
    )
    run(
        "-ss",
        metadata["trim"],
        "-i",
        folder / "capture.webm",
        "-i",
        folder / "captions-fixed.mp4",
        "-filter_complex",
        "[0:v]setpts=PTS-STARTPTS[top];[1:v]setpts=PTS-STARTPTS[bottom];[top][bottom]vstack=inputs=2:shortest=1[out]",
        "-map",
        "[out]",
        "-t",
        metadata["duration"],
        "-r",
        "25",
        "-an",
        "-c:v",
        "libx264",
        "-crf",
        "28",
        "-preset",
        "medium",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        media / "finrisk-demo-nl.mp4",
    )
    run(
        "-ss",
        "2",
        "-i",
        media / "finrisk-demo-nl.mp4",
        "-frames:v",
        "1",
        "-update",
        "1",
        media / "finrisk-demo-poster.jpg",
    )
    run(
        "-i",
        media / "finrisk-demo-nl.mp4",
        "-vf",
        "fps=1/6,scale=480:-1,tile=3x5",
        "-frames:v",
        "1",
        "-update",
        "1",
        folder / "contact-sheet.jpg",
    )
    (ROOT / "docs/demo-capture.json").write_text(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("capture", type=Path)
    args = parser.parse_args()
    render(args.capture)
