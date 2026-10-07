"""Validation for stored contact and bulk-order messages."""

import pytest
from pydantic import ValidationError
from fastapi.testclient import TestClient
import psycopg
from uuid import uuid4

from app.core.application import create_app
from app.core.database import DATABASE_URL
from app.modules.admin.auth import require_admin
from app.modules.enquiries.schemas import MessageInput, MessageStatus, MessageStatusInput


def test_contact_message_normalizes_email_and_text() -> None:
    payload = MessageInput.model_validate({
        "name": "  Ananya Rao ",
        "email": " ANANYA@EXAMPLE.COM ",
        "phone": " +91 98765 43210 ",
        "subject": "General",
        "message": "  Please tell me more about your spice blends.  ",
    })

    assert payload.name == "Ananya Rao"
    assert payload.email == "ananya@example.com"
    assert payload.phone == "+91 98765 43210"
    assert payload.message == "Please tell me more about your spice blends."


def test_message_requires_phone() -> None:
    with pytest.raises(ValidationError, match="phone"):
        MessageInput.model_validate({
            "name": "Ravi Kumar",
            "email": "ravi@example.com",
            "subject": "Bulk orders",
            "message": "We need a monthly supply of several masalas.",
        })


def test_message_status_uses_enum_values() -> None:
    status = MessageStatusInput.model_validate({"status": "read"})
    assert status.status is MessageStatus.READ


def test_contact_form_accepts_bulk_and_custom_subjects() -> None:
    bulk_subject = MessageInput.model_validate({
        "name": "Ravi Kumar",
        "email": "ravi@example.com",
        "phone": "+919876543210",
        "subject": "Bulk orders",
        "message": "We need a monthly supply of several masalas.",
    })
    custom_subject = MessageInput.model_validate({
        "name": "Ananya Rao",
        "email": "ananya@example.com",
        "phone": "+919876543211",
        "subject": "  Product availability  ",
        "message": "Please tell me when the new blend will be available.",
    })

    assert bulk_subject.subject == "Bulk orders"
    assert custom_subject.subject == "Product availability"


def test_contact_message_subject_cannot_be_blank() -> None:
    with pytest.raises(ValidationError, match="cannot be empty"):
        MessageInput.model_validate({
            "name": "Ananya Rao",
            "email": "ananya@example.com",
            "phone": "+919876543211",
            "subject": "  ",
            "message": "Please tell me when the new blend will be available.",
        })


def test_messages_are_stored_and_filterable() -> None:
    application = create_app()
    application.dependency_overrides[require_admin] = lambda: "message-test-admin"
    unique = uuid4().hex
    contact_email = f"contact-{unique}@example.test"
    bulk_email = f"bulk-{unique}@example.test"
    custom_email = f"custom-{unique}@example.test"
    sync_database_url = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://", 1)

    try:
        with TestClient(application) as client:
            initial_counts_response = client.get("/api/admin/messages")
            assert initial_counts_response.status_code == 200, initial_counts_response.text
            initial_unread_counts = initial_counts_response.json()["unread_counts"]

            contact = client.post("/api/enquiries", json={
                "name": f"Contact {unique}",
                "email": contact_email,
                "phone": "+919876543210",
                "subject": "General",
                "message": f"Question {unique} about masala blends.",
            })
            assert contact.status_code == 201, contact.text

            bulk = client.post("/api/enquiries", json={
                "name": f"Buyer {unique}",
                "email": bulk_email,
                "phone": "+919876543210",
                "subject": "Bulk orders",
                "message": f"Monthly volume requirements {unique} for wholesale spices.",
            })
            assert bulk.status_code == 201, bulk.text

            custom = client.post("/api/enquiries", json={
                "name": f"Custom {unique}",
                "email": custom_email,
                "phone": "+919876543211",
                "subject": f"Subject {unique}",
                "message": f"Custom subject enquiry {unique} about masala blends.",
            })
            assert custom.status_code == 201, custom.text

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
            assert contact_page["unread_counts"]["All"] == initial_unread_counts.get("All", 0) + 3
            assert contact_page["unread_counts"]["General"] == initial_unread_counts.get("General", 0) + 1
            assert contact_page["unread_counts"]["Bulk orders"] == initial_unread_counts.get("Bulk orders", 0) + 1

            custom_list = client.get("/api/admin/messages", params={
                "subject": f"Subject {unique}",
            })
            assert custom_list.status_code == 200, custom_list.text
            assert custom_list.json()["total_count"] == 1
            assert custom_list.json()["items"][0]["subject"] == f"Subject {unique}"

            message_id = contact_page["items"][0]["id"]
            read = client.patch(f"/api/admin/messages/{message_id}", json={"status": "read"})
            assert read.status_code == 200, read.text
            assert read.json()["status"] == "read"
            after_read_counts = client.get("/api/admin/messages").json()["unread_counts"]
            assert after_read_counts["All"] == initial_unread_counts.get("All", 0) + 2
            assert after_read_counts["General"] == initial_unread_counts.get("General", 0)

            bulk_list = client.get("/api/admin/messages", params={
                "subject": "Bulk orders",
                "search": unique,
            })
            assert bulk_list.status_code == 200, bulk_list.text
            bulk_page = bulk_list.json()
            assert bulk_page["total_count"] == 1
            assert bulk_page["items"][0]["phone"] == "+919876543210"
            assert not {"company_name", "details", "source"}.intersection(bulk_page["items"][0])

            deleted = client.delete(f"/api/admin/messages/{message_id}")
            assert deleted.status_code == 204, deleted.text
            missing = client.patch(f"/api/admin/messages/{message_id}", json={"status": "read"})
            assert missing.status_code == 404, missing.text
    finally:
        with psycopg.connect(sync_database_url) as connection:
            connection.execute(
                "DELETE FROM messages WHERE email IN (%s, %s, %s)",
                (contact_email, bulk_email, custom_email),
            )
