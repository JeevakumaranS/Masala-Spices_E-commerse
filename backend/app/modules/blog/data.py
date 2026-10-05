"""In-memory blog seed data used during local development."""

from typing import Any

from app.common.images import unsplash

sample_blog_posts: list[dict[str, Any]] = [
    {
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
    {
        "title": "How to bloom spices without burning them",
        "slug": "bloom-spices-without-burning",
        "category": "Techniques",
        "published_at": "2026-09-22",
        "hero_image_url": unsplash("photo-1596040033229-a9821ebd058d", 1600),
        "body": (
            "Blooming spices is a short, quiet step: warm oil, whole spices first, then ground blends. "
            "When the cumin crackles and the aroma rises, the pan is ready for the next ingredient.\n\n"
            "Keep the heat at medium and have your onions or liquid ready. A dark, smoking pan will make "
            "chilli and fenugreek taste bitter, while a few seconds in warm fat is enough to open their aroma."
        ),
    },
    {
        "title": "Why coriander leads a good masala",
        "slug": "why-coriander-leads-masala",
        "category": "Sourcing",
        "published_at": "2026-09-25",
        "hero_image_url": unsplash("photo-1599909533730-f9d4f2bda1ed", 1600),
        "body": (
            "Coriander seed gives a blend its warm citrus note and a soft, rounded base. It is often the "
            "largest ingredient by weight, but its job is balance rather than volume.\n\n"
            "The seed changes with its growing season and storage. We taste each lot before roasting, then "
            "adjust the blend around its sweetness so the finished masala stays familiar from batch to batch."
        ),
    },
    {
        "title": "The small logic behind a good rasam",
        "slug": "small-logic-good-rasam",
        "category": "Recipes",
        "published_at": "2026-09-28",
        "hero_image_url": unsplash("photo-1547592180-85f173990554", 1600),
        "body": (
            "Rasam is built in layers: sour tamarind, peppery spice, a little sweetness from tomato, and a "
            "finish of mustard and curry leaves. None needs to dominate the bowl.\n\n"
            "Let the tamarind simmer before adding the ground blend. A short boil softens its sharp edge; "
            "the final tempering brings the aroma back to the surface just before serving."
        ),
    },
    {
        "title": "A freshness test for the jar in your cupboard",
        "slug": "freshness-test-spice-jar",
        "category": "Basics",
        "published_at": "2026-09-30",
        "hero_image_url": unsplash("photo-1532336414038-cf19250c5757", 1600),
        "body": (
            "Open the jar and smell it before you reach for the spoon. Fresh ground spices should be easy to "
            "recognise, not just warm and dusty. Rub a pinch between your fingers to release more aroma.\n\n"
            "Buy a size you can finish while it still smells bright. Keep it sealed in a cool cupboard, "
            "away from steam, sunlight and the heat beside the stove."
        ),
    },
    {
        "title": "Cooking with chilli: heat and flavour",
        "slug": "chilli-heat-and-flavour",
        "category": "Basics",
        "published_at": "2026-10-01",
        "hero_image_url": unsplash("photo-1588252303782-cb80119abd6d", 1600),
        "body": (
            "Chilli is not a single dial marked hot. Different varieties bring fruit, smoke, colour or a "
            "clean sharp heat, and the amount of each matters as much as the number of seeds.\n\n"
            "Taste your blend in a little warm oil before adding it to a large pot. If you want more warmth, "
            "add it in small steps; you can always build heat, but you cannot take it back out."
        ),
    },
    {
        "title": "From whole spice to a weeknight curry",
        "slug": "whole-spice-to-weeknight-curry",
        "category": "Roastery",
        "published_at": "2026-10-03",
        "hero_image_url": unsplash("photo-1603894584373-5ac82b2ae398", 1600),
        "body": (
            "A useful curry does not need a long ingredient list. Onion, tomato, a spoon of masala and "
            "something from the fridge are enough when the blend has been roasted and balanced carefully.\n\n"
            "Give the onions time to soften, cook the masala briefly in the pan, then add water and your main "
            "ingredient. The spice does the quiet work while the curry simmers."
        ),
    },
]
