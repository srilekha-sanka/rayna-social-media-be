"""
Core engine: base template class, font registry, dimension constants.
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Tuple, Union

from PIL import Image, ImageFont

# ── Paths ────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
ASSETS_DIR = PROJECT_ROOT / "assets"
FONTS_DIR = ASSETS_DIR / "fonts"
OUTPUT_DIR = PROJECT_ROOT / "scripts" / "output"

# ── Color type ───────────────────────────────────────────────────────

Color = Union[Tuple[int, int, int], Tuple[int, int, int, int]]

WHITE: Color = (255, 255, 255)
BLACK: Color = (0, 0, 0)
TRANSPARENT: Color = (0, 0, 0, 0)

# ── Dimensions ───────────────────────────────────────────────────────


@dataclass(frozen=True)
class Dimensions:
    width: int
    height: int

    @property
    def size(self) -> Tuple[int, int]:
        return (self.width, self.height)


INSTAGRAM = {
    "4:5": Dimensions(1080, 1350),
    "1:1": Dimensions(1080, 1080),
    "1.91:1": Dimensions(1080, 566),
}

# ── Font Registry ────────────────────────────────────────────────────


class FontRegistry:
    """Loads and caches TrueType / OpenType fonts from assets/fonts/.

    Variable fonts (Montserrat, Dancing Script) support weight variants
    via named aliases like ``montserrat-bold``, ``montserrat-black``.
    """

    _cache: dict[Tuple[str, int], ImageFont.FreeTypeFont] = {}

    # (file, weight)  — weight 0 means "leave as default / not variable"
    _FONT_DEFS: dict[str, Tuple[str, int]] = {
        # Montserrat variable: wght 100-900
        "montserrat":           ("Montserrat.ttf", 400),
        "montserrat-medium":    ("Montserrat.ttf", 500),
        "montserrat-semibold":  ("Montserrat.ttf", 600),
        "montserrat-bold":      ("Montserrat.ttf", 700),
        "montserrat-extrabold": ("Montserrat.ttf", 800),
        "montserrat-black":     ("Montserrat.ttf", 900),
        # Dancing Script variable: wght 400-700
        "dancing-script":       ("DancingScript-Variable.ttf", 400),
        "dancing-script-bold":  ("DancingScript-Variable.ttf", 700),
        # Static fonts
        "bebas":                ("BebasNeue-Regular.ttf", 0),
        "playfair":             ("PlayfairDisplay.ttf", 0),
        "great-vibes":          ("GreatVibes-Regular.ttf", 0),
        "allura":               ("Allura-Regular.ttf", 0),
        "oswald":               ("Oswald-Bold.ttf", 0),
        "kaushan":              ("KaushanScript-Regular.ttf", 0),
        "playlist":             ("Playlist-Script.otf", 0),
        "cormorant":            ("CormorantGaramond-Regular.ttf", 0),
        "cormorant-italic":     ("CormorantGaramond-Italic.ttf", 0),
        "brittany":             ("BrittanySignature.ttf", 0),
    }

    @classmethod
    def get(cls, name: str, size: int) -> ImageFont.FreeTypeFont:
        key = (name, size)
        cached = cls._cache.get(key)
        if cached is not None:
            return cached

        defn = cls._FONT_DEFS.get(name)
        if not defn:
            raise ValueError(
                f"Unknown font: {name!r}. Available: {sorted(cls._FONT_DEFS)}"
            )
        filename, weight = defn
        path = FONTS_DIR / filename
        if not path.exists():
            raise FileNotFoundError(f"Font file missing: {path}")

        font = ImageFont.truetype(str(path), size)

        # Apply variable-font weight axis if specified
        if weight > 0:
            try:
                font.set_variation_by_axes([float(weight)])
            except Exception:
                pass  # Not variable or axis unavailable — use default

        cls._cache[key] = font
        return font

    @classmethod
    def clear(cls) -> None:
        cls._cache.clear()


# ── Base Template ────────────────────────────────────────────────────


class BaseTemplate(ABC):
    """Abstract base for all Pillow design templates.

    Subclasses implement ``render()`` to produce a final RGBA image.
    The base class provides font access, dimension helpers, and
    image-loading utilities that every template needs.
    """

    def __init__(self, dims: Dimensions = INSTAGRAM["4:5"]) -> None:
        self.dims = dims
        self.w = dims.width
        self.h = dims.height

    # ── Canvas ───────────────────────────────────────────────────────

    def canvas(self, color: Color = TRANSPARENT) -> Image.Image:
        return Image.new("RGBA", self.dims.size, color)

    # ── Helpers ──────────────────────────────────────────────────────

    def font(self, name: str, size: int) -> ImageFont.FreeTypeFont:
        return FontRegistry.get(name, size)

    def px(self, frac: float, axis: str = "w") -> int:
        """Convert a 0..1 fraction to pixels on the given axis."""
        return round((self.w if axis == "w" else self.h) * frac)

    def load_image(
        self, path: str, size: Optional[Tuple[int, int]] = None
    ) -> Image.Image:
        img = Image.open(path).convert("RGBA")
        if size:
            img = img.resize(size, Image.LANCZOS)
        return img

    def cover_crop(
        self, img: Image.Image, tw: int, th: int
    ) -> Image.Image:
        """Center-crop ``img`` to cover *tw* x *th*, then resize."""
        sr = img.width / img.height
        tr = tw / th
        if sr > tr:
            nw = round(img.height * tr)
            off = (img.width - nw) // 2
            img = img.crop((off, 0, off + nw, img.height))
        else:
            nh = round(img.width / tr)
            off = (img.height - nh) // 2
            img = img.crop((0, off, img.width, off + nh))
        return img.resize((tw, th), Image.LANCZOS)

    # ── Abstract ─────────────────────────────────────────────────────

    @abstractmethod
    def render(
        self, config: dict, base_image: Optional[Image.Image] = None
    ) -> Image.Image:
        ...

    def render_to_bytes(
        self,
        config: dict,
        base_image: Optional[Image.Image] = None,
        fmt: str = "PNG",
    ) -> bytes:
        from io import BytesIO

        img = self.render(config, base_image)
        buf = BytesIO()
        save_kwargs: dict = {"format": fmt}
        if fmt.upper() == "JPEG":
            img = img.convert("RGB")
            save_kwargs["quality"] = 95
        img.save(buf, **save_kwargs)
        return buf.getvalue()
