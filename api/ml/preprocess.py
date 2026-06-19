"""Image loading / feature helpers shared by the baseline and the trained model."""
from __future__ import annotations

import io

import numpy as np
from PIL import Image, ImageFilter


def load_gray(image_bytes: bytes, size: int = 256) -> Image.Image:
    """Decode to a square grayscale image (EXIF-agnostic)."""
    return Image.open(io.BytesIO(image_bytes)).convert("L").resize((size, size))


def load_rgb(image_bytes: bytes, size: int = 224) -> Image.Image:
    """Decode to a square RGB image for the CNN."""
    return Image.open(io.BytesIO(image_bytes)).convert("RGB").resize((size, size))


def black_hat(gray: Image.Image, size: int = 7) -> np.ndarray:
    """Morphological black-hat: closing(g) - g. Highlights dark, thin features
    (cracks) against a lighter background. A mild Gaussian blur first suppresses
    pixel noise (which would otherwise survive the morphology) while leaving real
    crack lines intact. Uses PIL's Max/Min filters so no SciPy is needed. Returns a
    float array in 0..255."""
    g = gray.filter(ImageFilter.GaussianBlur(1.0))
    closed = g.filter(ImageFilter.MaxFilter(size)).filter(ImageFilter.MinFilter(size))
    return np.asarray(closed, dtype=np.float32) - np.asarray(g, dtype=np.float32)
