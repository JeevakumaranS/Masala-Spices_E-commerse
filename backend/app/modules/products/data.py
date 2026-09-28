"""In-memory product seed data used during local development."""

from typing import Any

from app.common.images import unsplash


def _image(image_id: int, photo_id: str, alt: str) -> dict[str, Any]:
    return {
        "id": image_id,
        "url": unsplash(photo_id),
        "alt_text": alt,
        "sort_order": 1,
        "image_type": "pack_shot",
    }


sample_products: list[dict[str, Any]] = [
    {
        "id": 1,
        "name": "Sambar Masala",
        "slug": "sambar-masala",
        "description": "A balanced, tangy spice mix for sambar, vegetables and lentils.",
        "ingredients": [
            "Turmeric",
            "Red chilli",
            "Coriander",
            "Toor dal",
            "Asafoetida",
        ],
        "price": 199,
        "mrp": 240,
        "discount_pct": 17,
        "spice_level": "medium",
        "status": "active",
        "categories": ["breakfast-masalas", "south-indian"],
        "variants": [
            {
                "id": 101,
                "pack_size": "250g",
                "price": 199,
                "mrp": 240,
                "stock_qty": 25,
                "sku": "SM-250",
                "expiry_date": "2026-12-15",
            },
            {
                "id": 102,
                "pack_size": "500g",
                "price": 349,
                "mrp": 420,
                "stock_qty": 6,
                "sku": "SM-500",
                "expiry_date": "2026-12-25",
            },
        ],
        "images": [
            _image(
                1001,
                "photo-1596040033229-a9821ebd058d",
                "Sambar masala pack",
            )
        ],
    },
    {
        "id": 2,
        "name": "Biriyani Masala",
        "slug": "biriyani-masala",
        "description": "Aromatic and layered for restaurant-style biryani and rice dishes.",
        "ingredients": [
            "Biryani leaf",
            "Cinnamon",
            "Clove",
            "Pepper",
            "Cardamom",
        ],
        "price": 259,
        "mrp": 310,
        "discount_pct": 16,
        "spice_level": "mild",
        "status": "active",
        "categories": ["north-indian"],
        "variants": [
            {
                "id": 201,
                "pack_size": "200g",
                "price": 259,
                "mrp": 310,
                "stock_qty": 20,
                "sku": "BM-200",
                "expiry_date": "2026-11-30",
            }
        ],
        "images": [
            _image(
                2001,
                "photo-1509358271058-acd22cc93898",
                "Biriyani masala pack",
            )
        ],
    },
    {
        "id": 3,
        "name": "Garam Masala",
        "slug": "garam-masala",
        "description": "Warming finishing blend of roasted whole spices, ground cool the same morning.",
        "ingredients": [
            "Cinnamon",
            "Green cardamom",
            "Clove",
            "Black pepper",
            "Mace",
        ],
        "price": 149,
        "mrp": 185,
        "discount_pct": 19,
        "spice_level": "mild",
        "status": "active",
        "categories": ["north-indian", "breakfast-masalas"],
        "variants": [
            {
                "id": 301,
                "pack_size": "100g",
                "price": 149,
                "mrp": 185,
                "stock_qty": 40,
                "sku": "GM-100",
                "expiry_date": "2027-01-10",
            },
            {
                "id": 302,
                "pack_size": "250g",
                "price": 329,
                "mrp": 405,
                "stock_qty": 18,
                "sku": "GM-250",
                "expiry_date": "2027-01-10",
            },
        ],
        "images": [
            _image(
                3001,
                "photo-1604908176997-125f25cc6f3d",
                "Garam masala pack",
            )
        ],
    },
    {
        "id": 4,
        "name": "Rasam Podi",
        "slug": "rasam-podi",
        "description": "Peppery, tangy podi that turns a bowl of rasam into a five-minute dinner.",
        "ingredients": [
            "Black pepper",
            "Cumin",
            "Dry red chilli",
            "Curry leaf",
            "Asafoetida",
        ],
        "price": 169,
        "mrp": 199,
        "discount_pct": 15,
        "spice_level": "hot",
        "status": "active",
        "categories": ["south-indian", "breakfast-masalas"],
        "variants": [
            {
                "id": 401,
                "pack_size": "200g",
                "price": 169,
                "mrp": 199,
                "stock_qty": 5,
                "sku": "RP-200",
                "expiry_date": "2026-12-05",
            }
        ],
        "images": [
            _image(
                4001,
                "photo-1596797038530-2c107229654b",
                "Rasam podi pack",
            )
        ],
    },
    {
        "id": 5,
        "name": "Chettinad Masala",
        "slug": "chettinad-masala",
        "description": "Fiery roasted blend from the Chettinad kitchens — built for pepper-forward curries.",
        "ingredients": [
            "Star anise",
            "Fennel",
            "Black pepper",
            "Dry red chilli",
            "Poppy seed",
        ],
        "price": 279,
        "mrp": 349,
        "discount_pct": 20,
        "spice_level": "hot",
        "status": "active",
        "categories": ["south-indian"],
        "variants": [
            {
                "id": 501,
                "pack_size": "200g",
                "price": 279,
                "mrp": 349,
                "stock_qty": 14,
                "sku": "CM-200",
                "expiry_date": "2026-12-20",
            }
        ],
        "images": [
            _image(
                5001,
                "photo-1552332386-f8dd00dc2f85",
                "Chettinad masala pack",
            )
        ],
    },
    {
        "id": 6,
        "name": "Pav Bhaji Masala",
        "slug": "pav-bhaji-masala",
        "description": "Street-cart classic: coriander-forward with just enough chilli to keep it honest.",
        "ingredients": [
            "Coriander",
            "Fennel",
            "Kashmiri chilli",
            "Amchur",
            "Ginger",
        ],
        "price": 159,
        "mrp": 195,
        "discount_pct": 18,
        "spice_level": "medium",
        "status": "active",
        "categories": ["north-indian", "breakfast-masalas"],
        "variants": [
            {
                "id": 601,
                "pack_size": "200g",
                "price": 159,
                "mrp": 195,
                "stock_qty": 30,
                "sku": "PB-200",
                "expiry_date": "2026-12-28",
            }
        ],
        "images": [
            _image(
                6001,
                "photo-1601050690597-df0568f70950",
                "Pav bhaji masala pack",
            )
        ],
    },
]

_catalog_metadata = {
    "sambar-masala": {
        "dish_type": "Sambar/Rasam",
        "is_veg": True,
        "contains_ginger_garlic": False,
        "contains_tamarind": True,
        "categories": ["masala-powders", "spice-blends", "tamil-nadu", "sambar-rasam", "bestsellers"],
    },
    "biriyani-masala": {
        "dish_type": "Biryani",
        "is_veg": True,
        "contains_ginger_garlic": False,
        "contains_tamarind": False,
        "categories": ["masala-powders", "spice-blends", "hyderabadi", "biryani", "bestsellers"],
    },
    "garam-masala": {
        "dish_type": "Kulambu/Curry",
        "is_veg": True,
        "contains_ginger_garlic": False,
        "contains_tamarind": False,
        "categories": ["masala-powders", "spice-blends", "north-indian", "kulambu-masalas", "new-launches"],
    },
    "rasam-podi": {
        "dish_type": "Podi/Idli-Dosa",
        "is_veg": True,
        "contains_ginger_garlic": False,
        "contains_tamarind": True,
        "categories": ["podis", "tamil-nadu", "sambar-rasam", "podis", "combos-packs"],
    },
    "chettinad-masala": {
        "dish_type": "Fry/Varuval",
        "is_veg": False,
        "contains_ginger_garlic": True,
        "contains_tamarind": False,
        "categories": ["spice-blends", "chettinad", "fry-varuval", "combos-packs"],
    },
    "pav-bhaji-masala": {
        "dish_type": "Fried Rice",
        "is_veg": True,
        "contains_ginger_garlic": False,
        "contains_tamarind": False,
        "categories": ["masala-powders", "spice-blends", "fried-rice", "new-launches"],
    },
}

for _product in sample_products:
    _product.update(_catalog_metadata[_product["slug"]])
