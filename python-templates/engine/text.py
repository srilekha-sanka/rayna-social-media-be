"""
Advanced text rendering: shadows, outlines, gradient fills, auto-sizing.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Optional, Tuple

from PIL import Image, ImageDraw, ImageFilter, ImageFont

from .core import Color, FontRegistry, WHITE, BLACK


# ── Config dataclasses ───────────────────────────────────────────────


@dataclass
class ShadowCfg:
    offset: Tuple[int, int] = (4, 4)
    blur: int = 8
    color: Color = (0, 0, 0, 120)


@dataclass
class OutlineCfg:
    width: int = 3
    color: Color = BLACK


@dataclass
class GradientTextCfg:
    top_color: Color = (255, 215, 0)      # gold
    bottom_color: Color = (184, 134, 11)   # dark-gold


# ── Text Renderer ────────────────────────────────────────────────────


class TextRenderer:
    """Stateless helper for rendering text onto Pillow images."""

    # ── Measurement ──────────────────────────────────────────────────

    @staticmethod
    def measure(
        text: str, font: ImageFont.FreeTypeFont
    ) -> Tuple[int, int]:
        """Return (width, height) of *text* rendered with *font*."""
        bbox = font.getbbox(text)
        return bbox[2] - bbox[0], bbox[3] - bbox[1]

    @staticmethod
    def measure_multiline(
        text: str, font: ImageFont.FreeTypeFont, spacing: int = 4
    ) -> Tuple[int, int]:
        tmp = Image.new("RGBA", (1, 1))
        draw = ImageDraw.Draw(tmp)
        bbox = draw.multiline_textbbox((0, 0), text, font=font, spacing=spacing)
        return bbox[2] - bbox[0], bbox[3] - bbox[1]

    @staticmethod
    def fit_font_size(
        text: str,
        font_name: str,
        max_width: int,
        max_size: int = 200,
        min_size: int = 16,
    ) -> ImageFont.FreeTypeFont:
        """Binary-search for the largest font size that fits *max_width*."""
        lo, hi, best = min_size, max_size, min_size
        while lo <= hi:
            mid = (lo + hi) // 2
            f = FontRegistry.get(font_name, mid)
            w, _ = TextRenderer.measure(text, f)
            if w <= max_width:
                best = mid
                lo = mid + 1
            else:
                hi = mid - 1
        return FontRegistry.get(font_name, best)

    # ── Basic draw ───────────────────────────────────────────────────

    @staticmethod
    def draw(
        canvas: Image.Image,
        xy: Tuple[int, int],
        text: str,
        font: ImageFont.FreeTypeFont,
        color: Color = WHITE,
        anchor: str = "lt",
        shadow: Optional[ShadowCfg] = None,
        outline: Optional[OutlineCfg] = None,
    ) -> None:
        """Render text with optional shadow and/or outline."""
        draw = ImageDraw.Draw(canvas)

        if shadow:
            _draw_shadow_text(canvas, xy, text, font, shadow, anchor)

        if outline:
            ox, oy = xy
            ow = outline.width
            for dx in range(-ow, ow + 1):
                for dy in range(-ow, ow + 1):
                    if dx * dx + dy * dy <= ow * ow:
                        draw.text(
                            (ox + dx, oy + dy),
                            text,
                            fill=outline.color,
                            font=font,
                            anchor=anchor,
                        )

        draw.text(xy, text, fill=color, font=font, anchor=anchor)

    # ── Multiline ────────────────────────────────────────────────────

    @staticmethod
    def draw_multiline(
        canvas: Image.Image,
        xy: Tuple[int, int],
        text: str,
        font: ImageFont.FreeTypeFont,
        color: Color = WHITE,
        spacing: int = 8,
        align: str = "left",
        anchor: str = "la",
        shadow: Optional[ShadowCfg] = None,
    ) -> None:
        draw = ImageDraw.Draw(canvas)
        if shadow:
            _draw_shadow_multiline(canvas, xy, text, font, shadow, spacing, align, anchor)
        draw.multiline_text(
            xy, text, fill=color, font=font, spacing=spacing,
            align=align, anchor=anchor,
        )

    # ── Gradient text ────────────────────────────────────────────────

    @staticmethod
    def draw_gradient_text(
        canvas: Image.Image,
        xy: Tuple[int, int],
        text: str,
        font: ImageFont.FreeTypeFont,
        gradient: GradientTextCfg,
        anchor: str = "lt",
        shadow: Optional[ShadowCfg] = None,
    ) -> None:
        """Render text filled with a vertical gradient."""
        w, h = TextRenderer.measure(text, font)
        if w <= 0 or h <= 0:
            return

        # Render text as white-on-black mask
        mask_img = Image.new("L", (w + 20, h + 20), 0)
        mask_draw = ImageDraw.Draw(mask_img)
        mask_draw.text((10, 10), text, fill=255, font=font)

        # Build gradient fill
        grad = Image.new("RGBA", mask_img.size)
        tc = gradient.top_color + (255,) if len(gradient.top_color) == 3 else gradient.top_color
        bc = gradient.bottom_color + (255,) if len(gradient.bottom_color) == 3 else gradient.bottom_color
        for y in range(grad.height):
            t = y / max(grad.height - 1, 1)
            r = round(tc[0] + (bc[0] - tc[0]) * t)
            g = round(tc[1] + (bc[1] - tc[1]) * t)
            b = round(tc[2] + (bc[2] - tc[2]) * t)
            a = round(tc[3] + (bc[3] - tc[3]) * t)
            for x in range(grad.width):
                grad.putpixel((x, y), (r, g, b, a))

        # Apply mask
        grad.putalpha(mask_img)

        if shadow:
            _draw_shadow_text(canvas, xy, text, font, shadow, anchor)

        # Resolve anchor offset
        ox, oy = _resolve_anchor_offset(xy, w, h, anchor)
        canvas.alpha_composite(grad, (ox - 10, oy - 10))

    # ── Word-wrap ────────────────────────────────────────────────────

    @staticmethod
    def word_wrap(
        text: str, font: ImageFont.FreeTypeFont, max_width: int
    ) -> str:
        """Break *text* into lines that fit within *max_width* pixels."""
        words = text.split()
        lines: list[str] = []
        current: list[str] = []

        for word in words:
            test_line = " ".join(current + [word])
            w, _ = TextRenderer.measure(test_line, font)
            if w > max_width and current:
                lines.append(" ".join(current))
                current = [word]
            else:
                current.append(word)

        if current:
            lines.append(" ".join(current))

        return "\n".join(lines)


# ── Private helpers ──────────────────────────────────────────────────


def _resolve_anchor_offset(
    xy: Tuple[int, int], w: int, h: int, anchor: str
) -> Tuple[int, int]:
    """Approximate Pillow anchor semantics for compositing."""
    x, y = xy
    ha = anchor[0] if len(anchor) >= 1 else "l"
    va = anchor[1] if len(anchor) >= 2 else "t"

    if ha == "m":
        x -= w // 2
    elif ha == "r":
        x -= w

    if va == "m":
        y -= h // 2
    elif va in ("b", "d"):
        y -= h
    elif va == "a":
        # ascender — roughly 80% of height
        y -= round(h * 0.8)

    return x, y


def _draw_shadow_text(
    canvas: Image.Image,
    xy: Tuple[int, int],
    text: str,
    font: ImageFont.FreeTypeFont,
    shadow: ShadowCfg,
    anchor: str,
) -> None:
    w, h = TextRenderer.measure(text, font)
    pad = shadow.blur * 3
    shadow_layer = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow_layer)
    sd.text((pad, pad), text, fill=shadow.color, font=font)
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(shadow.blur))

    ox, oy = _resolve_anchor_offset(xy, w, h, anchor)
    sx = ox + shadow.offset[0] - pad
    sy = oy + shadow.offset[1] - pad
    canvas.alpha_composite(shadow_layer, (sx, sy))


def _draw_shadow_multiline(
    canvas: Image.Image,
    xy: Tuple[int, int],
    text: str,
    font: ImageFont.FreeTypeFont,
    shadow: ShadowCfg,
    spacing: int,
    align: str,
    anchor: str,
) -> None:
    w, h = TextRenderer.measure_multiline(text, font, spacing)
    pad = shadow.blur * 3
    shadow_layer = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow_layer)
    sd.multiline_text(
        (pad, pad), text, fill=shadow.color, font=font,
        spacing=spacing, align=align,
    )
    shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(shadow.blur))

    ox, oy = _resolve_anchor_offset(xy, w, h, anchor)
    sx = ox + shadow.offset[0] - pad
    sy = oy + shadow.offset[1] - pad
    canvas.alpha_composite(shadow_layer, (sx, sy))
