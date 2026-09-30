# Backend

The backend is a FastAPI application organized by feature module. Catalog,
order, coupon, review, and analytics admin APIs use the configured SQL database.

```text
backend/
├── app/
│   ├── api/
│   │   └── router.py             # central router registry
│   ├── common/                   # utilities shared across modules
│   ├── core/                     # settings and application factory
│   ├── modules/
│   │   ├── admin/                # authentication and protected admin operations
│   │   ├── analytics/            # analytics endpoints and schemas
│   │   ├── blog/                 # blog endpoints and seed data
│   │   ├── categories/           # category endpoints, schemas, seed data
│   │   ├── coupons/              # coupon endpoints
│   │   ├── enquiries/            # enquiry endpoints
│   │   ├── health/               # health-check endpoint
│   │   ├── orders/               # order endpoints, schemas, quote logic
│   │   ├── products/             # product endpoints, schemas, seed data
│   │   ├── recipes/              # recipe endpoints, schemas, seed data
│   │   └── stores/               # store-location endpoints
│   └── main.py                   # uvicorn entry point
├── alembic/                      # database migrations
├── scripts/                      # development and maintenance scripts
├── requirements.txt
└── requirements-dev.txt          # pytest and backend test dependencies
```

## Adding a module

1. Create `app/modules/<feature>/`.
2. Add `router.py` for the module's `APIRouter` and `schemas.py` for its
   request/response models.
3. Add development data in `data.py` when the module needs seed data.
4. Register the router in `app/api/router.py`.

Run the application from this directory with:

```bash
.venv\Scripts\python.exe -m uvicorn app.main:app --port 8080
```

## Environment and database setup

Copy `.env.example` to `.env`, set `DATABASE_URL` and an `ADMIN_TOKEN_SECRET`
containing at least 32 random bytes. Apply migrations, then use the first-admin
registration page to create the initial database-backed administrator with an
email address and password from localhost. First-admin registration closes
once an account exists; later registrations require an active admin bearer
token. Admin passwords are stored as salted scrypt hashes; no admin
credentials are hard-coded or stored in environment variables. The login
endpoint is `POST /api/admin/login`; use its bearer token for every
`/api/admin/*` data endpoint and the legacy `/api/analytics/summary` endpoint.
Admin bearer tokens are signed HS256 JWTs. Their lifetime is controlled by
`ACCESS_TOKEN_EXPIRE_MINUTES` (60 minutes by default) and they are rejected
when the corresponding administrator is inactive or no longer exists.

To create an administrator directly from the backend CLI, run
`.venv\Scripts\python.exe -m app.cli create-admin`. The CLI prompts for the
email and a password twice without echoing the password. Supply `--email
admin@example.com` to skip the email prompt; password entry remains interactive.

## API smoke tests

Install the development dependencies and run the API smoke tests from the
`backend` directory. The collection endpoint tests use the configured local
database; they only issue read requests. Notification providers are not called.

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pytest
```

Apply schema changes after configuring the database:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
```

Use PostgreSQL 18 or later. Primary keys are UUIDv7; list-valued catalog,
coupon, and recipe fields use PostgreSQL `text[]` columns instead of JSON.
Existing integer keys are migrated to UUIDv7 while remapping their foreign-key
references, and existing JSON lists are converted in place by the migration.

Admin products support nested variants (pack size, SKU, price, stock, batch and
expiry), image URL arrays, category tags and product facets. Orders created through
the storefront are persisted, reviewed through the admin order routes, and
retained across restarts. Order references use a sequential `MAS-` prefix and
exactly five digits (for example, `MAS-00001`); guest tracking checks the
reference together with the checkout phone number. Admins move orders through
placed, processing, shipped, and delivered in order. A courier partner and
tracking ID are required before shipping; both appear in guest order tracking.
Brevo sends a status-specific customer email at order placement and on each
subsequent status transition. Review submissions are pending moderation by
default.

## Admin API contracts

All data endpoints below require `Authorization: Bearer <access_token>` and use
JSON. `POST /api/admin/login` accepts `{ "email": "...", "password": "..." }`
and returns `{ "access_token": "...", "token_type": "bearer" }`.
`GET /api/admin/registration-status` reports whether accounts exist.
`POST /api/admin/register` accepts an email and a password (12–128 characters).
The first account can be registered without authentication; subsequent
registrations require an admin bearer token.
`GET /api/admin/admins` lists account metadata for authenticated admins.
`GET` and `PUT /api/admin/integration-settings` manage the SMS/email enable
switches and provider credentials. Email order confirmations use Brevo's
transactional email endpoint (`POST /v3/smtp/email`), not the campaigns
endpoint. Configure a Brevo API v3 key and a sender identity verified in Brevo
in the admin settings. SMS order confirmations use Twilio Programmable Messaging;
configure the Account SID, Auth Token, and an SMS-capable sender phone in E.164
format. Both providers' credentials are encrypted at rest with a key derived
from `ADMIN_TOKEN_SECRET`; keep that secret stable or the stored credentials
cannot be decrypted. Secrets are only revealed through the authenticated,
non-cacheable reveal endpoint. Checkout requires the customer's email. Orders
are saved before notifications are sent; provider failures are logged and
reported as per-channel confirmation statuses without discarding the order.

Homepage hero images are uploaded and managed from the admin panel's **Hero
section**. `GET /api/hero-images` is public and supplies the homepage carousel;
the authenticated `/api/admin/hero-images` endpoints list, upload, and remove
slides. Apply the `hero_images` migration before using the section.

| Method and path | Contract |
| --- | --- |
| `GET /api/hero-images` | Public ordered list of homepage hero images, including their RustFS URLs and alt text. |
| `GET /api/admin/hero-images` | Authenticated hero image list. |
| `POST /api/admin/hero-images` | Authenticated multipart upload with `file` and optional `alt_text`; returns the saved image. |
| `DELETE /api/admin/hero-images/{image_id}` | Remove the hero image and its RustFS object; returns `204`. |
| `GET /api/admin/products` | Product array; each product includes `variants` and `images`. |
| `POST /api/admin/products` | Create and return a product. `PUT /api/admin/products/{id}` replaces its fields and variants. `DELETE` returns `204`. |
| `GET /api/admin/categories` | Category array. `POST /api/admin/categories` creates; `PUT /api/admin/categories/{id}` updates; `DELETE` returns `204`. |
| `GET /api/admin/orders` | Order array. Optional `status`, `limit`, and `offset` query parameters. `PUT /api/admin/orders/{id}` accepts `status`, optional replacement `items`, `admin_note`, and `payment_note`. Supplying `items` can add/remove lines; the list must contain at least one item. New lines are checked against the current catalog and use its current price/details. Existing lines retain their historical price when `price` is omitted; an explicitly supplied price adjusts that existing line. Totals and shipping are recalculated. Status transitions are `placed` → `under_review` → `confirmed` → `shipped`; moving from under review to confirmed requires a customer-contact note and, for pending offline payments, an offline-arrangement note. |
| | `GET /api/admin/coupons` | Coupon array, including migration-seeded `FIRST10`, `WELCOME10`, `FESTIVE20`, and `BIRYANI3`. `POST /api/admin/coupons` creates; `PUT /api/admin/coupons/{id}` updates; `DELETE /api/admin/coupons/{id-or-code}` removes. Percentage/fixed promotions accept `percentage`/`fixed_amount` or `discount_value`; activation fields accept both `is_active`/`active`, `active_from`/`starts_at`, and `active_until`/`ends_at`. `first_order_only` is persisted and enforced against previous customer orders. |
| `GET /api/admin/reviews` | Review array. `PATCH /api/admin/reviews/{id}` accepts `{ "status": "approved" \| "rejected" \| "pending" }`. |
| `GET /api/admin/analytics/summary` | Analytics summary with revenue/order totals, repeat-purchase rate, top items, and category/region/dish-type sales. `/api/analytics/summary` remains available with the same authorization. |

Successful create/update operations return the saved object (including its
database ID); list operations return arrays. Deletes return an empty `204`.
Errors use FastAPI's JSON shape `{ "detail": ... }`: `401` means missing,
invalid, or expired bearer token (login also returns `401` for bad credentials);
`422` means invalid input (`detail` is FastAPI's validation-error array for
schema failures and a message string for domain validation); `404` means the
requested record does not exist; `409` means a duplicate identifier or invalid
order transition; `503` means admin authentication is not configured.
