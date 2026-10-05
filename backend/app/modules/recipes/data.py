"""In-memory recipe seed data used during local development."""

from typing import Any

sample_recipes: list[dict[str, Any]] = [
    {
        "title": "Coconut Sambar",
        "slug": "coconut-sambar",
        "cook_time_minutes": 30,
        "cuisine": "South Indian",
        "dish_type": "Main Course",
        "ingredients": [
            "Toor dal",
            "Sambar masala",
            "Coconut",
            "Vegetables",
        ],
        "steps": [
            "Cook the dal until soft.",
            "Add vegetables and masala.",
            "Finish with coconut and tempering.",
        ],
        "hero_image_url": "https://assets.cookdtv.com/t/640/ldx8aj6mt1fuoglnl8w2qt6hwp79",
    },
    {
        "title": "Restaurant Style Biryani",
        "slug": "restaurant-style-biryani",
        "cook_time_minutes": 55,
        "cuisine": "Hyderabadi",
        "dish_type": "Rice",
        "ingredients": [
            "Basmati rice",
            "Biriyani masala",
            "Yogurt",
            "Onions",
        ],
        "steps": [
            "Marinate vegetables and protein.",
            "Layer with rice and masala.",
            "Steam until aromatic.",
        ],
        "hero_image_url": "https://assets.cookdtv.com/t/640/9kfs1c7kdc2yhdf3wkw11hhz0qps",
    },
    {
        "title": "Chettinad Pepper Chicken",
        "slug": "chettinad-pepper-chicken",
        "cook_time_minutes": 45,
        "cuisine": "Chettinad",
        "dish_type": "Main Course",
        "ingredients": [
            "Chicken",
            "Chettinad masala",
            "Curry leaf",
            "Coconut",
        ],
        "steps": [
            "Toast the masala until fragrant.",
            "Brown the chicken with curry leaf.",
            "Simmer until the oil separates.",
        ],
        "hero_image_url": "https://assets.cookdtv.com/t/640/h1tptzz54vtqe1pcoa9uzokqjyz8",
    },
    {
        "title": "Podi Idli",
        "slug": "podi-idli",
        "cook_time_minutes": 20,
        "cuisine": "South Indian",
        "dish_type": "Breakfast",
        "ingredients": [
            "Idli batter",
            "Rasam podi",
            "Ghee",
            "Sesame",
        ],
        "steps": [
            "Steam the idlis soft.",
            "Toss hot idli in ghee and podi.",
            "Rest two minutes so it clings.",
        ],
        "hero_image_url": "https://assets.cookdtv.com/t/640/1gdaga1acfyx4vc95p2q2b7f6pdc",
    },
    {
        "title": "Weeknight Pav Bhaji",
        "slug": "weeknight-pav-bhaji",
        "cook_time_minutes": 35,
        "cuisine": "Indian",
        "dish_type": "Street Food",
        "ingredients": [
            "Potatoes",
            "Pav bhaji masala",
            "Butter",
            "Onions",
        ],
        "steps": [
            "Boil and mash the vegetables.",
            "Fry onion, then bloom the masala.",
            "Finish with butter and a squeeze of lime.",
        ],
        "hero_image_url": "https://assets.cookdtv.com/t/640/s1b2obtt0cja1f1wkkid9b63igev",
    },
    {
        "title": "Coconut Rasam",
        "slug": "coconut-rasam",
        "cook_time_minutes": 25,
        "cuisine": "South Indian",
        "dish_type": "Soup",
        "ingredients": [
            "Tamarind",
            "Rasam podi",
            "Coconut",
            "Tomato",
        ],
        "steps": [
            "Simmer tamarind and tomato.",
            "Stir in the podi off the heat.",
            "Add coconut and a final tempering.",
        ],
        "hero_image_url": "https://assets.cookdtv.com/t/640/vfnxffhtj9jng8u6zbc5plepyw0a",
    },
]
