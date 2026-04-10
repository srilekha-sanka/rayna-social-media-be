"""
Visual effects: gradients, shadows, polaroid frames, phone mockups,
background patterns, vignettes, rounded rectangles.
"""
from __future__ import annotations

import math
from typing import Optional, Tuple

from PIL import Image, ImageDraw, ImageFilter

from .core import Color, WHITE, BLACK, TRANSPARENT


class Effects:
    """Stateless collection of image-manipulation effects."""

    # ── Gradients ────────────────────────────────────────────────────

    @staticmethod
    def linear_gradient(
        width: int,
        height: int,
        start: Color,
        end: Color,
        direction: str = "vertical",
    ) -> Image.Image:
        """Generate a smooth linear gradient.

        *direction*: ``vertical`` (top→bottom), ``horizontal`` (left→right),
        or ``diagonal`` (top-left→bottom-right).
        """
        img = Image.new("RGBA", (width, height))
        sc = _rgba(start)
        ec = _rgba(end)

        if direction == "horizontal":
            for x in range(width):
                t = x / max(width - 1, 1)
                c = _lerp_color(sc, ec, t)
                ImageDraw.Draw(img).line([(x, 0), (x, height)], fill=c)
        elif direction == "diagonal":
            max_dist = width + height - 2 or 1
            for y in range(height):
                for x in range(width):
                    t = (x + y) / max_dist
                    img.putpixel((x, y), _lerp_color(sc, ec, t))
        else:  # vertical
            for y in range(height):
                t = y / max(height - 1, 1)
                c = _lerp_color(sc, ec, t)
                ImageDraw.Draw(img).line([(0, y), (width, y)], fill=c)

        return img

    @staticmethod
    def gradient_overlay(
        image: Image.Image,
        start: Color = (0, 0, 0, 200),
        end: Color = (0, 0, 0, 0),
        direction: str = "bottom_up",
        coverage: float = 0.5,
    ) -> Image.Image:
        """Composite a gradient overlay onto *image*.

        *direction*: ``bottom_up``, ``top_down``, ``left_right``, ``right_left``.
        *coverage*: fraction of the image that the gradient spans.
        """
        w, h = image.size
        grad_h = round(h * coverage) if direction in ("bottom_up", "top_down") else h
        grad_w = round(w * coverage) if direction in ("left_right", "right_left") else w

        vert = direction in ("bottom_up", "top_down")
        if direction in ("bottom_up", "right_left"):
            grad = Effects.linear_gradient(
                grad_w, grad_h, end, start,
                "vertical" if vert else "horizontal",
            )
        else:
            grad = Effects.linear_gradient(
                grad_w, grad_h, start, end,
                "vertical" if vert else "horizontal",
            )

        overlay = Image.new("RGBA", (w, h), TRANSPARENT)
        if direction == "bottom_up":
            overlay.paste(grad, (0, h - grad_h))
        elif direction == "top_down":
            overlay.paste(grad, (0, 0))
        elif direction == "left_right":
            overlay.paste(grad, (0, 0))
        else:
            overlay.paste(grad, (w - grad_w, 0))

        result = image.copy().convert("RGBA")
        result.alpha_composite(overlay)
        return result

    @staticmethod
    def multi_gradient_overlay(
        image: Image.Image,
        overlays: list[dict],
    ) -> Image.Image:
        """Apply multiple gradient overlays in sequence.

        Each entry: ``{start, end, direction, coverage}``.
        """
        result = image.copy().convert("RGBA")
        for ov in overlays:
            result = Effects.gradient_overlay(
                result,
                start=ov.get("start", (0, 0, 0, 200)),
                end=ov.get("end", (0, 0, 0, 0)),
                direction=ov.get("direction", "bottom_up"),
                coverage=ov.get("coverage", 0.5),
            )
        return result

    # ── Shadows ──────────────────────────────────────────────────────

    @staticmethod
    def drop_shadow(
        layer: Image.Image,
        offset: Tuple[int, int] = (8, 8),
        blur: int = 15,
        color: Color = (0, 0, 0, 100),
    ) -> Image.Image:
        """Return a new RGBA image containing a blurred drop shadow of *layer*."""
        pad = blur * 3
        sw = layer.width + pad * 2
        sh = layer.height + pad * 2
        shadow = Image.new("RGBA", (sw, sh), TRANSPARENT)

        # Flatten alpha channel into the shadow color
        alpha = layer.split()[-1]
        flat = Image.new("RGBA", layer.size, _rgba(color))
        flat.putalpha(alpha)
        shadow.paste(flat, (pad + offset[0], pad + offset[1]))
        shadow = shadow.filter(ImageFilter.GaussianBlur(blur))
        return shadow

    # ── Polaroid frame ───────────────────────────────────────────────

    @staticmethod
    def polaroid_frame(
        photo: Image.Image,
        border: int = 14,
        shadow_offset: Tuple[int, int] = (6, 6),
        shadow_blur: int = 18,
        rotation: float = 0.0,
    ) -> Image.Image:
        """Wrap *photo* in a white polaroid border with drop shadow, optionally rotated."""
        pw, ph = photo.size
        frame_w = pw + border * 2
        frame_h = ph + border * 2

        frame = Image.new("RGBA", (frame_w, frame_h), WHITE + (255,))
        frame.paste(photo, (border, border))

        if rotation != 0:
            frame = frame.rotate(rotation, resample=Image.BICUBIC, expand=True)

        # Build shadow behind frame
        shadow = Effects.drop_shadow(
            frame, offset=shadow_offset, blur=shadow_blur, color=(0, 0, 0, 80)
        )

        # Composite frame on top of shadow
        pad = shadow_blur * 3
        result = shadow.copy()
        result.alpha_composite(frame, (pad, pad))
        return result

    # ── Phone mockup ─────────────────────────────────────────────────

    @staticmethod
    def phone_mockup(
        screen_image: Image.Image,
        phone_width: int = 380,
        corner_radius: int = 36,
        bezel: int = 10,
        bezel_color: Color = (25, 25, 25),
        notch_height: int = 28,
    ) -> Image.Image:
        """Render *screen_image* inside a phone-shaped frame."""
        screen_w = phone_width - bezel * 2
        aspect_ratio = 19.5 / 9  # modern phone
        screen_h = round(screen_w * aspect_ratio)
        phone_h = screen_h + bezel * 2

        # Resize screen image to fill
        screen = screen_image.copy().convert("RGBA")
        sr = screen.width / screen.height
        tr = screen_w / screen_h
        if sr > tr:
            nw = round(screen.height * tr)
            off = (screen.width - nw) // 2
            screen = screen.crop((off, 0, off + nw, screen.height))
        else:
            nh = round(screen.width / tr)
            off = (screen.height - nh) // 2
            screen = screen.crop((0, off, screen.width, off + nh))
        screen = screen.resize((screen_w, screen_h), Image.LANCZOS)

        # Phone body: rounded rectangle
        body = Image.new("RGBA", (phone_width, phone_h), TRANSPARENT)
        body_draw = ImageDraw.Draw(body)
        body_draw.rounded_rectangle(
            [0, 0, phone_width - 1, phone_h - 1],
            radius=corner_radius,
            fill=_rgba(bezel_color),
        )

        # Screen area: slightly smaller rounded rectangle
        screen_mask = Image.new("L", (screen_w, screen_h), 0)
        sm_draw = ImageDraw.Draw(screen_mask)
        inner_r = max(corner_radius - bezel, 8)
        sm_draw.rounded_rectangle(
            [0, 0, screen_w - 1, screen_h - 1],
            radius=inner_r,
            fill=255,
        )
        body.paste(screen, (bezel, bezel), screen_mask)

        # Notch
        notch_w = round(phone_width * 0.35)
        notch_x = (phone_width - notch_w) // 2
        body_draw.rounded_rectangle(
            [notch_x, 0, notch_x + notch_w, notch_height],
            radius=notch_height // 2,
            fill=_rgba(bezel_color),
        )

        # Shadow
        shadow = Effects.drop_shadow(body, offset=(0, 10), blur=25, color=(0, 0, 0, 60))
        pad = 25 * 3
        result = shadow.copy()
        result.alpha_composite(body, (pad, pad))
        return result

    # ── Background patterns ──────────────────────────────────────────

    @staticmethod
    def striped_background(
        width: int,
        height: int,
        bg_color: Color = (220, 228, 235),
        stripe_color: Color = (200, 210, 220, 60),
        stripe_width: int = 1,
        spacing: int = 28,
    ) -> Image.Image:
        """Vertical striped background pattern."""
        img = Image.new("RGBA", (width, height), _rgba(bg_color))
        draw = ImageDraw.Draw(img)
        sc = _rgba(stripe_color)
        x = 0
        while x < width:
            draw.line([(x, 0), (x, height)], fill=sc, width=stripe_width)
            x += spacing
        return img

    @staticmethod
    def wood_texture(
        width: int,
        height: int,
        base_color: Color = (180, 155, 130),
        grain_color: Color = (160, 135, 110, 80),
        plank_width: int = 120,
    ) -> Image.Image:
        """Faux wood-plank texture via vertical planks + horizontal grain lines."""
        img = Image.new("RGBA", (width, height), _rgba(base_color))
        draw = ImageDraw.Draw(img)
        gc = _rgba(grain_color)

        # Planks — vertical dividers
        x = plank_width
        while x < width:
            draw.line(
                [(x, 0), (x, height)],
                fill=(120, 95, 70, 100),
                width=2,
            )
            # Slight color variation per plank
            shift = (x // plank_width) % 3
            if shift == 1:
                overlay = Image.new("RGBA", (plank_width, height), (0, 0, 0, 12))
                img.alpha_composite(overlay, (x, 0))
            elif shift == 2:
                overlay = Image.new("RGBA", (plank_width, height), (255, 255, 255, 8))
                img.alpha_composite(overlay, (x - plank_width, 0))
            x += plank_width

        # Grain — faint horizontal lines
        y = 6
        while y < height:
            draw.line([(0, y), (width, y)], fill=gc, width=1)
            y += 8 + (y % 5)

        return img

    # ── Vignette ─────────────────────────────────────────────────────

    @staticmethod
    def vignette(
        image: Image.Image,
        intensity: float = 0.5,
    ) -> Image.Image:
        """Darken edges with a radial vignette."""
        w, h = image.size
        cx, cy = w // 2, h // 2
        max_r = math.sqrt(cx * cx + cy * cy)

        vig = Image.new("RGBA", (w, h), TRANSPARENT)
        for y in range(h):
            for x in range(w):
                r = math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
                t = min(r / max_r, 1.0)
                # quadratic falloff
                alpha = round(255 * intensity * t * t)
                vig.putpixel((x, y), (0, 0, 0, alpha))

        result = image.copy().convert("RGBA")
        result.alpha_composite(vig)
        return result

    @staticmethod
    def vignette_fast(
        image: Image.Image,
        intensity: float = 0.5,
    ) -> Image.Image:
        """Fast vignette using concentric ellipses (much faster than per-pixel)."""
        w, h = image.size
        vig = Image.new("L", (w, h), 0)
        draw = ImageDraw.Draw(vig)

        steps = 40
        for i in range(steps):
            t = i / steps
            alpha = round(255 * intensity * t * t)
            # Shrink ellipse from outside in
            margin_x = round(w * 0.5 * (1 - t))
            margin_y = round(h * 0.5 * (1 - t))
            if margin_x <= 0 and margin_y <= 0:
                continue
            draw.ellipse(
                [margin_x, margin_y, w - margin_x, h - margin_y],
                fill=0,
            )

        # Invert: we drew "clear" regions; fill outside with darkness
        vig_layer = Image.new("RGBA", (w, h), TRANSPARENT)
        for step_i in range(steps, 0, -1):
            t = step_i / steps
            alpha = round(255 * intensity * t * t)
            frac = 1 - step_i / steps
            mx = round(w * 0.5 * frac)
            my = round(h * 0.5 * frac)
            ring = Image.new("RGBA", (w, h), TRANSPARENT)
            rd = ImageDraw.Draw(ring)
            rd.ellipse([mx, my, w - mx, h - my], fill=(0, 0, 0, alpha))
            vig_layer = Image.alpha_composite(vig_layer, ring)

        result = image.copy().convert("RGBA")
        result.alpha_composite(vig_layer)
        return result

    # ── Rounded rectangle image ──────────────────────────────────────

    @staticmethod
    def rounded_rect_image(
        width: int,
        height: int,
        radius: int,
        fill: Color = WHITE,
        border: Optional[Tuple[int, Color]] = None,
    ) -> Image.Image:
        """Create a rounded-rectangle RGBA image."""
        img = Image.new("RGBA", (width, height), TRANSPARENT)
        draw = ImageDraw.Draw(img)
        kw: dict = {"fill": _rgba(fill)}
        if border:
            kw["outline"] = _rgba(border[1])
            kw["width"] = border[0]
        draw.rounded_rectangle([0, 0, width - 1, height - 1], radius=radius, **kw)
        return img


# ── Internal helpers ─────────────────────────────────────────────────


def _rgba(c) -> Tuple[int, int, int, int]:
    c = tuple(c)  # handle JSON lists
    if len(c) == 4:
        return c  # type: ignore[return-value]
    return c + (255,)  # type: ignore[return-value]


def _lerp_color(
    a: Tuple[int, int, int, int], b: Tuple[int, int, int, int], t: float
) -> Tuple[int, int, int, int]:
    return (
        round(a[0] + (b[0] - a[0]) * t),
        round(a[1] + (b[1] - a[1]) * t),
        round(a[2] + (b[2] - a[2]) * t),
        round(a[3] + (b[3] - a[3]) * t),
    )
