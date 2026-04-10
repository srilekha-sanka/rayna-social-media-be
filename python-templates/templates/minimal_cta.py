"""
Template: Minimal CTA Banner
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Clean, full-bleed background with a large headline, optional subheadline,
and a prominent call-to-action button at the bottom.

Config keys:
    headline        – "Desert Safari"
    subheadline     – "Experience the thrill of the golden dunes"
    cta_text        – "Book Now"
    logo_path       – brand logo file
    accent_color    – CTA button color (default orange)
    headline_font   – "montserrat" | "playfair" | "bebas" (default montserrat)
    headline_position – "bottom" | "center" | "top" (default bottom)
    gradient_intensity – 0.0–1.0 (default 0.6)
    vignette        – true/false (default true)
    tc_text         – "*T&C apply"
    coupon_code     – optional coupon code
    coupon_label    – "Use Code:"
"""
from __future__ import annotations

from typing import Optional

from PIL import Image, ImageDraw

from engine.core import BaseTemplate, Dimensions, INSTAGRAM, WHITE, BLACK
from engine.text import TextRenderer, ShadowCfg, OutlineCfg
from engine.effects import Effects
from engine.components import Components


ORANGE = (234, 88, 12)


class MinimalCTATemplate(BaseTemplate):
    """Full-bleed image + large headline + CTA button."""

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
        h_font_name = config.get("headline_font", "montserrat")
        h_pos = config.get("headline_position", "bottom")
        grad_intensity = config.get("gradient_intensity", 0.6)
        use_vignette = config.get("vignette", True)
        tc_text = config.get("tc_text", "*T&C apply")
        coupon_code = config.get("coupon_code", "")
        coupon_label = config.get("coupon_label", "Use Code:")

        # ── Background ───────────────────────────────────────────────
        if base_image:
            canvas = self.cover_crop(base_image.convert("RGBA"), self.w, self.h)
        else:
            canvas = Effects.linear_gradient(
                self.w, self.h, (40, 60, 90), (20, 30, 50), "vertical"
            )

        # Vignette
        if use_vignette:
            canvas = Effects.vignette_fast(canvas, intensity=0.3)

        # Gradient overlay based on position
        grad_alpha = round(255 * grad_intensity)
        if h_pos == "bottom":
            canvas = Effects.gradient_overlay(
                canvas,
                start=(0, 0, 0, grad_alpha),
                end=(0, 0, 0, 0),
                direction="bottom_up",
                coverage=0.55,
            )
        elif h_pos == "top":
            canvas = Effects.gradient_overlay(
                canvas,
                start=(0, 0, 0, grad_alpha),
                end=(0, 0, 0, 0),
                direction="top_down",
                coverage=0.55,
            )
        else:  # center
            canvas = Effects.multi_gradient_overlay(canvas, [
                {"start": (0, 0, 0, round(grad_alpha * 0.5)), "end": (0, 0, 0, 0), "direction": "bottom_up", "coverage": 0.4},
                {"start": (0, 0, 0, round(grad_alpha * 0.5)), "end": (0, 0, 0, 0), "direction": "top_down", "coverage": 0.4},
            ])

        center_x = self.w // 2
        shadow = ShadowCfg(offset=(3, 3), blur=10, color=(0, 0, 0, 160))

        # ── Logo (centered top) ──────────────────────────────────────
        if logo_path:
            Components.place_logo_centered(
                canvas, logo_path,
                y=self.px(0.03, "h"),
                max_height=self.px(0.04, "h"),
            )

        # ── Content positioning ──────────────────────────────────────
        if h_pos == "bottom":
            text_anchor_y = self.px(0.65, "h")
        elif h_pos == "top":
            text_anchor_y = self.px(0.12, "h")
        else:
            text_anchor_y = self.px(0.35, "h")

        # ── Headline ─────────────────────────────────────────────────
        max_w = self.px(0.85)
        # Use bold variant if available
        bold_font = h_font_name
        if h_font_name == "montserrat":
            bold_font = "montserrat-black"
        h_font = TextRenderer.fit_font_size(
            headline, bold_font, max_w, max_size=120, min_size=44
        )
        wrapped = TextRenderer.word_wrap(headline, h_font, max_w)
        TextRenderer.draw_multiline(
            canvas, (center_x, text_anchor_y), wrapped,
            h_font, color=WHITE, spacing=10, align="center", anchor="ma",
            shadow=shadow,
        )
        _, hh = TextRenderer.measure_multiline(wrapped, h_font, 10)
        content_y = text_anchor_y + hh // 2 + 20

        # ── Subheadline ──────────────────────────────────────────────
        if subheadline:
            sub_font = self.font("montserrat-medium", 30)
            sub_wrapped = TextRenderer.word_wrap(subheadline, sub_font, max_w)
            TextRenderer.draw_multiline(
                canvas, (center_x, content_y), sub_wrapped,
                sub_font, color=(220, 220, 220), spacing=6, align="center",
                anchor="ma", shadow=ShadowCfg(offset=(2, 2), blur=4, color=(0, 0, 0, 100)),
            )
            _, sh = TextRenderer.measure_multiline(sub_wrapped, sub_font, 6)
            content_y += sh // 2 + 25

        # ── CTA button ───────────────────────────────────────────────
        if cta_text:
            self._draw_cta_button(canvas, center_x, content_y, cta_text, accent)
            content_y += 70

        # ── Coupon badge (optional) ──────────────────────────────────
        if coupon_code:
            from engine.core import FontRegistry
            lf = FontRegistry.get("montserrat", 24)
            cf = FontRegistry.get("montserrat", 26)
            lw, _ = TextRenderer.measure(coupon_label, lf)
            cw, _ = TextRenderer.measure(coupon_code, cf)
            pad_x = round(44 * 0.45)
            total_w = (lw + pad_x * 2) + (cw + pad_x * 2)
            badge_x = center_x - total_w // 2

            Components.coupon_badge(
                canvas,
                position=(badge_x, content_y),
                code=coupon_code,
                label=coupon_label,
                label_bg=accent,
                font_size=24,
                height=44,
            )

        # ── T&C ──────────────────────────────────────────────────────
        Components.tc_text(canvas, tc_text, color=(255, 255, 255, 150))

        return canvas

    def _draw_cta_button(
        self,
        canvas: Image.Image,
        cx: int,
        cy: int,
        text: str,
        bg_color,
    ) -> None:
        """Draw a rounded CTA button centered at (cx, cy)."""
        btn_font = self.font("montserrat-bold", 28)
        tw, th = TextRenderer.measure(text, btn_font)

        pad_x = 50
        pad_y = 16
        btn_w = tw + pad_x * 2
        btn_h = th + pad_y * 2
        bx = cx - btn_w // 2
        by = cy

        # Button shadow
        shadow_layer = Image.new("RGBA", (btn_w + 40, btn_h + 40), (0, 0, 0, 0))
        sd = ImageDraw.Draw(shadow_layer)
        sd.rounded_rectangle(
            [20, 20, 20 + btn_w, 20 + btn_h],
            radius=btn_h // 2,
            fill=(0, 0, 0, 60),
        )
        from PIL import ImageFilter
        shadow_layer = shadow_layer.filter(ImageFilter.GaussianBlur(8))
        canvas.alpha_composite(shadow_layer, (bx - 20, by - 16))

        # Button background
        draw = ImageDraw.Draw(canvas)
        bc = bg_color + (255,) if len(bg_color) == 3 else bg_color
        draw.rounded_rectangle(
            [bx, by, bx + btn_w, by + btn_h],
            radius=btn_h // 2,
            fill=bc,
        )

        # Button text
        draw.text(
            (cx, by + pad_y),
            text,
            fill=WHITE,
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
