"""
Template: Phone Mockup (Landscape)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Scenic landscape background with centered phone mockup, bold headline,
accent bars, and brand logo.
Reference: MakeMyTrip "It's Been Long Since You've Booked a Trip" banner.

Canvas: 1920x1080 (16:9 landscape)

Config keys:
    headline        – "It's Been Long"
    subheadline     – "Since You've Booked a Trip with Us!"
    phone_image     – path to image shown inside the phone screen
    logo_path       – brand logo file
    accent_bars     – list of RGB colors for decorative bars
    tc_text         – "*T&Cs Apply"
    overlay_darken  – 0.0–1.0 background darkening (default 0.12)
"""
from __future__ import annotations

from typing import Optional

from PIL import Image

from engine.core import BaseTemplate, Dimensions, INSTAGRAM, WHITE, BLACK
from engine.text import TextRenderer, ShadowCfg
from engine.effects import Effects
from engine.components import Components


class PhoneMockupTemplate(BaseTemplate):
    """Landscape scenic background + phone mockup + bold headline."""

    def __init__(self, dims: Dimensions = INSTAGRAM["16:9"]) -> None:
        super().__init__(dims)

    def render(
        self, config: dict, base_image: Optional[Image.Image] = None
    ) -> Image.Image:
        headline = config.get("headline", "It's Been Long")
        subheadline = config.get("subheadline", "Since You've Booked a Trip with Us!")
        phone_image_path = config.get("phone_image", "")
        logo_path = config.get("logo_path", "")
        accent_colors = [tuple(c) for c in config.get("accent_bars", [(37, 99, 235), (220, 38, 38)])]
        tc_text = config.get("tc_text", "*T&Cs Apply")
        darken = config.get("overlay_darken", 0.12)

        # ── Background ───────────────────────────────────────────────
        if base_image:
            canvas = self.cover_crop(base_image.convert("RGBA"), self.w, self.h)
        else:
            canvas = Effects.linear_gradient(
                self.w, self.h,
                (180, 210, 230),
                (120, 160, 190),
                "horizontal",
            )

        # Subtle overall darkening for text contrast
        if darken > 0:
            dark = Image.new("RGBA", (self.w, self.h), (0, 0, 0, round(255 * darken)))
            canvas.alpha_composite(dark)

        # Soft gradient at top for headline readability
        canvas = Effects.gradient_overlay(
            canvas,
            start=(0, 0, 0, 120),
            end=(0, 0, 0, 0),
            direction="top_down",
            coverage=0.45,
        )

        center_x = self.w // 2
        shadow = ShadowCfg(offset=(3, 3), blur=10, color=(0, 0, 0, 160))

        # ── Logo (centered top) ──────────────────────────────────────
        content_y = self.px(0.03, "h")
        if logo_path:
            Components.place_logo_centered(
                canvas, logo_path, y=content_y,
                max_height=self.px(0.05, "h"),
                max_width=self.px(0.12),
            )
            content_y += self.px(0.08, "h")
        else:
            content_y += self.px(0.05, "h")

        # ── Headline (large, bold, white, centered) ──────────────────
        max_w = self.px(0.70)
        h_font = TextRenderer.fit_font_size(
            headline, "montserrat-black", max_w,
            max_size=90, min_size=44,
        )
        TextRenderer.draw(
            canvas, (center_x, content_y), headline,
            h_font, color=WHITE, anchor="mt", shadow=shadow,
        )
        _, hh = TextRenderer.measure(headline, h_font)
        content_y += hh + 12

        # ── Subheadline (bold, white, centered) ──────────────────────
        sub_font = TextRenderer.fit_font_size(
            subheadline, "montserrat-bold", max_w,
            max_size=52, min_size=28,
        )
        TextRenderer.draw(
            canvas, (center_x, content_y), subheadline,
            sub_font, color=WHITE, anchor="mt",
            shadow=ShadowCfg(offset=(2, 2), blur=6, color=(0, 0, 0, 120)),
        )
        _, sh = TextRenderer.measure(subheadline, sub_font)
        content_y += sh + 20

        # ── Accent bars (centered) ───────────────────────────────────
        if accent_colors:
            bar_w, bar_gap = 44, 8
            total_w = len(accent_colors) * bar_w + (len(accent_colors) - 1) * bar_gap
            Components.accent_bars(
                canvas,
                position=(center_x - total_w // 2, content_y),
                colors=accent_colors,
                bar_width=bar_w,
                bar_height=5,
                gap=bar_gap,
            )
            content_y += 30

        # ── Phone mockup (centered, lower half) ─────────────────────
        phone_w = self.px(0.22)  # ~422px on 1920w — proportional to landscape
        if phone_image_path:
            try:
                screen_img = Image.open(phone_image_path).convert("RGBA")
            except (FileNotFoundError, OSError):
                screen_img = Effects.linear_gradient(
                    400, 800, (100, 160, 200), (60, 100, 140), "vertical"
                )
        else:
            screen_img = Effects.linear_gradient(
                400, 800, (100, 160, 200), (60, 100, 140), "vertical"
            )

        phone = Effects.phone_mockup(
            screen_img,
            phone_width=phone_w,
            corner_radius=round(phone_w * 0.09),
            bezel=round(phone_w * 0.025),
        )

        # Center phone horizontally, position below accent bars
        phone_x = center_x - phone.width // 2
        phone_y = content_y + 10

        # Allow phone to extend past bottom edge (partial cutoff like reference)
        canvas.alpha_composite(phone, (phone_x, phone_y))

        # ── T&C (bottom-right) ───────────────────────────────────────
        Components.tc_text(canvas, tc_text, color=(255, 255, 255, 180), font_size=14)

        return canvas
