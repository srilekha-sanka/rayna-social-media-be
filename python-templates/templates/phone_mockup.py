"""
Template: Phone Mockup
━━━━━━━━━━━━━━━━━━━━━━
Scenic background with a phone mockup showing an image, bold headline,
accent bars, and brand logo.
Reference: MakeMyTrip "It's Been Long Since You've Booked a Trip" banner.

Config keys:
    headline        – "It's Been Long"
    subheadline     – "Since You've Booked a Trip with Us!"
    phone_image     – path to image shown inside the phone screen
    logo_path       – brand logo file
    accent_bars     – list of RGB colors for decorative bars
    headline_font   – "montserrat" (default)
    tc_text         – "*T&Cs Apply"
    phone_width     – phone width in px (default auto-scaled)
    overlay_darken  – 0.0–1.0 background darkening (default 0.15)
"""
from __future__ import annotations

from typing import Optional

from PIL import Image

from engine.core import BaseTemplate, Dimensions, INSTAGRAM, WHITE, BLACK
from engine.text import TextRenderer, ShadowCfg
from engine.effects import Effects
from engine.components import Components


class PhoneMockupTemplate(BaseTemplate):
    """Scenic background + phone mockup + bold headline."""

    def __init__(self, dims: Dimensions = INSTAGRAM["4:5"]) -> None:
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
        darken = config.get("overlay_darken", 0.15)

        # ── Background ───────────────────────────────────────────────
        if base_image:
            canvas = self.cover_crop(base_image.convert("RGBA"), self.w, self.h)
        else:
            canvas = Effects.linear_gradient(
                self.w, self.h,
                (135, 180, 210),
                (80, 120, 160),
                "vertical",
            )

        # Subtle darkening for text contrast
        if darken > 0:
            dark_overlay = Image.new("RGBA", (self.w, self.h), (0, 0, 0, round(255 * darken)))
            canvas.alpha_composite(dark_overlay)

        # Soft gradient at top for text
        canvas = Effects.gradient_overlay(
            canvas,
            start=(255, 255, 255, 80),
            end=(255, 255, 255, 0),
            direction="top_down",
            coverage=0.35,
        )

        center_x = self.w // 2
        shadow = ShadowCfg(offset=(3, 4), blur=10, color=(0, 0, 0, 140))

        # ── Logo (centered top) ──────────────────────────────────────
        content_y = self.px(0.03, "h")
        if logo_path:
            Components.place_logo_centered(
                canvas, logo_path, y=content_y,
                max_height=self.px(0.04, "h"),
            )
            content_y += self.px(0.06, "h")
        else:
            content_y += self.px(0.04, "h")

        # ── Headline ─────────────────────────────────────────────────
        max_w = self.px(0.85)
        h_font = TextRenderer.fit_font_size(
            headline, "montserrat-black", max_w, max_size=110, min_size=50
        )
        TextRenderer.draw(
            canvas, (center_x, content_y), headline,
            h_font, color=BLACK, anchor="mt", shadow=None,
        )
        _, hh = TextRenderer.measure(headline, h_font)
        content_y += hh + 16

        # ── Subheadline ──────────────────────────────────────────────
        sub_font = self.font("montserrat-semibold", 36)
        wrapped_sub = TextRenderer.word_wrap(subheadline, sub_font, max_w)
        TextRenderer.draw_multiline(
            canvas, (center_x, content_y), wrapped_sub,
            sub_font, color=(60, 60, 60), spacing=8, align="center", anchor="ma",
        )
        _, sh = TextRenderer.measure_multiline(wrapped_sub, sub_font, 8)
        content_y += sh + 25

        # ── Accent bars (centered) ───────────────────────────────────
        if accent_colors:
            bar_w, bar_gap = 40, 6
            total_w = len(accent_colors) * bar_w + (len(accent_colors) - 1) * bar_gap
            Components.accent_bars(
                canvas,
                position=(center_x - total_w // 2, content_y),
                colors=accent_colors,
                bar_width=bar_w,
                bar_height=4,
                gap=bar_gap,
            )
            content_y += 30

        # ── Phone mockup ─────────────────────────────────────────────
        phone_w = config.get("phone_width", self.px(0.38))
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

        # Center phone horizontally, place below text
        phone_x = center_x - phone.width // 2
        phone_y = content_y + 10

        # Ensure phone doesn't overflow bottom too much (allow partial cutoff for effect)
        max_phone_h = self.h - phone_y + self.px(0.08, "h")
        if phone.height > max_phone_h:
            ratio = max_phone_h / phone.height
            phone = phone.resize(
                (round(phone.width * ratio), round(phone.height * ratio)),
                Image.LANCZOS,
            )
            phone_x = center_x - phone.width // 2

        canvas.alpha_composite(phone, (phone_x, phone_y))

        # ── T&C ──────────────────────────────────────────────────────
        Components.tc_text(canvas, tc_text, color=(80, 80, 80, 200))

        return canvas
