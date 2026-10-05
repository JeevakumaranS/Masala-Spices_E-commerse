"""Homepage content settings."""

from pydantic import BaseModel, Field, model_validator


class CategoryFeature(BaseModel):
    slug: str = Field(min_length=1, max_length=120)
    label: str = Field(min_length=1, max_length=120)
    image_url: str = Field(default="", max_length=2048)
    image_key: str = Field(default="", max_length=512)
    image_product_slug: str = Field(default="", max_length=120)


class HomeCategoriesContent(BaseModel):
    title: str = Field(default="Shop by category", max_length=120)
    items: list[CategoryFeature] = Field(default_factory=list, max_length=12)


class HomeBestsellersContent(BaseModel):
    title: str = Field(max_length=120)
    product_slugs: list[str] = Field(default_factory=list, max_length=24)


class HomeCombosContent(BaseModel):
    title: str = Field(default="Better valued Combos", max_length=120)
    description: str = Field(default="", max_length=500)
    product_slugs: list[str] = Field(default_factory=list, max_length=24)
    offer_codes: list[str] = Field(default_factory=list, max_length=24)

    @model_validator(mode="after")
    def validate_featured_deal_limit(self) -> "HomeCombosContent":
        selected = set(self.product_slugs) | set(self.offer_codes)
        if len(selected) > 4:
            raise ValueError("Choose no more than four homepage combos and offers combined.")
        return self


class HomeRecipesContent(BaseModel):
    eyebrow: str = Field(default="Cook with confidence", max_length=120)
    title: str = Field(default="Recipes that put the jar to work", max_length=160)
    description: str = Field(default="", max_length=500)
    link_label: str = Field(default="All recipes", max_length=100)
    link_href: str = Field(default="/recipes", max_length=500)
    recipe_slugs: list[str] = Field(default_factory=list, max_length=4)


class HomePageContent(BaseModel):
    ticker: list[str] = Field(default_factory=list, max_length=20)
    categories: HomeCategoriesContent = Field(default_factory=HomeCategoriesContent)
    bestsellers: HomeBestsellersContent = Field(
        default_factory=lambda: HomeBestsellersContent(title="Bestsellers")
    )
    combos: HomeCombosContent = Field(
        default_factory=lambda: HomeCombosContent(title="Better valued Combos")
    )
    recipes: HomeRecipesContent = Field(default_factory=HomeRecipesContent)


DEFAULT_HOME_PAGE_CONTENT = HomePageContent.model_validate(
    {
        "ticker": [
            "Stone-ground, never beaten",
            "No fillers or anti-caking agents",
            "Roasted in 4kg batches",
            "Sealed within 48 hours",
            "Single-origin whole spices",
            "Recipes that actually work",
        ],
        "categories": {
            "title": "Shop by category",
            "items": [
                {
                    "slug": "breakfast-masalas",
                    "label": "Everyday Masalas",
                    "image_url": "https://shop.cookdtv.com/cdn/shop/files/cat-kulambu.png?v=1788332086&width=400",
                    "image_product_slug": "sambar-masala",
                },
                {
                    "slug": "masala-powders",
                    "label": "Masala Powders",
                    "image_url": "https://img.magnific.com/free-psd/overhead-view-indian-spices-bowl_84443-93191.jpg?semt=ais_hybrid&w=740&q=80",
                    "image_product_slug": "biriyani-masala",
                },
                {
                    "slug": "pure-spices",
                    "label": "Pure Spices",
                    "image_url": "https://tiimg.tistatic.com/fp/1/007/630/100-pure-turmeric-powder-for-food-spices-with-12-months-shelf-life-712.jpg",
                    "image_product_slug": "garam-masala",
                },
                {
                    "slug": "podis",
                    "label": "Podis",
                    "image_url": "https://shop.cookdtv.com/cdn/shop/files/cat-podis.png?v=1788332086&width=400",
                    "image_product_slug": "rasam-podi",
                },
                {
                    "slug": "pickles",
                    "label": "Pickles",
                    "image_url": "https://images.jdmagicbox.com/quickquotes/images_main/mtc4ntmwotgwoq-1785309809-ofhfv4jq.png",
                    "image_product_slug": "mango-pickle",
                },
            ],
        },
        "bestsellers": {
            "title": "Bestsellers",
            "product_slugs": [],
        },
        "combos": {
            "title": "Better valued Combos",
            "description": "Curated combos — a combination of meals in one box",
            "product_slugs": [],
            "offer_codes": [],
        },
        "recipes": {
            "eyebrow": "Cook with confidence",
            "title": "Recipes that put the jar to work",
            "description": (
                "Written for home cooks — measured in spoons, not scales, and timed for a weeknight."
            ),
            "link_label": "All recipes",
            "link_href": "/recipes",
            "recipe_slugs": [],
        },
    }
)
