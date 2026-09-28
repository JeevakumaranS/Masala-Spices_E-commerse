"""Blog routes."""

from typing import Any

from fastapi import APIRouter, HTTPException

from app.modules.blog.data import sample_blog_posts

router = APIRouter(prefix="/api/blog", tags=["blog"])


@router.get("", response_model=list[dict[str, Any]])
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


@router.get("/{slug}")
def get_blog_post(slug: str) -> dict[str, Any]:
    post = next((item for item in sample_blog_posts if item["slug"] == slug), None)
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")
    return post
