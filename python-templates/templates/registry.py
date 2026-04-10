"""
Template registry: maps slug names to template classes.
"""
from __future__ import annotations

from typing import Type

from engine.core import BaseTemplate

# Lazy imports to avoid circular deps
_REGISTRY: dict[str, Type[BaseTemplate]] = {}


def _ensure_loaded() -> None:
    if _REGISTRY:
        return
    from .promo_collage import PromoCollageTemplate
    from .hotel_feature import HotelFeatureTemplate
    from .phone_mockup import PhoneMockupTemplate
    from .photo_board import PhotoBoardTemplate
    from .minimal_cta import MinimalCTATemplate

    _REGISTRY.update({
        "promo-collage": PromoCollageTemplate,
        "hotel-feature": HotelFeatureTemplate,
        "phone-mockup": PhoneMockupTemplate,
        "photo-board": PhotoBoardTemplate,
        "minimal-cta": MinimalCTATemplate,
    })


class TemplateRegistry:
    """Central registry for all Python-based design templates."""

    @staticmethod
    def get(slug: str) -> BaseTemplate:
        _ensure_loaded()
        cls = _REGISTRY.get(slug)
        if cls is None:
            raise ValueError(
                f"Unknown template: {slug!r}. Available: {sorted(_REGISTRY)}"
            )
        return cls()

    @staticmethod
    def list_templates() -> list[str]:
        _ensure_loaded()
        return sorted(_REGISTRY.keys())

    @staticmethod
    def register(slug: str, cls: Type[BaseTemplate]) -> None:
        _REGISTRY[slug] = cls
