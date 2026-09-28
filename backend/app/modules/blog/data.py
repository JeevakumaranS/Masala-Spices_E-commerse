"""In-memory blog seed data used during local development."""

from typing import Any

from app.common.images import unsplash

sample_blog_posts: list[dict[str, Any]] = [
    {
        "id": 1,
        "title": "Why our masalas taste different",
        "slug": "why-our-masalas-taste-different",
        "category": "Sourcing",
        "published_at": "2026-08-14",
        "hero_image_url": unsplash("photo-1517244683847-7456b63c5969", 1600),
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
        "hero_image_url": unsplash("photo-1583258292688-d0213dc5a3a8", 1600),
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
        "hero_image_url": unsplash("photo-1615485290382-441e4d049cb5", 1600),
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
        "hero_image_url": unsplash("photo-1532336414038-cf19250c5757", 1600),
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
