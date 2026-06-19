"""Crack classifier.

Two backends behind one interface:
- a trained MobileNetV3-Small (loaded from MODEL_PATH if present — produced by
  ml/train.py on SDNET2018), used for the crack / no-crack probability;
- a dependency-light classical-CV baseline (black-hat morphology) that runs out of
  the box with no dataset and no training.

Either way we derive regions of interest and crack features (orientation, estimated
width, location) from the black-hat response — these feed the LLM defect sheet."""
from __future__ import annotations

import math
import time

import numpy as np

from api.config import MODEL_PATH
from api.ml.preprocess import black_hat, load_gray, load_rgb

BASELINE_NAME = "baseline-heuristic"
MODEL_NAME = "mobilenet_v3_small"

# Black-hat response above this (0..255) counts as a crack pixel (post-denoise).
CRACK_THRESHOLD = 16.0


def _sigmoid(x: float) -> float:
    return 1.0 / (1.0 + math.exp(-x))


def _clamp(x: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, x))


class CrackClassifier:
    def __init__(self) -> None:
        self._torch = None
        self._model = None
        self._transform = None
        self.model_name = BASELINE_NAME
        self._try_load_model()

    def _try_load_model(self) -> None:
        """Load the trained CNN if weights exist and torch is installed; otherwise
        stay on the baseline. Never raises — a bad model must not break the API."""
        if not MODEL_PATH.exists():
            return
        try:
            import torch
            from torchvision import models, transforms

            net = models.mobilenet_v3_small(weights=None)
            in_features = net.classifier[-1].in_features
            net.classifier[-1] = torch.nn.Linear(in_features, 2)
            state = torch.load(str(MODEL_PATH), map_location="cpu")
            net.load_state_dict(state)
            net.eval()

            self._torch = torch
            self._model = net
            self._transform = transforms.Compose(
                [
                    transforms.ToTensor(),
                    transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
                ]
            )
            self.model_name = MODEL_NAME
        except Exception:
            self._model = None
            self.model_name = BASELINE_NAME

    @property
    def provider(self) -> str:
        return self.model_name

    def predict(self, image_bytes: bytes) -> dict:
        t0 = time.perf_counter()
        gray = load_gray(image_bytes, 256)
        bh = black_hat(gray, 7)
        mask = bh > CRACK_THRESHOLD
        coverage = float(mask.mean())

        if self._model is not None:
            crack_prob = self._model_prob(image_bytes)
        else:
            crack_prob = self._baseline_prob(coverage, self._linearity(mask))

        label = "crack" if crack_prob >= 0.5 else "uncracked"
        confidence = crack_prob if label == "crack" else 1.0 - crack_prob
        regions, features = self._regions_and_features(bh, mask)
        if label == "uncracked":
            regions = []

        return {
            "label": label,
            "confidence": round(float(confidence), 3),
            "crack_probability": round(float(crack_prob), 3),
            "model": self.model_name,
            "inference_ms": max(1, int((time.perf_counter() - t0) * 1000)),
            "regions": regions,
            "features": features,
        }

    def _baseline_prob(self, coverage: float, linearity: float) -> float:
        # Cracks are elongated dark lines: they need both enough crack-pixel coverage
        # AND spatial linearity. Scattered speckle (high coverage, low linearity) is
        # gated down so textured-but-sound concrete stays below 0.5.
        cov_term = _sigmoid(0.30 * (coverage * 1000.0) - 2.0)
        lin_gate = _clamp((linearity - 0.20) / 0.5)
        return _clamp(cov_term * (0.45 + 0.55 * lin_gate))

    @staticmethod
    def _linearity(mask: np.ndarray) -> float:
        """Anisotropy of the crack-pixel cloud, 0 (isotropic speckle) .. 1 (a line)."""
        ys, xs = np.nonzero(mask)
        if xs.size < 30:
            return 0.0
        cx, cy = float(xs.mean()), float(ys.mean())
        cov = np.cov(np.vstack([xs - cx, ys - cy]))
        if not np.all(np.isfinite(cov)) or cov.shape != (2, 2):
            return 0.0
        evals = np.linalg.eigvalsh(cov)
        lo, hi = float(evals[0]), float(evals[1])
        if hi <= 1e-6:
            return 0.0
        return _clamp((hi - lo) / (hi + lo))

    def _model_prob(self, image_bytes: bytes) -> float:
        img = load_rgb(image_bytes, 224)
        x = self._transform(img).unsqueeze(0)
        with self._torch.no_grad():
            logits = self._model(x)
            probs = self._torch.softmax(logits, dim=1)[0]
        return float(probs[1].item())  # class order [uncracked, crack]

    def _regions_and_features(self, bh: np.ndarray, mask: np.ndarray):
        ys, xs = np.nonzero(mask)
        H, W = mask.shape
        if xs.size < 20:
            return [], {"coverage": round(float(mask.mean()), 4), "orientation_deg": None,
                        "width_px": None, "location": "n/a"}

        x0, x1 = np.percentile(xs, [4, 96])
        y0, y1 = np.percentile(ys, [4, 96])
        bx = _clamp(float(x0) / W)
        by = _clamp(float(y0) / H)
        bw = _clamp(max(0.05, (float(x1) - float(x0)) / W), 0.05, 1.0 - bx)
        bh_box = _clamp(max(0.05, (float(y1) - float(y0)) / H), 0.05, 1.0 - by)
        score = _clamp(float(np.mean(bh[mask])) / 120.0 + 0.4)

        cx, cy = float(xs.mean()), float(ys.mean())
        cov = np.cov(np.vstack([xs - cx, ys - cy]))
        orient = None
        if np.all(np.isfinite(cov)) and cov.shape == (2, 2):
            _, evecs = np.linalg.eigh(cov)
            vx, vy = evecs[:, -1]
            orient = round((math.degrees(math.atan2(vy, vx)) + 180) % 180, 1)

        length = math.hypot(float(x1) - float(x0), float(y1) - float(y0)) + 1e-6
        width_px = round(float(xs.size) / length, 2)
        vert = "top" if (cy / H) < 0.34 else "bottom" if (cy / H) > 0.66 else "mid"
        horiz = "left" if (cx / W) < 0.34 else "right" if (cx / W) > 0.66 else "center"

        regions = [{"x": round(bx, 3), "y": round(by, 3), "w": round(bw, 3),
                    "h": round(bh_box, 3), "score": round(score, 3)}]
        features = {
            "coverage": round(float(mask.mean()), 4),
            "orientation_deg": orient,
            "width_px": width_px,
            "location": f"{vert}-{horiz}",
        }
        return regions, features


# Module-level singleton: the model (if any) is loaded once at import.
classifier = CrackClassifier()
