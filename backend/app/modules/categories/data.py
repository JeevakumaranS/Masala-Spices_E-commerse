"""In-memory category seed data used during local development."""

from typing import Any

sample_categories: list[dict[str, Any]] = [
    {
        "name": "Breakfast Masalas",
        "slug": "breakfast-masalas",
        "type": "product_type",
        "description": "Quick, aromatic blends for everyday meals.",
    },
    {
        "name": "South Indian",
        "slug": "south-indian",
        "type": "region",
        "description": "Classic flavours from the south.",
    },
    {
        "name": "North Indian",
        "slug": "north-indian",
        "type": "region",
        "description": "Comforting, indulgent spice profiles.",
    },
]

sample_categories.extend(
    [
        {"name": "Masala Powders", "slug": "masala-powders", "type": "product_type", "description": "Everyday ground masalas for quick, flavourful cooking."},
        {"name": "Spice Blends", "slug": "spice-blends", "type": "product_type", "description": "Balanced blends for regional dishes and family favourites."},
        {"name": "Curry Pastes", "slug": "curry-pastes", "type": "product_type", "description": "Ready-to-cook pastes for rich curries."},
        {"name": "Podis", "slug": "podis", "type": "product_type", "description": "South Indian podis for rice, idli and dosa."},
        {"name": "Pickles", "slug": "pickles", "type": "product_type", "description": "Bright, punchy accompaniments."},
        {"name": "Pure Spices", "slug": "pure-spices", "type": "product_type", "description": "Single-origin whole and ground spices."},
        {"name": "Recipe Kits", "slug": "recipe-kits", "type": "product_type", "description": "Measured spice kits for reliable home cooking."},
        {"name": "Combos & Packs", "slug": "combos-packs", "type": "product_type", "description": "Curated pantry bundles at better value."},
        {"name": "Tamil Nadu", "slug": "tamil-nadu", "type": "region", "description": "Bold, aromatic blends from Tamil kitchens."},
        {"name": "Kerala / Malabar", "slug": "kerala-malabar", "type": "region", "description": "Warm, toasted Malabar profiles."},
        {"name": "Andhra", "slug": "andhra", "type": "region", "description": "Chilli-forward Andhra flavours."},
        {"name": "Chettinad", "slug": "chettinad", "type": "region", "description": "Peppery, roasted Chettinad masalas."},
        {"name": "Hyderabadi", "slug": "hyderabadi", "type": "region", "description": "Layered blends for fragrant biryani."},
        {"name": "Biryani", "slug": "biryani", "type": "dish", "description": "Masalas for layered rice dishes."},
        {"name": "Fried Rice", "slug": "fried-rice", "type": "dish", "description": "Fast, savoury blends for rice meals."},
        {"name": "Kulambu Masalas", "slug": "kulambu-masalas", "type": "dish", "description": "Deep, warming curry blends."},
        {"name": "Fry / Varuval", "slug": "fry-varuval", "type": "dish", "description": "Roasted spice blends for crisp fries."},
        {"name": "Sambar / Rasam", "slug": "sambar-rasam", "type": "dish", "description": "Comforting South Indian staples."},
        {"name": "Bestsellers", "slug": "bestsellers", "type": "collection", "description": "Customer favourites, selected from the catalogue."},
        {"name": "New Launches", "slug": "new-launches", "type": "collection", "description": "Recently added blends and pantry ideas."},
    ]
)
