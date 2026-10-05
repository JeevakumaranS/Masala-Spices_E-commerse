"""Validation for stored contact and bulk-order messages."""

import pytest
from pydantic import ValidationError
from fastapi.testclient import TestClient
import psycopg
from uuid import uuid4

from app.core.application import create_app
from app.core.database import DATABASE_URL
from app.modules.admin.auth import require_admin
from app.modules.enquiries.schemas import MessageInput


def test_contact_message_normalizes_email_and_text() -> None:
    payload = MessageInput.model_validate({
        "name": "  Ananya Rao ",
        "email": " ANANYA@EXAMPLE.COM ",
        "subject": "General",
        "message": "  Please tell me more about your spice blends.  ",
    })

    assert payload.name == "Ananya Rao"
    assert payload.email == "ananya@example.com"
    assert payload.message == "Please tell me more about your spice blends."
    assert payload.source == "contact"


def test_bulk_message_requires_bulk_subject_company_and_phone() -> None:
    with pytest.raises(ValidationError, match="company name and phone"):
        MessageInput.model_validate({
            "name": "Ravi Kumar",
            "email": "ravi@example.com",
            "subject": "Bulk orders",
            "message": "We need a monthly supply of several masalas.",
            "source": "bulk_order",
            "details": {"volume": "51–200 kg per month"},
        })


def test_contact_form_cannot_submit_bulk_order_subject() -> None:
    with pytest.raises(ValidationError, match="bulk-order form"):
        MessageInput.model_validate({
            "name": "Ravi Kumar",
            "email": "ravi@example.com",
            "subject": "Bulk orders",
            "message": "We need a monthly supply of several masalas.",
        })


def test_contact_and_bulk_messages_are_stored_and_filterable() -> None:
    application = create_app()
    application.dependency_overrides[require_admin] = lambda: "message-test-admin"
    unique = uuid4().hex
    contact_email = f"contact-{unique}@example.test"
    bulk_email = f"bulk-{unique}@example.test"
    sync_database_url = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://", 1)

    try:
        with TestClient(application) as client:
            contact = client.post("/api/enquiries", json={
                "name": f"Contact {unique}",
                "email": contact_email,
                "subject": "General",
                "message": f"Question {unique} about masala blends.",
                "source": "contact",
            })
            assert contact.status_code == 201, contact.text

            bulk = client.post("/api/enquiries", json={
                "name": f"Buyer {unique}",
                "email": bulk_email,
                "phone": "+919876543210",
                "company_name": f"Kitchen {unique}",
                "subject": "Bulk orders",
                "message": f"Monthly volume requirements {unique} for wholesale spices.",
                "source": "bulk_order",
                "details": {"monthly_volume": "51-200 kg per month"},
            })
            assert bulk.status_code == 201, bulk.text

            contact_list = client.get("/api/admin/messages", params={
                "subject": "General",
                "search": unique,
                "page": 1,
                "page_size": 1,
            })
            assert contact_list.status_code == 200, contact_list.text
            contact_page = contact_list.json()
            assert contact_page["total_count"] == 1
            assert contact_page["items"][0]["status"] == "new"

            message_id = contact_page["items"][0]["id"]
            read = client.patch(f"/api/admin/messages/{message_id}", json={"status": "read"})
            assert read.status_code == 200, read.text
            assert read.json()["status"] == "read"

            bulk_list = client.get("/api/admin/messages", params={
                "subject": "Bulk orders",
                "search": f"Kitchen {unique}",
            })
            assert bulk_list.status_code == 200, bulk_list.text
            bulk_page = bulk_list.json()
            assert bulk_page["total_count"] == 1
            assert bulk_page["items"][0]["details"]["monthly_volume"] == "51-200 kg per month"
    finally:
        with psycopg.connect(sync_database_url) as connection:
            connection.execute(
                "DELETE FROM messages WHERE email IN (%s, %s)",
                (contact_email, bulk_email),
            )
