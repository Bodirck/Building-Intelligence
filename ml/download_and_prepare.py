"""
SDNET2018 Data Pipeline — download, clean, structure, and split for crack detection.

DATASET
-------
SDNET2018 is a publicly labeled image dataset of ~56,000 cracked and non-cracked
concrete surface images (256x256 px, JPEG) created at Utah State University (USU).

  Title : SDNET2018: A concrete crack image dataset for machine learning applications
  DOI   : 10.15142/T3TD19
  URL   : https://digitalcommons.usu.edu/all_datasets/48

ARCHIVE STRUCTURE (after extraction)
-------------------------------------
Three top-level folders by surface type:
  D/  — bridge Decks
  P/  — Pavements
  W/  — Walls

Each contains two subfolders following the C*/U* convention:
  D/CD  — Cracked Decks       D/UD  — Uncracked Decks
  P/CP  — Cracked Pavements   P/UP  — Uncracked Pavements
  W/CW  — Cracked Walls       W/UW  — Uncracked Walls

Folders whose names start with C -> label "crack"
Folders whose names start with U -> label "uncracked"

SOURCES
-------
  Primary   : USU DigitalCommons (DOI above) — direct file link varies by mirror
  Kaggle    : aniruddhsharma/structural-defects-network-concrete-crack-images
              (downloadable via `kaggle datasets download -d aniruddhsharma/...`)

EXAMPLE INVOCATIONS
-------------------
# Use an already-downloaded zip (most common reviewer flow):
  python ml/download_and_prepare.py --source local --zip path/to/SDNET2018.zip

# Use an already-extracted raw directory:
  python ml/download_and_prepare.py --source local --raw-dir ml/data/raw

# Download via Kaggle CLI (requires kaggle.json configured):
  python ml/download_and_prepare.py --source kaggle

# Auto-attempt download, fall back with instructions:
  python ml/download_and_prepare.py --source auto

# Fast subset (500 images per class) with custom val split:
  python ml/download_and_prepare.py --zip path/to/SDNET2018.zip --sample-per-class 500 --val-split 0.2

# Re-run and overwrite existing outputs:
  python ml/download_and_prepare.py --zip path/to/SDNET2018.zip --force
"""

import argparse
import csv
import hashlib
import json
import os
import random
import shutil
import subprocess
import sys
import urllib.request
import zipfile
from pathlib import Path

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# NOTE: USU DigitalCommons does not expose a stable direct-download link for
# the full archive; the landing page and DOI are the reliable entry points.
# If you have a direct mirror URL, pass it via --url.
DATASET_DOI = "10.15142/T3TD19"
DATASET_LANDING_PAGE = "https://digitalcommons.usu.edu/all_datasets/48"
DEFAULT_URL = DATASET_LANDING_PAGE  # Not a direct binary link — see NOTES below.

KAGGLE_DATASET = "aniruddhsharma/structural-defects-network-concrete-crack-images"

# C* -> crack, U* -> uncracked
LABEL_MAP = {"C": "crack", "U": "uncracked"}

STRUCTURE_MAP = {"D": "deck", "P": "pavement", "W": "wall"}

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif"}


# ---------------------------------------------------------------------------
# Path resolution
# ---------------------------------------------------------------------------

def resolve_paths(args):
    """
    Compute absolute paths for raw and processed directories relative to the
    repo root (parent of the ml/ folder that contains this script).
    All paths are resolved via pathlib so they are OS-agnostic.
    """
    script_dir = Path(__file__).resolve().parent          # .../ml/
    repo_root  = script_dir.parent                        # .../Building Intelligence/

    raw_dir = (
        Path(args.raw_dir).resolve()
        if args.raw_dir
        else repo_root / "ml" / "data" / "raw"
    )
    out_dir = (
        Path(args.out_dir).resolve()
        if args.out_dir
        else repo_root / "ml" / "data" / "processed"
    )
    return raw_dir, out_dir


# ---------------------------------------------------------------------------
# Acquisition
# ---------------------------------------------------------------------------

def _print_manual_instructions():
    print()
    print("  Manual download instructions:")
    print(f"    1. Visit the dataset landing page: {DATASET_LANDING_PAGE}")
    print(f"    2. DOI: {DATASET_DOI}")
    print(f"    3. Or use the Kaggle mirror:  kaggle datasets download -d {KAGGLE_DATASET}")
    print("    4. Once you have the zip, re-run with: --zip path/to/SDNET2018.zip")
    print()


def acquire(args, raw_dir):
    """
    Resolve and return the path to the raw extracted directory.
    Depending on --source, this may download and/or extract an archive first.
    Returns raw_dir (Path) after ensuring data is present.
    """
    source = args.source

    if source == "local":
        if args.zip:
            _extract(Path(args.zip), raw_dir, force=args.force)
        else:
            print(f"[acquire] Using pre-extracted raw directory: {raw_dir}")
            if not raw_dir.exists():
                print(f"  ERROR: --raw-dir does not exist: {raw_dir}")
                sys.exit(1)
        return raw_dir

    if source == "zip":
        if not args.zip:
            print("ERROR: --source zip requires --zip PATH")
            sys.exit(1)
        _extract(Path(args.zip), raw_dir, force=args.force)
        return raw_dir

    if source == "kaggle":
        _kaggle_download(raw_dir, force=args.force)
        return raw_dir

    # source == "url" or "auto"
    url = args.url or DEFAULT_URL
    if url == DATASET_LANDING_PAGE:
        print(
            "[acquire] WARNING: DEFAULT_URL points to the landing page, not a direct binary.\n"
            "  A direct download URL was not embedded in this script because USU DigitalCommons\n"
            "  does not expose a stable programmatic download link.\n"
            "  Attempting anyway — this will likely yield an HTML page, not a zip."
        )
    downloaded_zip = raw_dir.parent / "SDNET2018_download.zip"
    raw_dir.parent.mkdir(parents=True, exist_ok=True)
    if downloaded_zip.exists() and not args.force:
        print(f"[acquire] Found cached download: {downloaded_zip} (use --force to re-download)")
    else:
        print(f"[acquire] Downloading from: {url}")
        try:
            _download_url(url, downloaded_zip)
        except Exception as exc:
            print(f"  ERROR: Download failed — {exc}")
            _print_manual_instructions()
            sys.exit(1)
    _extract(downloaded_zip, raw_dir, force=args.force)
    return raw_dir


def _download_url(url, dest_path):
    """Stream-download url to dest_path with a progress indicator."""
    with urllib.request.urlopen(url, timeout=60) as response:
        total = response.headers.get("Content-Length")
        total = int(total) if total else None
        downloaded = 0
        chunk = 65536
        with open(dest_path, "wb") as fout:
            while True:
                data = response.read(chunk)
                if not data:
                    break
                fout.write(data)
                downloaded += len(data)
                if total:
                    pct = downloaded * 100 // total
                    print(f"\r  {pct}% ({downloaded // 1024 // 1024} MB / {total // 1024 // 1024} MB)", end="", flush=True)
    print()


def _kaggle_download(raw_dir, force=False):
    """Download dataset via the kaggle CLI into raw_dir."""
    kaggle_bin = shutil.which("kaggle")
    if not kaggle_bin:
        print("ERROR: kaggle CLI not found on PATH.")
        print(f"  Install with: pip install kaggle")
        print(f"  Then configure ~/.kaggle/kaggle.json with your API key.")
        _print_manual_instructions()
        sys.exit(1)
    raw_dir.mkdir(parents=True, exist_ok=True)
    cmd = [
        kaggle_bin, "datasets", "download",
        "-d", KAGGLE_DATASET,
        "-p", str(raw_dir),
        "--unzip",
    ]
    if force:
        cmd.append("--force")
    print(f"[acquire] Running: {' '.join(cmd)}")
    result = subprocess.run(cmd)
    if result.returncode != 0:
        print("ERROR: kaggle download failed.")
        _print_manual_instructions()
        sys.exit(1)


def _extract(zip_path, raw_dir, force=False):
    """Extract a zip archive into raw_dir."""
    zip_path = Path(zip_path)
    if not zip_path.exists():
        print(f"ERROR: zip file not found: {zip_path}")
        sys.exit(1)
    if raw_dir.exists() and any(raw_dir.iterdir()) and not force:
        print(f"[extract] Raw directory already populated: {raw_dir} (use --force to re-extract)")
        return
    raw_dir.mkdir(parents=True, exist_ok=True)
    print(f"[extract] Extracting {zip_path} -> {raw_dir} ...")
    with zipfile.ZipFile(zip_path, "r") as zf:
        zf.extractall(raw_dir)
    print(f"[extract] Done.")


# ---------------------------------------------------------------------------
# Cleaning and indexing
# ---------------------------------------------------------------------------

def _sha1(path):
    h = hashlib.sha1()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(65536), b""):
            h.update(block)
    return h.hexdigest()


def _is_valid_image(path):
    """Return True if file looks like a valid, non-empty image."""
    if path.suffix.lower() not in IMAGE_EXTENSIONS:
        return False
    if path.stat().st_size == 0:
        return False
    # If Pillow is available, do a header verification.
    try:
        from PIL import Image
        with Image.open(path) as img:
            img.verify()
        return True
    except ImportError:
        return True  # Pillow not available; trust extension + size check.
    except Exception:
        return False


def _infer_label_and_type(subfolder_name, parent_folder_name):
    """
    Given a subfolder like 'CD', 'UD', 'CP', 'UP', 'CW', 'UW',
    return (label, structure_type).
    """
    first = subfolder_name[0].upper() if subfolder_name else ""
    label = LABEL_MAP.get(first, "unknown")
    struct_char = parent_folder_name.upper()
    structure_type = STRUCTURE_MAP.get(struct_char, "unknown")
    return label, structure_type


def clean_and_index(raw_dir):
    """
    Walk raw_dir, validate images, deduplicate by SHA-1, and return a list of
    record dicts: {path, label, structure_type, source_relpath, sha1}.
    Also prints counts of kept/skipped/duplicates.
    """
    print(f"\n[clean] Scanning {raw_dir} ...")
    seen_hashes = {}
    records = []
    skipped_invalid = 0
    skipped_dup = 0

    # Expected layout: raw_dir/{D,P,W}/{CD,UD,CP,UP,CW,UW}/*.jpg
    # We search flexibly by walking all .jpg files and inferring label from path.
    for img_path in sorted(raw_dir.rglob("*")):
        if not img_path.is_file():
            continue
        if img_path.suffix.lower() not in IMAGE_EXTENSIONS:
            skipped_invalid += 1
            continue

        if not _is_valid_image(img_path):
            print(f"  SKIP invalid/corrupt: {img_path.name}")
            skipped_invalid += 1
            continue

        sha = _sha1(img_path)
        if sha in seen_hashes:
            skipped_dup += 1
            continue
        seen_hashes[sha] = img_path

        # Infer label from path components
        parts = img_path.relative_to(raw_dir).parts
        label = "unknown"
        structure_type = "unknown"
        if len(parts) >= 2:
            subfolder = parts[-2]          # e.g. "CD", "UD"
            parent_folder = parts[-3] if len(parts) >= 3 else subfolder[1:]
            label, structure_type = _infer_label_and_type(subfolder, parent_folder)
        elif len(parts) == 2:
            subfolder = parts[0]
            label, structure_type = _infer_label_and_type(subfolder, "")

        records.append({
            "path": img_path,
            "label": label,
            "structure_type": structure_type,
            "source_relpath": str(img_path.relative_to(raw_dir)),
            "sha1": sha,
        })

    total = len(records) + skipped_invalid + skipped_dup
    print(f"[clean] Total files found : {total}")
    print(f"[clean] Kept              : {len(records)}")
    print(f"[clean] Skipped (invalid) : {skipped_invalid}")
    print(f"[clean] Skipped (dup hash): {skipped_dup}")

    unknown_count = sum(1 for r in records if r["label"] == "unknown")
    if unknown_count:
        print(f"[clean] WARNING: {unknown_count} images with unknown label (check folder structure)")

    return records


# ---------------------------------------------------------------------------
# Splitting
# ---------------------------------------------------------------------------

def split(records, val_split, seed, sample_per_class):
    """
    Deterministic stratified train/val split per (label, structure_type).
    Optionally caps each (label, structure_type) group at sample_per_class.
    Returns list of records with 'split' key added.
    """
    print(f"\n[split] Splitting: val_split={val_split}, seed={seed}, sample_per_class={sample_per_class}")
    rng = random.Random(seed)

    # Group by (label, structure_type)
    groups = {}
    for rec in records:
        key = (rec["label"], rec["structure_type"])
        groups.setdefault(key, []).append(rec)

    result = []
    for key, group in sorted(groups.items()):
        rng.shuffle(group)
        if sample_per_class and len(group) > sample_per_class:
            group = group[:sample_per_class]
        n_val = max(1, round(len(group) * val_split))
        n_train = len(group) - n_val
        for i, rec in enumerate(group):
            rec = dict(rec)
            rec["split"] = "val" if i < n_val else "train"
            result.append(rec)
        print(f"  {key[0]}/{key[1]}: total={len(group)} train={n_train} val={n_val}")

    return result


# ---------------------------------------------------------------------------
# Materialization
# ---------------------------------------------------------------------------

def materialize(records, out_dir, force=False):
    """
    Copy image files to out_dir/{split}/{label}/ preserving duplicates by
    appending SHA1 prefix when filenames collide.
    """
    print(f"\n[materialize] Writing to {out_dir} ...")
    # Track dest filename -> source to detect collisions
    dest_counts = {}
    copied = 0
    for rec in records:
        dest_folder = out_dir / rec["split"] / rec["label"]
        dest_folder.mkdir(parents=True, exist_ok=True)
        src = rec["path"]
        stem = src.stem
        ext = src.suffix
        candidate = dest_folder / f"{stem}{ext}"
        # Avoid name collisions: prefix with first 8 chars of sha1
        if candidate.exists():
            candidate = dest_folder / f"{stem}_{rec['sha1'][:8]}{ext}"
        rec["filepath"] = str(candidate.relative_to(out_dir))
        if not candidate.exists() or force:
            shutil.copy2(src, candidate)
            copied += 1
        else:
            rec["filepath"] = str(candidate.relative_to(out_dir))
    print(f"[materialize] Copied {copied} files.")
    return records


# ---------------------------------------------------------------------------
# Manifest & summary
# ---------------------------------------------------------------------------

def write_manifest(records, out_dir):
    """Write out_dir/manifest.csv."""
    csv_path = out_dir / "manifest.csv"
    fieldnames = ["filepath", "split", "label", "structure_type", "source_relpath", "sha1"]
    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for rec in records:
            writer.writerow({k: rec.get(k, "") for k in fieldnames})
    print(f"[manifest] Written: {csv_path}")


def write_summary(records, out_dir, run_params):
    """Write out_dir/summary.json with counts and run parameters."""
    counts = {}
    for rec in records:
        split = rec["split"]
        label = rec["label"]
        st = rec["structure_type"]
        counts.setdefault(split, {}).setdefault(label, {}).setdefault(st, 0)
        counts[split][label][st] += 1

    summary = {"run_params": run_params, "counts": counts}
    json_path = out_dir / "summary.json"
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, default=str)
    print(f"[summary] Written: {json_path}")


# ---------------------------------------------------------------------------
# Idempotency check
# ---------------------------------------------------------------------------

def is_already_done(out_dir):
    manifest = out_dir / "manifest.csv"
    summary = out_dir / "summary.json"
    return manifest.exists() and summary.exists()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args():
    parser = argparse.ArgumentParser(
        description="SDNET2018 data pipeline: download, clean, split, and structure crack images.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            "  python ml/download_and_prepare.py --zip path/to/SDNET2018.zip\n"
            "  python ml/download_and_prepare.py --source local --raw-dir ml/data/raw\n"
            "  python ml/download_and_prepare.py --source kaggle --sample-per-class 500\n"
        ),
    )
    parser.add_argument(
        "--source",
        choices=["auto", "url", "kaggle", "local", "zip"],
        default="auto",
        help="Acquisition strategy (default: auto).",
    )
    parser.add_argument(
        "--url",
        default=None,
        help="Override direct download URL (used with --source url or auto).",
    )
    parser.add_argument(
        "--zip",
        default=None,
        metavar="PATH",
        help="Path to an already-downloaded zip archive.",
    )
    parser.add_argument(
        "--raw-dir",
        default=None,
        metavar="PATH",
        help="Where to extract raw data (default: ml/data/raw relative to repo root).",
    )
    parser.add_argument(
        "--out-dir",
        default=None,
        metavar="PATH",
        help="Processed output directory (default: ml/data/processed).",
    )
    parser.add_argument(
        "--val-split",
        type=float,
        default=0.15,
        help="Fraction of data for validation (default: 0.15).",
    )
    parser.add_argument(
        "--sample-per-class",
        type=int,
        default=None,
        metavar="INT",
        help="Cap images per (label, structure_type) group for a fast subset run.",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for reproducible splits (default: 42).",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-extract and re-split even if outputs already exist.",
    )
    return parser.parse_args()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    args = parse_args()

    # If --zip is provided and source is still "auto", treat it as "zip".
    if args.zip and args.source == "auto":
        args.source = "zip"

    print("=" * 60)
    print("SDNET2018 Data Pipeline")
    print(f"  Source   : {args.source}")
    print(f"  Val split: {args.val_split}")
    print(f"  Seed     : {args.seed}")
    print(f"  Sample   : {args.sample_per_class or 'all'}")
    print("=" * 60)

    raw_dir, out_dir = resolve_paths(args)
    print(f"[paths] Raw dir : {raw_dir}")
    print(f"[paths] Out dir : {out_dir}")

    # Idempotency guard
    if is_already_done(out_dir) and not args.force:
        print(
            f"\n[skip] Output already exists at {out_dir}.\n"
            "  Use --force to re-run."
        )
        sys.exit(0)

    # Step 1: Acquire (download / extract)
    print("\n--- Step 1: Acquire ---")
    acquire(args, raw_dir)

    # Step 2: Clean and index
    print("\n--- Step 2: Clean and index ---")
    records = clean_and_index(raw_dir)
    if not records:
        print("ERROR: No valid images found in raw directory.")
        _print_manual_instructions()
        sys.exit(1)

    # Step 3: Split
    print("\n--- Step 3: Stratified split ---")
    records = split(records, args.val_split, args.seed, args.sample_per_class)

    # Step 4: Materialize
    print("\n--- Step 4: Materialize ---")
    records = materialize(records, out_dir, force=args.force)

    # Step 5: Write manifest and summary
    print("\n--- Step 5: Write manifest and summary ---")
    write_manifest(records, out_dir)
    run_params = {
        "source": args.source,
        "val_split": args.val_split,
        "seed": args.seed,
        "sample_per_class": args.sample_per_class,
        "raw_dir": str(raw_dir),
        "out_dir": str(out_dir),
    }
    write_summary(records, out_dir, run_params)

    total = len(records)
    n_train = sum(1 for r in records if r["split"] == "train")
    n_val = sum(1 for r in records if r["split"] == "val")
    print("\n" + "=" * 60)
    print("Pipeline complete.")
    print(f"  Total images : {total}")
    print(f"  Train        : {n_train}")
    print(f"  Val          : {n_val}")
    print(f"  Output dir   : {out_dir}")
    print("=" * 60)


if __name__ == "__main__":
    main()
