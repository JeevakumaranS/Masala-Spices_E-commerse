"""In-memory category seed data used during local development."""

from typing import Any

sample_categories: list[dict[str, Any]] = [
    {
        "id": 1,
        "name": "Breakfast Masalas",
        "slug": "breakfast-masalas",
        "type": "product_type",
        "description": "Quick, aromatic blends for everyday meals.",
    },
    {
        "id": 2,
        "name": "South Indian",
        "slug": "south-indian",
        "type": "region",
        "description": "Classic flavours from the south.",
    },
    {
        "id": 3,
        "name": "North Indian",
        "slug": "north-indian",
        "type": "region",
        "description": "Comforting, indulgent spice profiles.",
    },
]

sample_categories.extend(
    [
        {"id": 4, "name": "Masala Powders", "slug": "masala-powders", "type": "product_type", "description": "Everyday ground masalas for quick, flavourful cooking."},
        {"id": 5, "name": "Spice Blends", "slug": "spice-blends", "type": "product_type", "description": "Balanced blends for regional dishes and family favourites."},
        {"id": 6, "name": "Curry Pastes", "slug": "curry-pastes", "type": "product_type", "description": "Ready-to-cook pastes for rich curries."},
        {"id": 7, "name": "Podis", "slug": "podis", "type": "product_type", "description": "South Indian podis for rice, idli and dosa."},
        {"id": 8, "name": "Pickles", "slug": "pickles", "type": "product_type", "description": "Bright, punchy accompaniments."},
        {"id": 9, "name": "Pure Spices", "slug": "pure-spices", "type": "product_type", "description": "Single-origin whole and ground spices."},
        {"id": 10, "name": "Recipe Kits", "slug": "recipe-kits", "type": "product_type", "description": "Measured spice kits for reliable home cooking."},
        {"id": 11, "name": "Combos & Packs", "slug": "combos-packs", "type": "product_type", "description": "Curated pantry bundles at better value."},
        {"id": 12, "name": "Tamil Nadu", "slug": "tamil-nadu", "type": "region", "description": "Bold, aromatic blends from Tamil kitchens."},
        {"id": 13, "name": "Kerala / Malabar", "slug": "kerala-malabar", "type": "region", "description": "Warm, toasted Malabar profiles."},
        {"id": 14, "name": "Andhra", "slug": "andhra", "type": "region", "description": "Chilli-forward Andhra flavours."},
        {"id": 15, "name": "Chettinad", "slug": "chettinad", "type": "region", "description": "Peppery, roasted Chettinad masalas."},
        {"id": 16, "name": "Hyderabadi", "slug": "hyderabadi", "type": "region", "description": "Layered blends for fragrant biryani."},
        {"id": 17, "name": "Biryani", "slug": "biryani", "type": "dish", "description": "Masalas for layered rice dishes."},
        {"id": 18, "name": "Fried Rice", "slug": "fried-rice", "type": "dish", "description": "Fast, savoury blends for rice meals."},
        {"id": 19, "name": "Kulambu Masalas", "slug": "kulambu-masalas", "type": "dish", "description": "Deep, warming curry blends."},
        {"id": 20, "name": "Fry / Varuval", "slug": "fry-varuval", "type": "dish", "description": "Roasted spice blends for crisp fries."},
        {"id": 21, "name": "Sambar / Rasam", "slug": "sambar-rasam", "type": "dish", "description": "Comforting South Indian staples."},
        {"id": 22, "name": "Bestsellers", "slug": "bestsellers", "type": "collection", "description": "Customer favourites, selected from the catalogue."},
        {"id": 23, "name": "New Launches", "slug": "new-launches", "type": "collection", "description": "Recently added blends and pantry ideas."},
    ]
)
