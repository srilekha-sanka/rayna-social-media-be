"""
Template: Promo Collage
━━━━━━━━━━━━━━━━━━━━━━
Promotional offer banner with polaroid-style photo collage.
Reference: Rayna Tours 20% OFF banner, MakeMyTrip 20% OFF tours.

Config keys:
    headline        – "Get up to 20% OFF*"
    subheadline     – "on Tours & Attractions"
    coupon_code     – "RAYNOW"
    coupon_label    – "Use Code:" (default)
    photos          – [path1, path2, path3]  (1–4 images for collage)
    logo_path       – brand logo file
    accent_color    – hex or RGB tuple (default orange)
    bg_type         – "gradient" | "image" | "striped" (default gradient)
    bg_image        – path if bg_type == "image"
    bg_start_color  – gradient start (default dark navy)
    bg_end_color    – gradient end
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
        bg_type = config.get("bg_type", "gradient")
        tc_text = config.get("tc_text", "*T&C apply")

        # ── Background ───────────────────────────────────────────────
        if bg_type == "image" and base_image:
            canvas = self.cover_crop(base_image.convert("RGBA"), self.w, self.h)
            # Darken for text readability
            canvas = Effects.gradient_overlay(
                canvas,
                start=(0, 0, 0, 180),
                end=(0, 0, 0, 40),
                direction="left_right",
                coverage=0.7,
            )
        elif bg_type == "striped":
            bg_start = _parse_color(config.get("bg_start_color"), (200, 215, 230))
            canvas = Effects.striped_background(
                self.w, self.h,
                bg_color=bg_start,
                stripe_color=(180, 195, 210, 50),
                spacing=30,
            )
        else:
            bg_start = _parse_color(config.get("bg_start_color"), NAVY)
            bg_end = _parse_color(config.get("bg_end_color"), DARK_BLUE)
            canvas = Effects.linear_gradient(
                self.w, self.h, bg_start, bg_end, "diagonal"
            )

        # Determine if text should be dark (for light backgrounds)
        is_light_bg = bg_type == "striped"
        text_color = SLATE if is_light_bg else WHITE
        sub_text_color = SLATE if is_light_bg else (230, 230, 230)

        # ── Logo (top-left) ──────────────────────────────────────────
        if logo_path:
            Components.place_logo(
                canvas, logo_path,
                position=(self.px(0.05), self.px(0.03, "h")),
                max_height=self.px(0.045, "h"),
                max_width=self.px(0.2),
            )

        # ── Headline ─────────────────────────────────────────────────
        text_x = self.px(0.06)
        max_text_w = self.px(0.52)
        headline_y = self.px(0.25, "h")

        # Split headline into lines (auto-wrap)
        h_font = TextRenderer.fit_font_size(
            headline.split("\n")[0] if "\n" in headline else headline,
            "montserrat-black",
            max_text_w,
            max_size=110,
            min_size=48,
        )
        wrapped = TextRenderer.word_wrap(headline, h_font, max_text_w)
        shadow = ShadowCfg(offset=(4, 4), blur=8, color=(0, 0, 0, 140)) if not is_light_bg else None
        TextRenderer.draw_multiline(
            canvas,
            (text_x, headline_y),
            wrapped,
            h_font,
            color=text_color,
            spacing=14,
            shadow=shadow,
        )

        # ── Subheadline + underline ──────────────────────────────────
        h_lines = wrapped.count("\n") + 1
        _, line_h = TextRenderer.measure("Ag", h_font)
        sub_y = headline_y + h_lines * (line_h + 14) + 20

        sub_font = self.font("montserrat-bold", 42)
        TextRenderer.draw(
            canvas,
            (text_x, sub_y),
            subheadline,
            sub_font,
            color=sub_text_color,
            shadow=shadow,
        )

        # Accent underline below subheadline
        sw, _ = TextRenderer.measure(subheadline, sub_font)
        Components.underline(
            canvas,
            (text_x, sub_y + 50),
            width=min(sw, self.px(0.3)),
            color=accent,
            thickness=4,
        )

        # ── Coupon badge ─────────────────────────────────────────────
        badge_y = sub_y + 80
        Components.coupon_badge(
            canvas,
            position=(text_x, badge_y),
            code=coupon_code,
            label=coupon_label,
            label_bg=accent,
            font_name="montserrat-bold",
            font_size=28,
            height=52,
            radius=6,
            border=(2, SLATE) if is_light_bg else None,
        )

        # ── Photo collage (right side) ───────────────────────────────
        if photos:
            collage = self._build_collage(photos)
            # Position on right half
            cx = self.px(0.55)
            cy = self.px(0.08, "h")
            # Scale collage to fit right portion
            max_cw = self.w - cx - self.px(0.03)
            max_ch = self.px(0.75, "h")
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
        """Arrange 1–4 photos as rotated polaroid frames."""
        photos: list[Image.Image] = []
        for p in photo_paths[:4]:
            try:
                photos.append(Image.open(p).convert("RGBA"))
            except (FileNotFoundError, OSError):
                continue

        if not photos:
            return Image.new("RGBA", (1, 1), TRANSPARENT)

        # Target size for each photo thumbnail
        thumb_w = self.px(0.3)
        thumb_h = round(thumb_w * 0.75)

        # Layout presets: (x_offset_frac, y_offset_frac, rotation)
        layouts = {
            1: [(0.0, 0.2, -5)],
            2: [(0.0, 0.0, 5), (0.15, 0.45, -8)],
            3: [(0.0, 0.0, 5), (0.3, 0.05, -4), (0.1, 0.5, -8)],
            4: [(0.0, 0.0, 5), (0.35, 0.0, -6), (0.0, 0.5, 7), (0.35, 0.5, -3)],
        }

        n = len(photos)
        positions = layouts.get(n, layouts[3][:n])

        # Calculate canvas bounds
        max_frame_dim = thumb_w + 80  # frame + shadow padding
        cw = round(max_frame_dim * 1.8)
        ch = round(max_frame_dim * 2.2)
        collage = Image.new("RGBA", (cw, ch), TRANSPARENT)

        for i, (photo, (xf, yf, rot)) in enumerate(zip(photos, positions)):
            # Center-crop photo to thumbnail size
            thumb = self.cover_crop(photo, thumb_w, thumb_h)
            framed = Effects.polaroid_frame(
                thumb, border=12, rotation=rot, shadow_blur=15
            )

            px = round(xf * cw)
            py = round(yf * ch)
            # Clamp to canvas
            px = min(px, cw - framed.width)
            py = min(py, ch - framed.height)
            px = max(0, px)
            py = max(0, py)
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
