"""
Template: Photo Board
━━━━━━━━━━━━━━━━━━━━━
Textured background (wood planks, stripes) with scattered polaroid photos,
headline, coupon badge, and brand logo.
Reference: MakeMyTrip tours 20% OFF with wooden background.

Config keys:
    headline        – "Get up to 20% OFF*"
    subheadline     – "on Tours & Attractions"
    coupon_code     – "MMTSPECIAL"
    coupon_label    – "Use Code:"
    photos          – [path1, path2, path3]  (1–4 images)
    logo_path       – brand logo file
    accent_color    – hex or RGB
    bg_texture      – "wood" | "striped" | "solid" (default wood)
    bg_color        – solid background color
    text_color      – override text color
    tc_text         – "*T&C apply"
"""
from __future__ import annotations

from typing import Optional

from PIL import Image

from engine.core import BaseTemplate, Dimensions, INSTAGRAM, WHITE, BLACK, TRANSPARENT
from engine.text import TextRenderer, ShadowCfg
from engine.effects import Effects
from engine.components import Components


WOOD_BROWN = (170, 140, 110)
SLATE = (30, 41, 59)
ORANGE = (234, 88, 12)


class PhotoBoardTemplate(BaseTemplate):
    """Textured background + scattered polaroid photos + offer text."""

    def __init__(self, dims: Dimensions = INSTAGRAM["4:5"]) -> None:
        super().__init__(dims)

    def render(
        self, config: dict, base_image: Optional[Image.Image] = None
    ) -> Image.Image:
        headline = config.get("headline", "Get up to 20% OFF*")
        subheadline = config.get("subheadline", "on Tours & Attractions")
        coupon_code = config.get("coupon_code", "MMTSPECIAL")
        coupon_label = config.get("coupon_label", "Use Code:")
        photos = config.get("photos", [])
        logo_path = config.get("logo_path", "")
        accent = _parse_color(config.get("accent_color"), ORANGE)
        bg_texture = config.get("bg_texture", "wood")
        text_color = _parse_color(config.get("text_color"), SLATE)
        tc_text = config.get("tc_text", "*T&C apply")

        # ── Background ───────────────────────────────────────────────
        if bg_texture == "wood":
            canvas = Effects.wood_texture(self.w, self.h)
        elif bg_texture == "striped":
            canvas = Effects.striped_background(
                self.w, self.h,
                bg_color=_parse_color(config.get("bg_color"), (205, 218, 232)),
                stripe_color=(190, 200, 215, 25),
                spacing=50,
            )
        else:
            bg_c = _parse_color(config.get("bg_color"), (230, 225, 215))
            canvas = Image.new("RGBA", (self.w, self.h), bg_c + (255,) if len(bg_c) == 3 else bg_c)

        # ── Logo (top-left) ──────────────────────────────────────────
        if logo_path:
            Components.place_logo(
                canvas, logo_path,
                position=(self.px(0.05), self.px(0.03, "h")),
                max_height=self.px(0.04, "h"),
            )

        # ── Text content (left side) ────────────────────────────────
        text_x = self.px(0.06)
        max_text_w = self.px(0.52)
        content_y = self.px(0.12, "h")

        # Headline
        h_font = TextRenderer.fit_font_size(
            headline.split("\n")[0] if "\n" in headline else headline,
            "montserrat-black", max_text_w,
            max_size=100, min_size=44,
        )
        wrapped = TextRenderer.word_wrap(headline, h_font, max_text_w)
        TextRenderer.draw_multiline(
            canvas, (text_x, content_y), wrapped,
            h_font, color=text_color, spacing=12,
        )

        h_lines = wrapped.count("\n") + 1
        _, lh = TextRenderer.measure("Ag", h_font)
        content_y += h_lines * (lh + 12) + 8

        # Subheadline
        sub_font = self.font("montserrat-bold", 38)
        TextRenderer.draw(
            canvas, (text_x, content_y), subheadline,
            sub_font, color=text_color,
        )
        sw, _ = TextRenderer.measure(subheadline, sub_font)
        content_y += 48

        # Accent bars
        bar_colors = [(37, 99, 235), (220, 38, 38), (37, 99, 235)]
        Components.accent_bars(
            canvas,
            position=(text_x, content_y),
            colors=bar_colors,
            bar_width=30,
            bar_height=4,
            gap=5,
        )
        content_y += 30

        # Coupon badge
        Components.coupon_badge(
            canvas,
            position=(text_x, content_y),
            code=coupon_code,
            label=coupon_label,
            label_bg=accent,
            font_size=24,
            height=46,
            radius=6,
            border=(2, (100, 80, 60)),
        )

        # ── Photo collage (right side + bottom) ─────────────────────
        if photos:
            collage = self._build_scattered_collage(photos)
            # Position: right-center
            cx = self.px(0.48)
            cy = self.px(0.10, "h")
            max_cw = self.w - cx - self.px(0.02)
            max_ch = self.px(0.80, "h")
            ratio = min(max_cw / collage.width, max_ch / collage.height, 1.0)
            if ratio < 1.0:
                collage = collage.resize(
                    (round(collage.width * ratio), round(collage.height * ratio)),
                    Image.LANCZOS,
                )
            canvas.alpha_composite(collage, (cx, cy))

        # ── T&C ──────────────────────────────────────────────────────
        Components.tc_text(canvas, tc_text, color=(100, 80, 60, 180))

        return canvas

    def _build_scattered_collage(self, photo_paths: list[str]) -> Image.Image:
        """Create a scattered, overlapping polaroid collage."""
        photos: list[Image.Image] = []
        for p in photo_paths[:4]:
            try:
                photos.append(Image.open(p).convert("RGBA"))
            except (FileNotFoundError, OSError):
                continue

        if not photos:
            return Image.new("RGBA", (1, 1), TRANSPARENT)

        n = len(photos)

        # Scattered layout: each photo gets a position, size, and rotation
        # These create an organic, magazine-style spread
        configs = {
            1: [
                {"x": 0.1, "y": 0.15, "w": 0.8, "h": 0.65, "rot": -3},
            ],
            2: [
                {"x": 0.0, "y": 0.0, "w": 0.65, "h": 0.48, "rot": 6},
                {"x": 0.2, "y": 0.42, "w": 0.7, "h": 0.52, "rot": -5},
            ],
            3: [
                {"x": 0.0, "y": 0.0, "w": 0.55, "h": 0.38, "rot": 5},
                {"x": 0.35, "y": 0.05, "w": 0.55, "h": 0.38, "rot": -4},
                {"x": 0.1, "y": 0.42, "w": 0.65, "h": 0.48, "rot": -7},
            ],
            4: [
                {"x": 0.0, "y": 0.0, "w": 0.5, "h": 0.35, "rot": 5},
                {"x": 0.4, "y": 0.0, "w": 0.5, "h": 0.35, "rot": -6},
                {"x": 0.0, "y": 0.38, "w": 0.5, "h": 0.35, "rot": 7},
                {"x": 0.35, "y": 0.42, "w": 0.55, "h": 0.42, "rot": -3},
            ],
        }

        layout = configs.get(n, configs[3][:n])
        cw = self.px(0.55)
        ch = self.px(0.8, "h")
        collage = Image.new("RGBA", (cw, ch), TRANSPARENT)

        for photo, cfg in zip(photos, layout):
            tw = round(cw * cfg["w"])
            th = round(ch * cfg["h"])
            thumb = self.cover_crop(photo, tw, th)
            framed = Effects.polaroid_frame(
                thumb, border=10, rotation=cfg["rot"], shadow_blur=12,
            )
            px = round(cw * cfg["x"])
            py = round(ch * cfg["y"])
            px = max(0, min(px, cw - framed.width))
            py = max(0, min(py, ch - framed.height))
            collage.alpha_composite(framed, (px, py))

        return collage


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
