"""
Reusable UI components: coupon badges, accent bars, feature bars, T&C text.
"""
from __future__ import annotations

from typing import List, Optional, Tuple

from PIL import Image, ImageDraw

from .core import Color, FontRegistry, WHITE, BLACK, TRANSPARENT
from .text import TextRenderer


class Components:
    """High-level, reusable design components for marketing templates."""

    # ── Coupon badge ("Use Code: RAYNOW") ────────────────────────────

    @staticmethod
    def coupon_badge(
        canvas: Image.Image,
        position: Tuple[int, int],
        code: str,
        label: str = "Use Code:",
        label_bg: Color = (234, 88, 12),          # orange
        code_bg: Color = (255, 255, 255),
        label_text_color: Color = WHITE,
        code_text_color: Color = (30, 41, 59),     # slate-800
        font_name: str = "montserrat-bold",
        font_size: int = 28,
        height: int = 52,
        radius: int = 6,
        gap: int = 0,
        border: Optional[Tuple[int, Color]] = None,
    ) -> Tuple[int, int]:
        """Draw a two-part coupon badge. Returns (total_width, height)."""
        draw = ImageDraw.Draw(canvas)
        label_font = FontRegistry.get(font_name, font_size)
        code_font = FontRegistry.get("montserrat-extrabold", round(font_size * 1.1))

        pad_x = round(height * 0.45)
        pad_y = round((height - font_size) / 2)

        # Measure
        lw, _ = TextRenderer.measure(label, label_font)
        cw, _ = TextRenderer.measure(code, code_font)

        label_box_w = lw + pad_x * 2
        code_box_w = cw + pad_x * 2

        x, y = position

        # Label box (left pill)
        draw.rounded_rectangle(
            [x, y, x + label_box_w, y + height],
            radius=radius,
            fill=_rgba(label_bg),
        )
        draw.text(
            (x + pad_x, y + pad_y),
            label,
            fill=_rgba(label_text_color),
            font=label_font,
        )

        # Code box (right pill)
        cx = x + label_box_w + gap
        code_fill = _rgba(code_bg)
        draw.rounded_rectangle(
            [cx, y, cx + code_box_w, y + height],
            radius=radius,
            fill=code_fill,
        )
        if border:
            draw.rounded_rectangle(
                [cx, y, cx + code_box_w, y + height],
                radius=radius,
                outline=_rgba(border[1]),
                width=border[0],
            )
        draw.text(
            (cx + pad_x, y + pad_y),
            code,
            fill=_rgba(code_text_color),
            font=code_font,
        )

        total_w = label_box_w + gap + code_box_w
        return (total_w, height)

    # ── Accent bars (colored short lines) ────────────────────────────

    @staticmethod
    def accent_bars(
        canvas: Image.Image,
        position: Tuple[int, int],
        colors: List[Color],
        bar_width: int = 40,
        bar_height: int = 4,
        gap: int = 6,
    ) -> int:
        """Draw short horizontal accent bars. Returns total width."""
        draw = ImageDraw.Draw(canvas)
        x, y = position
        for i, color in enumerate(colors):
            bx = x + i * (bar_width + gap)
            draw.rectangle(
                [bx, y, bx + bar_width, y + bar_height],
                fill=_rgba(color),
            )
        return len(colors) * bar_width + (len(colors) - 1) * gap

    # ── Underline accent ─────────────────────────────────────────────

    @staticmethod
    def underline(
        canvas: Image.Image,
        position: Tuple[int, int],
        width: int,
        color: Color = (234, 88, 12),
        thickness: int = 4,
    ) -> None:
        draw = ImageDraw.Draw(canvas)
        x, y = position
        draw.rectangle([x, y, x + width, y + thickness], fill=_rgba(color))

    # ── T&C text ─────────────────────────────────────────────────────

    @staticmethod
    def tc_text(
        canvas: Image.Image,
        text: str = "*T&C apply",
        position: Optional[Tuple[int, int]] = None,
        color: Color = (255, 255, 255, 180),
        font_size: int = 16,
    ) -> None:
        """Draw small T&C disclaimer, default bottom-right."""
        font = FontRegistry.get("montserrat", font_size)
        if position is None:
            w, h = canvas.size
            tw, th = TextRenderer.measure(text, font)
            position = (w - tw - 30, h - th - 20)
        TextRenderer.draw(canvas, position, text, font, color=color)

    # ── Feature bar (bottom bar with icon columns) ───────────────────

    @staticmethod
    def feature_bar(
        canvas: Image.Image,
        y: int,
        features: List[dict],
        bg_color: Color = (20, 33, 61),
        text_color: Color = WHITE,
        divider_color: Color = (60, 75, 100),
        height: int = 180,
        font_size: int = 14,
        icon_font_size: int = 28,
    ) -> None:
        """Draw a bottom feature bar with columns.

        Each feature: ``{"icon": "...", "text": "Line 1\\nLine 2"}``.
        Icons can be Unicode characters or emoji.
        """
        w = canvas.width
        n = len(features)
        if n == 0:
            return

        draw = ImageDraw.Draw(canvas)

        # Background
        draw.rectangle([0, y, w, y + height], fill=_rgba(bg_color))

        col_w = w // n
        text_font = FontRegistry.get("montserrat", font_size)
        icon_font = FontRegistry.get("montserrat", icon_font_size)
        dc = _rgba(divider_color)

        for i, feat in enumerate(features):
            cx = i * col_w + col_w // 2

            # Icon (centered)
            icon = feat.get("icon", "")
            if icon:
                iw, ih = TextRenderer.measure(icon, icon_font)
                draw.text(
                    (cx - iw // 2, y + 30),
                    icon,
                    fill=_rgba(text_color),
                    font=icon_font,
                )

            # Text (centered, multiline)
            txt = feat.get("text", "")
            if txt:
                lines = txt.split("\n")
                line_y = y + 75
                for line in lines:
                    lw, lh = TextRenderer.measure(line.strip(), text_font)
                    draw.text(
                        (cx - lw // 2, line_y),
                        line.strip(),
                        fill=_rgba(text_color),
                        font=text_font,
                    )
                    line_y += lh + 6

            # Divider (except last)
            if i < n - 1:
                div_x = (i + 1) * col_w
                draw.line(
                    [(div_x, y + 20), (div_x, y + height - 20)],
                    fill=dc,
                    width=1,
                )

    # ── Logo placement ───────────────────────────────────────────────

    @staticmethod
    def place_logo(
        canvas: Image.Image,
        logo_path: str,
        position: Tuple[int, int],
        max_height: int = 60,
        max_width: int = 200,
    ) -> None:
        """Load and place a brand logo, maintaining aspect ratio."""
        try:
            logo = Image.open(logo_path).convert("RGBA")
        except (FileNotFoundError, OSError):
            return

        # Scale to fit within max dimensions
        ratio = min(max_width / logo.width, max_height / logo.height)
        nw = round(logo.width * ratio)
        nh = round(logo.height * ratio)
        logo = logo.resize((nw, nh), Image.LANCZOS)
        canvas.alpha_composite(logo, position)

    @staticmethod
    def place_logo_centered(
        canvas: Image.Image,
        logo_path: str,
        y: int,
        max_height: int = 55,
        max_width: int = 190,
    ) -> None:
        """Place logo horizontally centered at *y*."""
        try:
            logo = Image.open(logo_path).convert("RGBA")
        except (FileNotFoundError, OSError):
            return

        ratio = min(max_width / logo.width, max_height / logo.height)
        nw = round(logo.width * ratio)
        nh = round(logo.height * ratio)
        logo = logo.resize((nw, nh), Image.LANCZOS)
        x = (canvas.width - nw) // 2
        canvas.alpha_composite(logo, (x, y))

    # ── Circular icon placeholder ────────────────────────────────────

    @staticmethod
    def icon_circle(
        canvas: Image.Image,
        center: Tuple[int, int],
        radius: int = 22,
        fill: Color = (255, 255, 255, 40),
        border_color: Color = WHITE,
        border_width: int = 2,
        icon_char: str = "",
        icon_color: Color = WHITE,
        icon_font_size: int = 20,
    ) -> None:
        """Draw a circular icon with optional character inside."""
        draw = ImageDraw.Draw(canvas)
        cx, cy = center
        draw.ellipse(
            [cx - radius, cy - radius, cx + radius, cy + radius],
            fill=_rgba(fill),
            outline=_rgba(border_color),
            width=border_width,
        )
        if icon_char:
            font = FontRegistry.get("montserrat", icon_font_size)
            iw, ih = TextRenderer.measure(icon_char, font)
            draw.text(
                (cx - iw // 2, cy - ih // 2),
                icon_char,
                fill=_rgba(icon_color),
                font=font,
            )


# ── Internal ─────────────────────────────────────────────────────────


def _rgba(c) -> Tuple[int, int, int, int]:
    c = tuple(c)  # handle JSON lists
    if len(c) == 4:
        return c  # type: ignore[return-value]
    return c + (255,)  # type: ignore[return-value]
