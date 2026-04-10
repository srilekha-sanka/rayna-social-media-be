#!/usr/bin/env python3
"""
Render all Python templates with sample data for visual inspection.

Usage:
    cd python-templates && python3 render_samples.py

Output: ../scripts/output/py-{template}.png
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from engine.core import INSTAGRAM, OUTPUT_DIR, ASSETS_DIR
from templates.registry import TemplateRegistry


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    dims = INSTAGRAM["4:5"]

    logo_path = str(ASSETS_DIR / "rayna-logo.png")
    logo_exists = (ASSETS_DIR / "rayna-logo.png").exists()

    samples: dict[str, dict] = {
        "promo-collage": {
            "config": {
                "headline": "Get up to 20% OFF*",
                "subheadline": "on Tours & Attractions",
                "coupon_code": "RAYNOW",
                "logo_path": logo_path if logo_exists else "",
                "bg_type": "gradient",
                "accent_color": (234, 88, 12),
                # photos would go here if available
            },
        },
        "promo-collage-striped": {
            "template_slug": "promo-collage",
            "config": {
                "headline": "Get up to 20% OFF*",
                "subheadline": "on Tours & Attractions",
                "coupon_code": "RAYNOW",
                "logo_path": logo_path if logo_exists else "",
                "bg_type": "striped",
                "accent_color": (234, 88, 12),
            },
        },
        "hotel-feature": {
            "config": {
                "pre_headline": "For that Dream Trip:",
                "headline": "GRAB UP TO\n25% OFF*",
                "subheadline": "on International Hotels",
                "coupon_code": "MYTRIP",
                "logo_path": logo_path if logo_exists else "",
                "accent_color": (234, 88, 12),
                "features": [
                    {"icon": "\u2205", "text": "Choose from a range\nof stays @ \u20b90"},
                    {"icon": "\u2302", "text": "Choose from a range\nof stays with\nFREE* Cancellation"},
                    {"icon": "\u2713", "text": "Verified User\nReviews & Ratings"},
                    {"icon": "\u25a3", "text": "Real Photographs\nby Guests"},
                    {"icon": "\u25c9", "text": "Detailed Info on\nLocation, Amenities,\nRestaurants"},
                ],
            },
        },
        "phone-mockup": {
            "config": {
                "headline": "It's Been Long",
                "subheadline": "Since You've Booked a Trip with Us!",
                "logo_path": logo_path if logo_exists else "",
                "accent_bars": [(37, 99, 235), (220, 38, 38)],
            },
        },
        "photo-board": {
            "config": {
                "headline": "Get up to 20% OFF*",
                "subheadline": "on Tours & Attractions",
                "coupon_code": "MMTSPECIAL",
                "logo_path": logo_path if logo_exists else "",
                "bg_texture": "wood",
                "accent_color": (234, 88, 12),
            },
        },
        "minimal-cta": {
            "config": {
                "headline": "Dubai Desert Safari",
                "subheadline": "Experience the thrill of the golden dunes",
                "cta_text": "Book Now",
                "logo_path": logo_path if logo_exists else "",
                "accent_color": (234, 88, 12),
                "headline_position": "bottom",
                "coupon_code": "RAYNOW",
            },
        },
    }

    print(f"Rendering {len(samples)} sample templates to {OUTPUT_DIR}/")
    print("=" * 60)

    for name, sample in samples.items():
        slug = sample.get("template_slug", name)
        config = sample["config"]
        output_file = OUTPUT_DIR / f"py-{name}.png"

        try:
            template = TemplateRegistry.get(slug)
            template.dims = dims
            template.w = dims.width
            template.h = dims.height

            result = template.render(config)
            result.save(str(output_file), format="PNG")
            print(f"  [OK] {name:30s} -> {output_file.name}")
        except Exception as e:
            print(f"  [ERR] {name:30s} -> {e}")

    print("=" * 60)
    print("Done.")


if __name__ == "__main__":
    main()
