#!/usr/bin/env python3
"""
CLI entry point for Python template rendering.

Usage (from NestJS via child_process):
    echo '{"template": "promo-collage", "config": {...}, "base_image": "/path/img.jpg", "output": "/path/out.png"}' | python3 render.py

Or standalone:
    python3 render.py --template promo-collage --config '{"headline": "20% OFF"}' --output out.png

Returns JSON to stdout:
    {"ok": true, "output": "/abs/path/out.png", "width": 1080, "height": 1350}
    {"ok": false, "error": "..."}
"""
from __future__ import annotations

import json
import sys
import argparse
from pathlib import Path

# Add parent to path so we can import the engine
sys.path.insert(0, str(Path(__file__).resolve().parent))

try:
    import pillow_avif  # noqa: F401 — enables AVIF support in Pillow
except ImportError:
    pass

from templates.registry import TemplateRegistry
from engine.core import INSTAGRAM


def main() -> None:
    # ── Parse input ──────────────────────────────────────────────────
    # Priority: CLI args > stdin JSON
    parser = argparse.ArgumentParser(description="Render a Pillow design template")
    parser.add_argument("--template", "-t", help="Template slug")
    parser.add_argument("--config", "-c", help="JSON config string")
    parser.add_argument("--base-image", "-b", help="Path to base image")
    parser.add_argument("--output", "-o", help="Output file path")
    parser.add_argument("--format", "-f", default="PNG", help="Output format (PNG|JPEG)")
    parser.add_argument("--aspect-ratio", "-a", default="4:5", help="Aspect ratio")
    parser.add_argument("--list", action="store_true", help="List available templates")
    args = parser.parse_args()

    if args.list:
        templates = TemplateRegistry.list_templates()
        print(json.dumps({"ok": True, "templates": templates}))
        return

    # Read from stdin if no CLI template specified
    if not args.template:
        try:
            stdin_data = json.loads(sys.stdin.read())
        except (json.JSONDecodeError, ValueError) as e:
            _error(f"Invalid JSON input: {e}")
            return

        template_slug = stdin_data.get("template", "")
        config = stdin_data.get("config", {})
        base_image_path = stdin_data.get("base_image", "")
        output_path = stdin_data.get("output", "")
        fmt = stdin_data.get("format", "PNG")
        aspect = stdin_data.get("aspect_ratio", "4:5")
    else:
        template_slug = args.template
        config = json.loads(args.config) if args.config else {}
        base_image_path = args.base_image or ""
        output_path = args.output or ""
        fmt = args.format
        aspect = args.aspect_ratio

    if not template_slug:
        _error("No template specified")
        return

    if not output_path:
        output_path = f"/tmp/pillow-render-{template_slug}.png"

    # ── Render ───────────────────────────────────────────────────────
    try:
        dims = INSTAGRAM.get(aspect)
        if not dims:
            _error(f"Unknown aspect ratio: {aspect}")
            return

        template = TemplateRegistry.get(template_slug)
        template.dims = dims
        template.w = dims.width
        template.h = dims.height

        # Load base image if provided
        base_image = None
        if base_image_path:
            from PIL import Image
            base_image = Image.open(base_image_path).convert("RGBA")

        result = template.render(config, base_image)

        # Save output
        output = Path(output_path)
        output.parent.mkdir(parents=True, exist_ok=True)

        save_kwargs: dict = {"format": fmt.upper()}
        if fmt.upper() == "JPEG":
            result = result.convert("RGB")
            save_kwargs["quality"] = 95

        result.save(str(output), **save_kwargs)

        print(json.dumps({
            "ok": True,
            "output": str(output.resolve()),
            "width": result.width,
            "height": result.height,
        }))

    except Exception as e:
        _error(str(e))


def _error(msg: str) -> None:
    print(json.dumps({"ok": False, "error": msg}))
    sys.exit(1)


if __name__ == "__main__":
    main()
