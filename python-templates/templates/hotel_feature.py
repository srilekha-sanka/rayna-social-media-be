"""
Template: Hotel Feature
━━━━━━━━━━━━━━━━━━━━━━
Full-bleed background image with gradient overlay, prominent headline,
coupon badge, and bottom feature bar with icon columns.
Reference: MakeMyTrip 25% OFF International Hotels banner.

Config keys:
    pre_headline    – "For that Dream Trip:" (optional)
    headline        – "GRAB UP TO\\n25% OFF*"
    subheadline     – "on International Hotels"
    coupon_code     – "MYTRIP"
    coupon_label    – "Use Code:"
    logo_path       – brand logo file
    accent_color    – hex or RGB tuple
    features        – [{"icon": "...", "text": "Line 1\\nLine 2"}, ...]
    feature_bar_color – RGB for the bar background
    tc_text         – "*T&C apply"
    headline_color  – override headline color
    sub_color       – override subheadline color
"""
from __future__ import annotations

from typing import Optional

from PIL import Image, ImageDraw

from engine.core import BaseTemplate, Dimensions, INSTAGRAM, WHITE, BLACK
from engine.text import TextRenderer, ShadowCfg
from engine.effects import Effects
from engine.components import Components


NAVY = (15, 23, 42)
ORANGE = (234, 88, 12)
DARK_BLUE = (30, 58, 138)


class HotelFeatureTemplate(BaseTemplate):
    """Full-bleed image template with feature bar."""

    def __init__(self, dims: Dimensions = INSTAGRAM["4:5"]) -> None:
        super().__init__(dims)

    def render(
        self, config: dict, base_image: Optional[Image.Image] = None
    ) -> Image.Image:
        # ── Config ───────────────────────────────────────────────────
        pre_headline = config.get("pre_headline", "")
        headline = config.get("headline", "GRAB UP TO\n25% OFF*")
        subheadline = config.get("subheadline", "on International Hotels")
        coupon_code = config.get("coupon_code", "MYTRIP")
        coupon_label = config.get("coupon_label", "Use Code:")
        logo_path = config.get("logo_path", "")
        accent = _parse_color(config.get("accent_color"), ORANGE)
        features = config.get("features", [])
        bar_color = _parse_color(config.get("feature_bar_color"), NAVY)
        tc_text = config.get("tc_text", "*T&C apply")
        h_color = _parse_color(config.get("headline_color"), None)
        s_color = _parse_color(config.get("sub_color"), None)

        # ── Background ───────────────────────────────────────────────
        if base_image:
            canvas = self.cover_crop(base_image.convert("RGBA"), self.w, self.h)
        else:
            canvas = Effects.linear_gradient(
                self.w, self.h, (120, 180, 200), (60, 90, 110), "vertical"
            )

        # Gradient overlays for text readability
        canvas = Effects.multi_gradient_overlay(canvas, [
            {
                "start": (0, 0, 0, 0),
                "end": (0, 0, 0, 160),
                "direction": "bottom_up",
                "coverage": 0.4,
            },
            {
                "start": (255, 255, 255, 60),
                "end": (255, 255, 255, 0),
                "direction": "top_down",
                "coverage": 0.3,
            },
        ])

        # ── Feature bar height reservation ───────────────────────────
        has_features = len(features) > 0
        feature_bar_h = 180 if has_features else 0
        content_bottom = self.h - feature_bar_h

        # ── Logo (centered top) ──────────────────────────────────────
        if logo_path:
            Components.place_logo_centered(
                canvas, logo_path,
                y=self.px(0.03, "h"),
                max_height=self.px(0.045, "h"),
            )

        # ── Pre-headline ─────────────────────────────────────────────
        center_x = self.w // 2
        content_y = self.px(0.12, "h")

        if pre_headline:
            pre_font = self.font("montserrat-semibold", 30)
            pre_color = _parse_color(config.get("pre_headline_color"), accent)
            TextRenderer.draw(
                canvas, (center_x, content_y), pre_headline,
                pre_font, color=pre_color, anchor="mt",
                shadow=ShadowCfg(offset=(2, 2), blur=4, color=(0, 0, 0, 60)),
            )
            content_y += 55

        # ── Headline ─────────────────────────────────────────────────
        h_lines = headline.split("\n")
        shadow = ShadowCfg(offset=(4, 4), blur=10, color=(0, 0, 0, 140))

        for line in h_lines:
            stripped = line.strip()
            if not stripped:
                content_y += 20
                continue

            # Detect the "big number" line (e.g., "25% OFF*")
            is_big = any(c.isdigit() for c in stripped) and "%" in stripped
            if is_big:
                max_w = self.px(0.85)
                font = TextRenderer.fit_font_size(
                    stripped, "montserrat-black", max_w, max_size=200, min_size=80
                )
                color = h_color or WHITE
            else:
                font = self.font("montserrat-extrabold", 54)
                color = h_color or NAVY

            TextRenderer.draw(
                canvas, (center_x, content_y), stripped,
                font, color=color, anchor="mt", shadow=shadow,
            )
            _, lh = TextRenderer.measure(stripped, font)
            content_y += lh + 14

        # ── Subheadline ──────────────────────────────────────────────
        content_y += 12
        sub_font = self.font("montserrat-bold", 40)
        sub_color = s_color or NAVY
        TextRenderer.draw(
            canvas, (center_x, content_y), subheadline,
            sub_font, color=sub_color, anchor="mt",
            shadow=ShadowCfg(offset=(2, 2), blur=4, color=(0, 0, 0, 60)),
        )
        _, sh = TextRenderer.measure(subheadline, sub_font)
        content_y += sh + 20

        # ── Accent bars (centered) ───────────────────────────────────
        bar_colors = [
            (37, 99, 235),   # blue
            (220, 38, 38),   # red
        ]
        bar_w = 40
        bar_gap = 6
        total_bar_w = len(bar_colors) * bar_w + (len(bar_colors) - 1) * bar_gap
        Components.accent_bars(
            canvas,
            position=(center_x - total_bar_w // 2, content_y),
            colors=bar_colors,
            bar_width=bar_w,
            bar_height=4,
            gap=bar_gap,
        )
        content_y += 25

        # ── Coupon badge (centered) ──────────────────────────────────
        # Measure first to center it
        from engine.core import FontRegistry
        lf = FontRegistry.get("montserrat", 26)
        cf = FontRegistry.get("montserrat", 29)
        lw, _ = TextRenderer.measure(coupon_label, lf)
        cw, _ = TextRenderer.measure(coupon_code, cf)
        pad_x = round(48 * 0.45)
        total_badge_w = (lw + pad_x * 2) + (cw + pad_x * 2)
        badge_x = center_x - total_badge_w // 2

        Components.coupon_badge(
            canvas,
            position=(badge_x, content_y),
            code=coupon_code,
            label=coupon_label,
            label_bg=accent,
            font_size=26,
            height=48,
        )

        # ── T&C ──────────────────────────────────────────────────────
        tc_y = content_bottom - 30
        Components.tc_text(
            canvas, tc_text,
            position=(self.w - 120, tc_y),
            color=(255, 255, 255, 180),
            font_size=14,
        )

        # ── Feature bar ──────────────────────────────────────────────
        if has_features:
            Components.feature_bar(
                canvas,
                y=content_bottom,
                features=features,
                bg_color=bar_color,
                height=feature_bar_h,
            )

        return canvas


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
