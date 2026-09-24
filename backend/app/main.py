from __future__ import annotations

from datetime import datetime, timedelta
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.models import AnalyticsSummary, Category, Order, Product, Recipe

app = FastAPI(title="Masala & Spices API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class OrderCreateRequest(BaseModel):
    customer_name: str
    phone: str
    email: str | None = None
    items: list[dict[str, Any]] = Field(default_factory=list)


class LoginRequest(BaseModel):
    email: str
    password: str


class ReviewSubmission(BaseModel):
    reviewer_name: str
    rating: int = Field(ge=1, le=5)
    comment: str


class PaginatedProducts(BaseModel):
    items: list[Product]
    page: int
    page_size: int
    total_count: int


class PaginatedRecipes(BaseModel):
    items: list[Recipe]
    page: int
    page_size: int
    total_count: int


sample_categories = [
    {"id": 1, "name": "Breakfast Masalas", "slug": "breakfast-masalas", "type": "product_type", "description": "Quick, aromatic blends for everyday meals."},
    {"id": 2, "name": "South Indian", "slug": "south-indian", "type": "region", "description": "Classic flavours from the south."},
    {"id": 3, "name": "North Indian", "slug": "north-indian", "type": "region", "description": "Comforting, indulgent spice profiles."},
]

def _unsplash(photo_id: str, width: int = 1200) -> str:
    """Verified Unsplash CDN URLs.

    The seed data previously shipped literal ``https://images.unsplash.com/...``
    placeholders, so every product/recipe image 404'd in the storefront.
    """
    return f"https://images.unsplash.com/{photo_id}?auto=format&fit=crop&w={width}&q=80"


def _image(image_id: int, photo_id: str, alt: str) -> dict[str, Any]:
    return {
        "id": image_id,
        "url": _unsplash(photo_id),
        "alt_text": alt,
        "sort_order": 1,
        "image_type": "pack_shot",
    }


sample_products = [
    {
        "id": 1,
        "name": "Sambar Masala",
        "slug": "sambar-masala",
        "description": "A balanced, tangy spice mix for sambar, vegetables and lentils.",
        "ingredients": ["Turmeric", "Red chilli", "Coriander", "Toor dal", "Asafoetida"],
        "price": 199,
        "mrp": 240,
        "discount_pct": 17,
        "spice_level": "medium",
        "status": "active",
        "categories": ["breakfast-masalas", "south-indian"],
        "variants": [
            {"id": 101, "pack_size": "250g", "price": 199, "mrp": 240, "stock_qty": 25, "sku": "SM-250", "expiry_date": "2026-12-15"},
            {"id": 102, "pack_size": "500g", "price": 349, "mrp": 420, "stock_qty": 6, "sku": "SM-500", "expiry_date": "2026-12-25"},
        ],
        "images": [_image(1001, "photo-1596040033229-a9821ebd058d", "Sambar masala pack")],
    },
    {
        "id": 2,
        "name": "Biriyani Masala",
        "slug": "biriyani-masala",
        "description": "Aromatic and layered for restaurant-style biryani and rice dishes.",
        "ingredients": ["Biryani leaf", "Cinnamon", "Clove", "Pepper", "Cardamom"],
        "price": 259,
        "mrp": 310,
        "discount_pct": 16,
        "spice_level": "mild",
        "status": "active",
        "categories": ["north-indian"],
        "variants": [{"id": 201, "pack_size": "200g", "price": 259, "mrp": 310, "stock_qty": 20, "sku": "BM-200", "expiry_date": "2026-11-30"}],
        "images": [_image(2001, "photo-1509358271058-acd22cc93898", "Biriyani masala pack")],
    },
    {
        "id": 3,
        "name": "Garam Masala",
        "slug": "garam-masala",
        "description": "Warming finishing blend of roasted whole spices, ground cool the same morning.",
        "ingredients": ["Cinnamon", "Green cardamom", "Clove", "Black pepper", "Mace"],
        "price": 149,
        "mrp": 185,
        "discount_pct": 19,
        "spice_level": "mild",
        "status": "active",
        "categories": ["north-indian", "breakfast-masalas"],
        "variants": [
            {"id": 301, "pack_size": "100g", "price": 149, "mrp": 185, "stock_qty": 40, "sku": "GM-100", "expiry_date": "2027-01-10"},
            {"id": 302, "pack_size": "250g", "price": 329, "mrp": 405, "stock_qty": 18, "sku": "GM-250", "expiry_date": "2027-01-10"},
        ],
        "images": [_image(3001, "photo-1604908176997-125f25cc6f3d", "Garam masala pack")],
    },
    {
        "id": 4,
        "name": "Rasam Podi",
        "slug": "rasam-podi",
        "description": "Peppery, tangy podi that turns a bowl of rasam into a five-minute dinner.",
        "ingredients": ["Black pepper", "Cumin", "Dry red chilli", "Curry leaf", "Asafoetida"],
        "price": 169,
        "mrp": 199,
        "discount_pct": 15,
        "spice_level": "hot",
        "status": "active",
        "categories": ["south-indian", "breakfast-masalas"],
        "variants": [{"id": 401, "pack_size": "200g", "price": 169, "mrp": 199, "stock_qty": 5, "sku": "RP-200", "expiry_date": "2026-12-05"}],
        "images": [_image(4001, "photo-1596797038530-2c107229654b", "Rasam podi pack")],
    },
    {
        "id": 5,
        "name": "Chettinad Masala",
        "slug": "chettinad-masala",
        "description": "Fiery roasted blend from the Chettinad kitchens — built for pepper-forward curries.",
        "ingredients": ["Star anise", "Fennel", "Black pepper", "Dry red chilli", "Poppy seed"],
        "price": 279,
        "mrp": 349,
        "discount_pct": 20,
        "spice_level": "hot",
        "status": "active",
        "categories": ["south-indian"],
        "variants": [{"id": 501, "pack_size": "200g", "price": 279, "mrp": 349, "stock_qty": 14, "sku": "CM-200", "expiry_date": "2026-12-20"}],
        "images": [_image(5001, "photo-1552332386-f8dd00dc2f85", "Chettinad masala pack")],
    },
    {
        "id": 6,
        "name": "Pav Bhaji Masala",
        "slug": "pav-bhaji-masala",
        "description": "Street-cart classic: coriander-forward with just enough chilli to keep it honest.",
        "ingredients": ["Coriander", "Fennel", "Kashmiri chilli", "Amchur", "Ginger"],
        "price": 159,
        "mrp": 195,
        "discount_pct": 18,
        "spice_level": "medium",
        "status": "active",
        "categories": ["north-indian", "breakfast-masalas"],
        "variants": [{"id": 601, "pack_size": "200g", "price": 159, "mrp": 195, "stock_qty": 30, "sku": "PB-200", "expiry_date": "2026-12-28"}],
        "images": [_image(6001, "photo-1601050690597-df0568f70950", "Pav bhaji masala pack")],
    },
]

sample_recipes = [
    {
        "id": 1,
        "title": "Coconut Sambar",
        "slug": "coconut-sambar",
        "cook_time_minutes": 30,
        "cuisine": "South Indian",
        "dish_type": "Main Course",
        "ingredients": ["Toor dal", "Sambar masala", "Coconut", "Vegetables"],
        "steps": ["Cook the dal until soft.", "Add vegetables and masala.", "Finish with coconut and tempering."],
        "hero_image_url": _unsplash("photo-1546833999-b9f581a1996d"),
    },
    {
        "id": 2,
        "title": "Restaurant Style Biryani",
        "slug": "restaurant-style-biryani",
        "cook_time_minutes": 55,
        "cuisine": "Hyderabadi",
        "dish_type": "Rice",
        "ingredients": ["Basmati rice", "Biriyani masala", "Yogurt", "Onions"],
        "steps": ["Marinate vegetables and protein.", "Layer with rice and masala.", "Steam until aromatic."],
        "hero_image_url": _unsplash("photo-1563379091339-03b21ab4a4f8"),
    },
    {
        "id": 3,
        "title": "Chettinad Pepper Chicken",
        "slug": "chettinad-pepper-chicken",
        "cook_time_minutes": 45,
        "cuisine": "Chettinad",
        "dish_type": "Main Course",
        "ingredients": ["Chicken", "Chettinad masala", "Curry leaf", "Coconut"],
        "steps": ["Toast the masala until fragrant.", "Brown the chicken with curry leaf.", "Simmer until the oil separates."],
        "hero_image_url": _unsplash("photo-1585937421612-70a008356fbe"),
    },
    {
        "id": 4,
        "title": "Podi Idli",
        "slug": "podi-idli",
        "cook_time_minutes": 20,
        "cuisine": "South Indian",
        "dish_type": "Breakfast",
        "ingredients": ["Idli batter", "Rasam podi", "Ghee", "Sesame"],
        "steps": ["Steam the idlis soft.", "Toss hot idli in ghee and podi.", "Rest two minutes so it clings."],
        "hero_image_url": _unsplash("photo-1631209121750-a9f656d28f46"),
    },
    {
        "id": 5,
        "title": "Weeknight Pav Bhaji",
        "slug": "weeknight-pav-bhaji",
        "cook_time_minutes": 35,
        "cuisine": "Indian",
        "dish_type": "Street Food",
        "ingredients": ["Potatoes", "Pav bhaji masala", "Butter", "Onions"],
        "steps": ["Boil and mash the vegetables.", "Fry onion, then bloom the masala.", "Finish with butter and a squeeze of lime."],
        "hero_image_url": _unsplash("photo-1567188040759-fb8a883dc6d8"),
    },
    {
        "id": 6,
        "title": "Coconut Rasam",
        "slug": "coconut-rasam",
        "cook_time_minutes": 25,
        "cuisine": "South Indian",
        "dish_type": "Soup",
        "ingredients": ["Tamarind", "Rasam podi", "Coconut", "Tomato"],
        "steps": ["Simmer tamarind and tomato.", "Stir in the podi off the heat.", "Add coconut and a final tempering."],
        "hero_image_url": _unsplash("photo-1512058564366-18510be2db19"),
    },
]

sample_orders = [
    {
        "id": 1,
        "order_number": "MAS-1001",
        "customer_name": "Aisha Nair",
        "phone": "+919876543210",
        "email": "aisha@example.com",
        "status": "confirmed",
        "subtotal": 398,
        "shipping_amount": 40,
        "discount_amount": 20,
        "total": 418,
        "created_at": datetime.utcnow() - timedelta(days=2),
        "item_count": 2,
        "history": [{"id": 1, "status": "placed", "changed_at": datetime.utcnow() - timedelta(days=2), "note": "Order placed"}, {"id": 2, "status": "confirmed", "changed_at": datetime.utcnow() - timedelta(days=1), "note": "Confirmed by admin"}],
    },
]


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/categories", response_model=list[Category])
def list_categories() -> list[dict[str, Any]]:
    return sample_categories


@app.get("/api/categories/{slug}", response_model=Category)
def get_category(slug: str) -> dict[str, Any]:
    category = next((item for item in sample_categories if item["slug"] == slug), None)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


@app.get("/api/products", response_model=PaginatedProducts)
def list_products(
    category: str | None = Query(default=None),
    dish_type: str | None = Query(default=None),
    spice_level: str | None = Query(default=None),
    page: int = 1,
    page_size: int = 12,
) -> dict[str, Any]:
    filtered = sample_products
    if category:
        filtered = [item for item in filtered if category in item["categories"]]
    if spice_level:
        filtered = [item for item in filtered if item["spice_level"] == spice_level]
    start = (page - 1) * page_size
    end = start + page_size
    return {
        "items": filtered[start:end],
        "page": page,
        "page_size": page_size,
        "total_count": len(filtered),
    }


@app.get("/api/products/{slug}", response_model=Product)
def get_product(slug: str) -> dict[str, Any]:
    product = next((item for item in sample_products if item["slug"] == slug), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@app.get("/api/products/{product_id}/reviews")
def get_product_reviews(product_id: int) -> dict[str, list[dict[str, Any]]]:
    return {
        "items": [
            {"id": 1, "reviewer_name": "Rahul", "rating": 5, "comment": "Rich colour and lovely aroma.", "status": "approved"},
            {"id": 2, "reviewer_name": "Keerthi", "rating": 4, "comment": "Excellent for quick meals.", "status": "approved"},
        ]
    }


@app.post("/api/products/{product_id}/reviews")
def submit_review(product_id: int, payload: ReviewSubmission) -> dict[str, str | int]:
    return {"status": "success", "product_id": product_id, "reviewer_name": payload.reviewer_name}


@app.get("/api/recipes", response_model=PaginatedRecipes)
def list_recipes(cuisine: str | None = None, dish_type: str | None = None) -> dict[str, Any]:
    filtered = sample_recipes
    if cuisine:
        filtered = [item for item in filtered if item["cuisine"].lower() == cuisine.lower()]
    if dish_type:
        filtered = [item for item in filtered if item["dish_type"].lower() == dish_type.lower()]
    return {"items": filtered, "page": 1, "page_size": len(filtered), "total_count": len(filtered)}


@app.get("/api/recipes/{slug}", response_model=Recipe)
def get_recipe(slug: str) -> dict[str, Any]:
    recipe = next((item for item in sample_recipes if item["slug"] == slug), None)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe


@app.post("/api/orders")
def create_order(payload: OrderCreateRequest) -> dict[str, Any]:
    subtotal = sum(float(item.get("price", 0)) * int(item.get("qty", 1)) for item in payload.items)
    shipping_amount = 40 if subtotal < 500 else 0
    total = subtotal + shipping_amount
    order = {
        "id": 100,
        "order_number": "MAS-1002",
        "customer_name": payload.customer_name,
        "phone": payload.phone,
        "email": payload.email,
        "status": "placed",
        "subtotal": subtotal,
        "shipping_amount": shipping_amount,
        "discount_amount": 0,
        "total": total,
        "created_at": datetime.utcnow(),
        "item_count": len(payload.items),
    }
    return order


@app.get("/api/orders/{id_or_order_number}")
def get_order(id_or_order_number: str, phone: str | None = None) -> Order:
    order = sample_orders[0]
    if phone and order["phone"] != phone:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


@app.get("/api/coupons/validate")
def validate_coupon(code: str, subtotal: float = 0) -> dict[str, Any]:
    if code.lower() == "welcome10" and subtotal >= 499:
        return {"valid": True, "code": code, "discount": 49, "type": "percent"}
    return {"valid": False, "code": code, "discount": 0, "type": "percent"}


@app.post("/api/admin/login")
def admin_login(payload: LoginRequest) -> dict[str, Any]:
    if payload.email == "admin@masala.local" and payload.password == "admin123":
        return {"access_token": "demo-admin-token", "token_type": "bearer"}
    raise HTTPException(status_code=401, detail="Invalid credentials")


sample_blog_posts: list[dict[str, Any]] = [
    {
        "id": 1,
        "title": "Why our masalas taste different",
        "slug": "why-our-masalas-taste-different",
        "category": "Sourcing",
        "published_at": "2026-08-14",
        "hero_image_url": _unsplash("photo-1517244683847-7456b63c5969", 1600),
        "body": (
            "Most masala on a shelf was ground months ago, from commodity powder bought by the tonne. "
            "That is why it smells fine in the jar and tastes flat in the pan.\n\n"
            "We buy whole spices by the lot from growers we visit, then roast each one on its own schedule. "
            "Coriander finishes long before dried chilli does, so they never share a tray. "
            "Ground cool and slow, the volatile oils stay in the powder instead of drifting off as heat.\n\n"
            "The practical difference is arithmetic: a blend sealed within two weeks of grinding needs far less "
            "to taste like something. That is the whole trick, and there is no second one."
        ),
    },
    {
        "id": 2,
        "title": "A pantry guide to home cooking",
        "slug": "pantry-guide-to-home-cooking",
        "category": "Basics",
        "published_at": "2026-08-28",
        "hero_image_url": _unsplash("photo-1583258292688-d0213dc5a3a8", 1600),
        "body": (
            "A good pantry is not a big pantry. Six well-chosen jars will cook more dinners than thirty "
            "you forgot you owned.\n\n"
            "Start with a warming blend, a tangy one, a pepper-forward podi, whole cumin, turmeric, and salt. "
            "Everything else is a variation once those are in place.\n\n"
            "Store them sealed, away from the hob, and buy in sizes you will actually finish. "
            "A jar is only fresh until you open it, and ground spice does not wait for anyone."
        ),
    },
    {
        "id": 3,
        "title": "The right way to store whole spices",
        "slug": "store-whole-spices",
        "category": "Basics",
        "published_at": "2026-09-05",
        "hero_image_url": _unsplash("photo-1615485290382-441e4d049cb5", 1600),
        "body": (
            "Heat, light and air do most of the damage. A spice rack above the hob is the worst place in "
            "your kitchen to keep spices, and it is where most people put them.\n\n"
            "Keep whole spices in airtight containers, in a cupboard, at room temperature. "
            "Never refrigerate — condensation is worse than the heat you were trying to avoid.\n\n"
            "Whole spices hold for a year or more; ground spices are best inside three. "
            "If it no longer smells like anything when you crush it between your fingers, it is done."
        ),
    },
    {
        "id": 4,
        "title": "Five weeknight dinners one masala can fix",
        "slug": "weeknight-dinners-one-masala",
        "category": "Recipes",
        "published_at": "2026-09-18",
        "hero_image_url": _unsplash("photo-1532336414038-cf19250c5757", 1600),
        "body": (
            "One jar, five weeknights, no new shopping list. This is how most of us actually cook.\n\n"
            "A spoonful into dal, another into a pan of roasted vegetables, a third bloomed in butter for rice, "
            "folded through beaten eggs, or stirred into yogurt as a quick marinade. "
            "The blend does the balancing, so you are only managing heat and salt.\n\n"
            "Bloom it in fat rather than water whenever you can — most of the flavour you want is "
            "fat-soluble, and that single step is what separates a good weeknight dinner from a dull one."
        ),
    },
]


@app.get("/api/blog", response_model=list[dict[str, Any]])
def list_blog_posts() -> list[dict[str, Any]]:
    return [
        {
            "id": post["id"],
            "title": post["title"],
            "slug": post["slug"],
            "category": post["category"],
            "published_at": post["published_at"],
            "hero_image_url": post["hero_image_url"],
        }
        for post in sample_blog_posts
    ]


@app.get("/api/blog/{slug}")
def get_blog_post(slug: str) -> dict[str, Any]:
    post = next((item for item in sample_blog_posts if item["slug"] == slug), None)
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")
    return post


@app.get("/api/store-locations")
def list_store_locations() -> dict[str, list[dict[str, Any]]]:
    return {"items": [{"id": 1, "name": "Bengaluru Store", "address": "Koramangala, Bengaluru", "lat": 12.9352, "lng": 77.6245, "phone": "+91 98765 43210"}]}


@app.get("/api/analytics/summary", response_model=AnalyticsSummary)
def analytics_summary() -> dict[str, Any]:
    return {
        "total_revenue": 284500,
        "orders_count": 142,
        "top_items": ["Sambar Masala", "Biriyani Masala", "Kuzhambu Blend"],
        "avg_order_value": 1996,
    }


@app.get("/api/enquiries")
def list_enquiries() -> dict[str, Any]:
    return {"items": [{"id": 1, "type": "bulk", "company_name": "Fresh Harvest Foods", "status": "new"}]}


@app.post("/api/enquiries")
def create_enquiry(payload: dict[str, Any]) -> dict[str, Any]:
    return {"status": "queued", "message": "Thank you. Our sales team will contact you shortly."}
