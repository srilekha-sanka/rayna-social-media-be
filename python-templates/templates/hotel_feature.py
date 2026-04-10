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
"""
from __future__ import annotations

from typing import Optional

from PIL import Image, ImageDraw

from engine.core import BaseTemplate, Dimensions, INSTAGRAM, WHITE, BLACK, FontRegistry
from engine.text import TextRenderer, ShadowCfg
from engine.effects import Effects
from engine.components import Components


NAVY = (15, 23, 42)
ORANGE = (234, 88, 12)
DARK_BLUE = (30, 58, 138)


class HotelFeatureTemplate(BaseTemplate):
    """Full-bleed image template with feature bar — MakeMyTrip style."""

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

        # ── Background ───────────────────────────────────────────────
        if base_image:
            canvas = self.cover_crop(base_image.convert("RGBA"), self.w, self.h)
        else:
            canvas = Effects.linear_gradient(
                self.w, self.h, (120, 180, 200), (60, 90, 110), "vertical"
            )

        # Gradient overlay: subtle top-down darkening for text readability
        # Matches reference: gentle gradient, image still clearly visible
        canvas = Effects.multi_gradient_overlay(canvas, [
            {
                "start": (0, 0, 0, 140),
                "end": (0, 0, 0, 0),
                "direction": "top_down",
                "coverage": 0.55,
            },
            {
                "start": (0, 0, 0, 100),
                "end": (0, 0, 0, 0),
                "direction": "bottom_up",
                "coverage": 0.35,
            },
        ])

        # ── Feature bar height reservation ───────────────────────────
        has_features = len(features) > 0
        feature_bar_h = self.px(0.13, "h") if has_features else 0
        content_bottom = self.h - feature_bar_h

        # ── Logo (top-left, like reference) ──────────────────────────
        if logo_path:
            Components.place_logo(
                canvas, logo_path,
                position=(self.px(0.05), self.px(0.025, "h")),
                max_height=self.px(0.04, "h"),
                max_width=self.px(0.22),
            )

        # ── Layout: center all text elements ─────────────────────────
        center_x = self.w // 2
        shadow = ShadowCfg(offset=(3, 3), blur=8, color=(0, 0, 0, 160))

        # ── Pre-headline ("For that Dream Trip:") ────────────────────
        content_y = self.px(0.10, "h")

        if pre_headline:
            pre_font = self.font("dancing-script-bold", 38)
            TextRenderer.draw(
                canvas, (center_x, content_y), pre_headline,
                pre_font, color=accent, anchor="mt",
                shadow=ShadowCfg(offset=(2, 2), blur=6, color=(0, 0, 0, 100)),
            )
            _, pre_h = TextRenderer.measure(pre_headline, pre_font)
            content_y += pre_h + 18

        # ── Headline lines ───────────────────────────────────────────
        h_lines = headline.split("\n")

        for line in h_lines:
            stripped = line.strip()
            if not stripped:
                content_y += 16
                continue

            # Detect the "big" line: contains digits (price or percentage)
            has_digits = any(c.isdigit() for c in stripped)
            is_big = has_digits and (
                "%" in stripped or
                "AED" in stripped.upper() or
                "$" in stripped or
                "₹" in stripped or
                "/" in stripped or
                "." in stripped
            )

            if is_big:
                # ── BIG price/offer line (like "25% OFF*" or "AED 65.00/-")
                max_w = self.px(0.88)
                font = TextRenderer.fit_font_size(
                    stripped, "montserrat-black", max_w,
                    max_size=220, min_size=80,
                )
                TextRenderer.draw(
                    canvas, (center_x, content_y), stripped,
                    font, color=WHITE, anchor="mt", shadow=shadow,
                )
                _, lh = TextRenderer.measure(stripped, font)
                content_y += lh + 10
            else:
                # ── Smaller headline line (like "GRAB UP TO")
                font = self.font("montserrat-extrabold", 52)
                TextRenderer.draw(
                    canvas, (center_x, content_y), stripped,
                    font, color=WHITE, anchor="mt", shadow=shadow,
                )
                _, lh = TextRenderer.measure(stripped, font)
                content_y += lh + 8

        # ── Subheadline ("on International Hotels") ──────────────────
        content_y += 8
        sub_font = self.font("montserrat-bold", 38)
        TextRenderer.draw(
            canvas, (center_x, content_y), subheadline,
            sub_font, color=WHITE, anchor="mt",
            shadow=ShadowCfg(offset=(2, 2), blur=5, color=(0, 0, 0, 120)),
        )
        _, sh = TextRenderer.measure(subheadline, sub_font)
        content_y += sh + 28

        # ── Coupon badge (centered) ──────────────────────────────────
        badge_font_size = 26
        badge_height = 48
        lf = FontRegistry.get("montserrat-bold", badge_font_size)
        cf = FontRegistry.get("montserrat-extrabold", round(badge_font_size * 1.1))
        lw, _ = TextRenderer.measure(coupon_label, lf)
        cw, _ = TextRenderer.measure(coupon_code, cf)
        pad_x = round(badge_height * 0.45)
        total_badge_w = (lw + pad_x * 2) + (cw + pad_x * 2)
        badge_x = center_x - total_badge_w // 2

        Components.coupon_badge(
            canvas,
            position=(badge_x, content_y),
            code=coupon_code,
            label=coupon_label,
            label_bg=accent,
            font_size=badge_font_size,
            height=badge_height,
            radius=4,
        )

        # ── T&C (above feature bar, right side) ─────────────────────
        tc_y = content_bottom - 28
        Components.tc_text(
            canvas, tc_text,
            position=(self.w - 130, tc_y),
            color=(255, 255, 255, 180),
            font_size=14,
        )

        # ── Feature bar (bottom) ─────────────────────────────────────
        if has_features:
            self._draw_feature_bar(
                canvas,
                y=content_bottom,
                features=features,
                bg_color=bar_color,
                height=feature_bar_h,
            )

        return canvas

    # ── Feature bar with circular icons (matches reference) ──────────

    def _draw_feature_bar(
        self,
        canvas: Image.Image,
        y: int,
        features: list,
        bg_color,
        height: int,
    ) -> None:
        """Draw bottom feature bar with circle icons and text columns."""
        w = canvas.width
        n = len(features)
        if n == 0:
            return

        draw = ImageDraw.Draw(canvas)

        # Background
        draw.rectangle([0, y, w, y + height], fill=_rgba(bg_color))

        col_w = w // n
        text_font = FontRegistry.get("montserrat", 13)
        icon_font = FontRegistry.get("montserrat-bold", 18)
        divider_color = _rgba((60, 75, 100, 120))

        icon_radius = 18
        icon_top = y + 28

        for i, feat in enumerate(features):
            cx = i * col_w + col_w // 2

            # ── Circular icon ────────────────────────────────────────
            icon_char = feat.get("icon", "")
            if icon_char:
                # Circle outline
                draw.ellipse(
                    [cx - icon_radius, icon_top - icon_radius,
                     cx + icon_radius, icon_top + icon_radius],
                    fill=_rgba((255, 255, 255, 15)),
                    outline=_rgba((255, 255, 255, 140)),
                    width=2,
                )
                # Icon character centered in circle
                iw, ih = TextRenderer.measure(icon_char, icon_font)
                draw.text(
                    (cx - iw // 2, icon_top - ih // 2),
                    icon_char,
                    fill=_rgba(WHITE),
                    font=icon_font,
                )

            # ── Text (centered, multiline) ───────────────────────────
            txt = feat.get("text", "")
            if txt:
                lines = txt.split("\n")
                line_y = icon_top + icon_radius + 14
                for line in lines:
                    stripped = line.strip()
                    if not stripped:
                        continue
                    lw, lh = TextRenderer.measure(stripped, text_font)
                    draw.text(
                        (cx - lw // 2, line_y),
                        stripped,
                        fill=_rgba(WHITE),
                        font=text_font,
                    )
                    line_y += lh + 4

            # ── Divider (except last) ────────────────────────────────
            if i < n - 1:
                div_x = (i + 1) * col_w
                draw.line(
                    [(div_x, y + 14), (div_x, y + height - 14)],
                    fill=divider_color,
                    width=1,
                )


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


def _rgba(c):
    c = tuple(c)
    if len(c) == 4:
        return c
    return c + (255,)
