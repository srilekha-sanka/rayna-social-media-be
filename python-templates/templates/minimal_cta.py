"""
Template: Minimal CTA Banner
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Clean full-bleed image with gentle bottom gradient, large headline,
price line, and a prominent CTA button. Minimal and elegant.

Config keys:
    headline        – "Sky Views Experience"
    subheadline     – "Starting from AED 80.00/-"
    cta_text        – "Book Now"
    logo_path       – brand logo file
    accent_color    – CTA button color (default orange)
    tc_text         – "*T&C apply"
"""
from __future__ import annotations

from typing import Optional

from PIL import Image, ImageDraw, ImageFilter

from engine.core import BaseTemplate, Dimensions, INSTAGRAM, WHITE, BLACK, FontRegistry
from engine.text import TextRenderer, ShadowCfg
from engine.effects import Effects
from engine.components import Components


ORANGE = (234, 88, 12)


class MinimalCTATemplate(BaseTemplate):
    """Clean full-bleed image + headline + CTA button."""

    def __init__(self, dims: Dimensions = INSTAGRAM["4:5"]) -> None:
        super().__init__(dims)

    def render(
        self, config: dict, base_image: Optional[Image.Image] = None
    ) -> Image.Image:
        headline = config.get("headline", "Desert Safari")
        subheadline = config.get("subheadline", "")
        cta_text = config.get("cta_text", "Book Now")
        logo_path = config.get("logo_path", "")
        accent = _parse_color(config.get("accent_color"), ORANGE)
        tc_text = config.get("tc_text", "*T&C apply")

        # ── Background ───────────────────────────────────────────────
        if base_image:
            canvas = self.cover_crop(base_image.convert("RGBA"), self.w, self.h)
        else:
            canvas = Effects.linear_gradient(
                self.w, self.h, (40, 60, 90), (20, 30, 50), "vertical"
            )

        # Gentle bottom gradient only — let the image breathe
        canvas = Effects.gradient_overlay(
            canvas,
            start=(0, 0, 0, 200),
            end=(0, 0, 0, 0),
            direction="bottom_up",
            coverage=0.50,
        )

        center_x = self.w // 2
        shadow = ShadowCfg(offset=(2, 3), blur=8, color=(0, 0, 0, 180))

        # ── Logo (top-left) ──────────────────────────────────────────
        if logo_path:
            Components.place_logo(
                canvas, logo_path,
                position=(self.px(0.04), self.px(0.025, "h")),
                max_height=self.px(0.04, "h"),
                max_width=self.px(0.15),
            )

        # ── Content anchored at bottom ───────────────────────────────
        bottom_pad = self.px(0.05, "h")
        content_y = self.h - bottom_pad

        # T&C (very bottom)
        tc_font = FontRegistry.get("montserrat", 14)
        tw, th = TextRenderer.measure(tc_text, tc_font)
        content_y -= th
        TextRenderer.draw(
            canvas, (center_x, content_y), tc_text,
            tc_font, color=(255, 255, 255, 140), anchor="mt",
        )
        content_y -= 24

        # CTA button
        if cta_text:
            btn_h = 56
            content_y -= btn_h
            self._draw_cta_button(canvas, center_x, content_y, cta_text, accent, btn_h)
            content_y -= 24

        # Subheadline (price line)
        if subheadline:
            sub_font = self.font("montserrat-semibold", 32)
            TextRenderer.draw(
                canvas, (center_x, content_y), subheadline,
                sub_font, color=(255, 255, 255, 230), anchor="mb",
                shadow=ShadowCfg(offset=(1, 2), blur=4, color=(0, 0, 0, 120)),
            )
            _, sh = TextRenderer.measure(subheadline, sub_font)
            content_y -= sh + 16

        # Headline (large, bold)
        max_w = self.px(0.88)
        h_font = TextRenderer.fit_font_size(
            headline, "montserrat-black", max_w,
            max_size=100, min_size=44,
        )
        wrapped = TextRenderer.word_wrap(headline, h_font, max_w)
        _, hh = TextRenderer.measure_multiline(wrapped, h_font, 10)
        content_y -= hh
        TextRenderer.draw_multiline(
            canvas, (center_x, content_y), wrapped,
            h_font, color=WHITE, spacing=10, align="center", anchor="ma",
            shadow=shadow,
        )

        return canvas

    def _draw_cta_button(
        self,
        canvas: Image.Image,
        cx: int,
        cy: int,
        text: str,
        bg_color,
        btn_h: int = 56,
    ) -> None:
        """Draw a clean rounded CTA button centered at (cx, cy)."""
        btn_font = FontRegistry.get("montserrat-bold", 26)
        tw, th = TextRenderer.measure(text, btn_font)

        pad_x = 52
        btn_w = tw + pad_x * 2
        bx = cx - btn_w // 2

        # Subtle shadow
        shadow_layer = Image.new("RGBA", (btn_w + 30, btn_h + 30), (0, 0, 0, 0))
        sd = ImageDraw.Draw(shadow_layer)
        sd.rounded_rectangle(
            [15, 15, 15 + btn_w, 15 + btn_h],
            radius=btn_h // 2,
            fill=(0, 0, 0, 50),
        )
        shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(6))
        canvas.alpha_composite(shadow_layer, (bx - 15, cy - 12))

        # Button
        draw = ImageDraw.Draw(canvas)
        bc = bg_color + (255,) if len(bg_color) == 3 else bg_color
        draw.rounded_rectangle(
            [bx, cy, bx + btn_w, cy + btn_h],
            radius=btn_h // 2,
            fill=bc,
        )

        # Text centered in button
        text_y = cy + (btn_h - th) // 2
        draw.text(
            (cx, text_y), text,
            fill=(255, 255, 255, 255),
            font=btn_font,
            anchor="mt",
        )


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
