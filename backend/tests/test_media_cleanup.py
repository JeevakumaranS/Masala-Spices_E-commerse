import asyncio
from typing import cast

from sqlalchemy.ext.asyncio import AsyncSession

from app.services import media_cleanup


class _ScalarResult:
    def __init__(self, values: list[object]) -> None:
        self._values = values

    def scalars(self) -> "_ScalarResult":
        return self

    def all(self) -> list[object]:
        return self._values


class _Database:
    def __init__(self) -> None:
        self._references = iter([
            [["products/retained.jpg"]],
            [[]],
            ["collections/retained.jpg"],
            ["hero/retained.jpg"],
            ["recipes/shared.jpg"],
            [],
            [{"categories": {"items": [{"image_key": "homepage/retained.jpg"}]}}],
        ])

    async def execute(self, _statement: object) -> _ScalarResult:
        return _ScalarResult(next(self._references))


def test_delete_unreferenced_objects_keeps_shared_and_referenced_images(
    monkeypatch,
) -> None:
    deleted: list[str] = []
    monkeypatch.setattr(media_cleanup, "delete_object", deleted.append)

    asyncio.run(media_cleanup.delete_unreferenced_objects(
        cast(AsyncSession, _Database()),
        {
            "products/retained.jpg",
            "recipes/shared.jpg",
            "blog/obsolete.jpg",
            "homepage/obsolete.jpg",
        },
        context="test",
    ))

    assert set(deleted) == {"blog/obsolete.jpg", "homepage/obsolete.jpg"}
