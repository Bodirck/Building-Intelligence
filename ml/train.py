"""Fine-tune MobileNetV3-Small on the prepared SDNET2018 crack/uncracked dataset.

Reads the layout produced by download_and_prepare.py:
    ml/data/processed/{train,val}/{crack,uncracked}/*.jpg
and writes a state_dict to models/crack_mobilenet.pt that api/ml/classifier.py loads.

Class order is fixed to [uncracked, crack] (index 1 == crack) so it matches the API.

Example:
    pip install -r ml/requirements-train.txt
    python ml/train.py --epochs 3 --batch-size 64 --limit 4000

This is an MVP trainer: transfer learning from ImageNet weights, a fresh 2-class
head, light fine-tuning. It is intentionally small and fast, not state of the art.
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_DATA = ROOT / "ml" / "data" / "processed"
DEFAULT_OUT = ROOT / "models" / "crack_mobilenet.pt"


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser(description="Fine-tune MobileNetV3-Small for crack detection.")
    p.add_argument("--data-dir", type=Path, default=DEFAULT_DATA)
    p.add_argument("--out", type=Path, default=DEFAULT_OUT)
    p.add_argument("--epochs", type=int, default=3)
    p.add_argument("--batch-size", type=int, default=64)
    p.add_argument("--lr", type=float, default=3e-4)
    p.add_argument("--limit", type=int, default=None, help="Cap images per split for a fast run.")
    p.add_argument("--device", default="auto", choices=["auto", "cpu", "cuda"])
    p.add_argument("--workers", type=int, default=2)
    return p.parse_args()


def remap_crack_first(dataset) -> None:
    """ImageFolder sorts classes alphabetically (crack=0). Remap so crack=1 to match
    the API's softmax[1] == crack convention."""
    classes = dataset.classes
    new = [(path, 1 if classes[c] == "crack" else 0) for path, c in dataset.samples]
    dataset.samples = new
    dataset.targets = [t for _, t in new]


def maybe_subset(dataset, limit):
    if not limit or limit >= len(dataset.samples):
        return dataset
    import random

    random.Random(42).shuffle(dataset.samples)
    dataset.samples = dataset.samples[:limit]
    dataset.targets = [t for _, t in dataset.samples]
    return dataset


def main() -> None:
    args = parse_args()
    try:
        import torch
        from torch import nn
        from torch.utils.data import DataLoader
        from torchvision import datasets, models, transforms
    except ImportError:
        raise SystemExit(
            "PyTorch/torchvision not installed. Run: pip install -r ml/requirements-train.txt"
        )

    if not (args.data_dir / "train").exists():
        raise SystemExit(
            f"No training data at {args.data_dir/'train'}. "
            "Run: python ml/download_and_prepare.py --zip path/to/SDNET2018.zip"
        )

    device = (
        "cuda" if (args.device == "auto" and torch.cuda.is_available())
        else "cpu" if args.device == "auto" else args.device
    )
    print(f"[train] device={device}  data={args.data_dir}")

    norm = transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
    train_tf = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.ToTensor(),
        norm,
    ])
    eval_tf = transforms.Compose([transforms.Resize((224, 224)), transforms.ToTensor(), norm])

    train_ds = datasets.ImageFolder(str(args.data_dir / "train"), transform=train_tf)
    val_ds = datasets.ImageFolder(str(args.data_dir / "val"), transform=eval_tf)
    for ds in (train_ds, val_ds):
        remap_crack_first(ds)
    maybe_subset(train_ds, args.limit)
    maybe_subset(val_ds, args.limit // 4 if args.limit else None)
    print(f"[train] train={len(train_ds.samples)}  val={len(val_ds.samples)}")

    train_dl = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True, num_workers=args.workers)
    val_dl = DataLoader(val_ds, batch_size=args.batch_size, shuffle=False, num_workers=args.workers)

    net = models.mobilenet_v3_small(weights=models.MobileNet_V3_Small_Weights.DEFAULT)
    in_features = net.classifier[-1].in_features
    net.classifier[-1] = nn.Linear(in_features, 2)
    net = net.to(device)

    opt = torch.optim.Adam(net.parameters(), lr=args.lr)
    loss_fn = nn.CrossEntropyLoss()

    best_acc, best_state, history = 0.0, None, []
    for epoch in range(1, args.epochs + 1):
        net.train()
        t0 = time.time()
        for x, y in train_dl:
            x, y = x.to(device), y.to(device)
            opt.zero_grad()
            loss_fn(net(x), y).backward()
            opt.step()

        net.eval()
        correct = total = 0
        with torch.no_grad():
            for x, y in val_dl:
                x, y = x.to(device), y.to(device)
                pred = net(x).argmax(1)
                correct += int((pred == y).sum())
                total += int(y.numel())
        acc = correct / total if total else 0.0
        history.append({"epoch": epoch, "val_acc": round(acc, 4)})
        print(f"[train] epoch {epoch}/{args.epochs}  val_acc={acc:.4f}  ({time.time()-t0:.0f}s)")
        if acc >= best_acc:
            best_acc = acc
            best_state = {k: v.cpu() for k, v in net.state_dict().items()}

    args.out.parent.mkdir(parents=True, exist_ok=True)
    torch.save(best_state, str(args.out))
    metrics = {"best_val_acc": round(best_acc, 4), "epochs": args.epochs,
               "history": history, "classes": ["uncracked", "crack"]}
    args.out.with_suffix(".metrics.json").write_text(json.dumps(metrics, indent=2))
    print(f"[train] saved {args.out}  best_val_acc={best_acc:.4f}")


if __name__ == "__main__":
    main()
