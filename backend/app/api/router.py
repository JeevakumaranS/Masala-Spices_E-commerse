"""Register every feature module with the API application."""

from fastapi import APIRouter

from app.modules.admin.router import hero_images_router, router as admin_router
from app.modules.analytics.router import router as analytics_router
from app.modules.analytics.router import admin_router as admin_analytics_router
from app.modules.blog.router import admin_router as admin_blog_router
from app.modules.blog.router import router as blog_router
from app.modules.categories.router import router as categories_router
from app.modules.coupons.router import router as coupons_router
from app.modules.enquiries.router import admin_router as admin_messages_router
from app.modules.enquiries.router import router as enquiries_router
from app.modules.health.router import router as health_router
from app.modules.homepage.router import router as homepage_router
from app.modules.orders.router import router as orders_router
from app.modules.newsletter.router import router as newsletter_router
from app.modules.products.router import router as products_router
from app.modules.recipes.router import router as recipes_router
from app.modules.stores.router import router as stores_router

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(homepage_router)
api_router.include_router(categories_router)
api_router.include_router(products_router)
api_router.include_router(recipes_router)
api_router.include_router(orders_router)
api_router.include_router(newsletter_router)
api_router.include_router(coupons_router)
api_router.include_router(admin_router)
api_router.include_router(hero_images_router)
api_router.include_router(admin_analytics_router)
api_router.include_router(blog_router)
api_router.include_router(stores_router)
api_router.include_router(analytics_router)
api_router.include_router(enquiries_router)
api_router.include_router(admin_blog_router)
api_router.include_router(admin_messages_router)
