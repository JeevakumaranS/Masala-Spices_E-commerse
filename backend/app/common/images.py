"""Helpers for building storefront image URLs."""


def unsplash(photo_id: str, width: int = 1200) -> str:
    """Return a verified Unsplash CDN URL."""
    return f"https://images.unsplash.com/{photo_id}?auto=format&fit=crop&w={width}&q=80"
