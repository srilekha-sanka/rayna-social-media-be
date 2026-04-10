"""
Template: Promo Collage
━━━━━━━━━━━━━━━━━━━━━━
Promotional offer banner with polaroid-style photo collage.
Reference: Rayna Tours 20% OFF banner — striped bg, dark text, accent bars.

Config keys:
    headline        – "Get up to 20% OFF*"
    subheadline     – "on Tours & Attractions"
    coupon_code     – "RAYNOW"
    coupon_label    – "Use Code:" (default)
    photos          – [path1, path2, path3]  (1–4 images for collage)
    logo_path       – brand logo file
    accent_color    – hex or RGB tuple (default orange)
    bg_type         – "gradient" | "image" | "striped" (default striped)
    bg_start_color  – bg color override
    tc_text         – "*T&C apply" (default)
"""
from __future__ import annotations

from typing import Optional

from PIL import Image

from engine.core import BaseTemplate, Dimensions, INSTAGRAM, WHITE, BLACK, TRANSPARENT
from engine.text import TextRenderer, ShadowCfg
from engine.effects import Effects
from engine.components import Components


# ── Default palette ──────────────────────────────────────────────────

NAVY = (15, 30, 60)
DARK_BLUE = (25, 45, 80)
ORANGE = (234, 88, 12)
SLATE = (30, 41, 59)


class PromoCollageTemplate(BaseTemplate):
    """Promotional banner with coupon code + polaroid photo collage."""

    def __init__(self, dims: Dimensions = INSTAGRAM["4:5"]) -> None:
        super().__init__(dims)

    def render(
        self, config: dict, base_image: Optional[Image.Image] = None
    ) -> Image.Image:
        # ── Parse config ─────────────────────────────────────────────
        headline = config.get("headline", "Get up to 20% OFF*")
        subheadline = config.get("subheadline", "on Tours & Attractions")
        coupon_code = config.get("coupon_code", "RAYNOW")
        coupon_label = config.get("coupon_label", "Use Code:")
        photos = config.get("photos", [])
        logo_path = config.get("logo_path", "")
        accent = _parse_color(config.get("accent_color"), ORANGE)
        bg_type = config.get("bg_type", "striped")
        tc_text = config.get("tc_text", "*T&C apply")

        # ── Background ───────────────────────────────────────────────
        if bg_type == "image" and base_image:
            canvas = self.cover_crop(base_image.convert("RGBA"), self.w, self.h)
            canvas = Effects.multi_gradient_overlay(canvas, [
                {
                    "start": (15, 30, 60, 200),
                    "end": (15, 30, 60, 0),
                    "direction": "left_right",
                    "coverage": 0.65,
                },
                {
                    "start": (0, 0, 0, 120),
                    "end": (0, 0, 0, 0),
                    "direction": "bottom_up",
                    "coverage": 0.3,
                },
            ])
        elif bg_type == "striped":
            bg_start = _parse_color(config.get("bg_start_color"), (205, 218, 232))
            canvas = Effects.striped_background(
                self.w, self.h,
                bg_color=bg_start,
                stripe_color=(190, 200, 215, 25),
                spacing=50,
            )
        else:
            bg_start = _parse_color(config.get("bg_start_color"), NAVY)
            bg_end = _parse_color(config.get("bg_end_color"), DARK_BLUE)
            canvas = Effects.linear_gradient(
                self.w, self.h, bg_start, bg_end, "diagonal"
            )

        # Text colors based on background
        is_light_bg = bg_type == "striped"
        text_color = NAVY if is_light_bg else WHITE
        shadow = ShadowCfg(offset=(4, 4), blur=8, color=(0, 0, 0, 140)) if not is_light_bg else None

        # ── Logo (top-left) ──────────────────────────────────────────
        if logo_path:
            Components.place_logo(
                canvas, logo_path,
                position=(self.px(0.04), self.px(0.025, "h")),
                max_height=self.px(0.055, "h"),
                max_width=self.px(0.15),
            )

        # ── Headline (left-aligned, very bold, large) ────────────────
        text_x = self.px(0.04)
        max_text_w = self.px(0.44)
        content_y = self.px(0.10, "h")

        # Headline — montserrat-black, large
        h_font = TextRenderer.fit_font_size(
            headline.split("\n")[0] if "\n" in headline else headline,
            "montserrat-black",
            max_text_w,
            max_size=120,
            min_size=52,
        )
        wrapped = TextRenderer.word_wrap(headline, h_font, max_text_w)
        TextRenderer.draw_multiline(
            canvas,
            (text_x, content_y),
            wrapped,
            h_font,
            color=text_color,
            spacing=10,
            shadow=shadow,
        )

        # ── Subheadline (same heavy weight, slightly smaller) ────────
        h_lines = wrapped.count("\n") + 1
        _, line_h = TextRenderer.measure("Ag", h_font)
        content_y += h_lines * (line_h + 10) + 8

        sub_font = self.font("montserrat-black", 56)
        TextRenderer.draw(
            canvas,
            (text_x, content_y),
            subheadline,
            sub_font,
            color=text_color,
            shadow=shadow,
        )
        _, sub_h = TextRenderer.measure(subheadline, sub_font)

        # ── Accent bars (orange + navy) ──────────────────────────────
        content_y += sub_h + 22
        Components.accent_bars(
            canvas,
            position=(text_x, content_y),
            colors=[accent, NAVY],
            bar_width=38,
            bar_height=6,
            gap=8,
        )
        content_y += 36

        # ── Coupon badge ─────────────────────────────────────────────
        code_bg = NAVY if is_light_bg else WHITE
        code_text = WHITE if is_light_bg else SLATE
        Components.coupon_badge(
            canvas,
            position=(text_x, content_y),
            code=coupon_code,
            label=coupon_label,
            label_bg=accent,
            code_bg=code_bg,
            code_text_color=code_text,
            font_name="montserrat-bold",
            font_size=30,
            height=56,
            radius=6,
        )

        # ── Photo collage (right side, large) ────────────────────────
        if photos:
            collage = self._build_collage(photos)
            # Fill right half from top to near-bottom
            cx = self.px(0.50)
            cy = self.px(0.02, "h")
            max_cw = self.w - cx - self.px(0.01)
            max_ch = self.px(0.92, "h")
            ratio = min(max_cw / collage.width, max_ch / collage.height, 1.0)
            if ratio < 1.0:
                collage = collage.resize(
                    (round(collage.width * ratio), round(collage.height * ratio)),
                    Image.LANCZOS,
                )
            canvas.alpha_composite(collage, (cx, cy))

        # ── T&C ──────────────────────────────────────────────────────
        tc_color = (100, 100, 100, 200) if is_light_bg else (255, 255, 255, 160)
        Components.tc_text(canvas, tc_text, color=tc_color)

        return canvas

    # ── Collage builder ──────────────────────────────────────────────

    def _build_collage(self, photo_paths: list[str]) -> Image.Image:
        """Arrange 1–4 photos as large rotated polaroid frames."""
        photos: list[Image.Image] = []
        for p in photo_paths[:4]:
            try:
                photos.append(Image.open(p).convert("RGBA"))
            except (FileNotFoundError, OSError):
                continue

        if not photos:
            return Image.new("RGBA", (1, 1), TRANSPARENT)

        # Large thumbnails — landscape oriented to match reference
        thumb_w = self.px(0.38)
        thumb_h = round(thumb_w * 0.72)

        # 3-photo layout: two on top row, one centered below
        layouts = {
            1: [(0.1, 0.15, -5)],
            2: [(0.0, 0.0, -5), (0.1, 0.45, 4)],
            3: [(0.0, 0.0, -5), (0.40, 0.02, 5), (0.15, 0.48, -3)],
            4: [(0.0, 0.0, -5), (0.40, 0.0, 5), (0.0, 0.48, 6), (0.38, 0.50, -4)],
        }

        n = len(photos)
        positions = layouts.get(n, layouts[3][:n])

        # Canvas sized for the large photos
        frame_pad = 100  # border + shadow padding
        cw = round(thumb_w * 2 + frame_pad)
        ch = round(thumb_h * 2 + frame_pad * 2)
        collage = Image.new("RGBA", (cw, ch), TRANSPARENT)

        for photo, (xf, yf, rot) in zip(photos, positions):
            thumb = self.cover_crop(photo, thumb_w, thumb_h)
            framed = Effects.polaroid_frame(
                thumb, border=16, rotation=rot, shadow_blur=20
            )

            px = round(xf * cw)
            py = round(yf * ch)
            px = max(0, min(px, cw - framed.width))
            py = max(0, min(py, ch - framed.height))
            collage.alpha_composite(framed, (px, py))

        return collage


# ── Helpers ──────────────────────────────────────────────────────────


def _parse_color(val, default):
    if val is None:
        return default
    if isinstance(val, (tuple, list)):
        return tuple(val)
    if isinstance(val, str) and val.startswith("#"):
        h = val.lstrip("#")
        if len(h) == 6:
            return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))
        if len(h) == 8:
            return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), int(h[6:8], 16))
    return default
