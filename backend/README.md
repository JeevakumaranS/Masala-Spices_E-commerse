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
│   │   ├── blog/                 # blog endpoints and schemas
│   │   ├── categories/           # category endpoints and schemas
│   │   ├── coupons/              # coupon endpoints
│   │   ├── enquiries/            # enquiry endpoints
│   │   ├── guests/               # anonymous cart and watchlist persistence
│   │   ├── health/               # health-check endpoint
│   │   ├── orders/               # order endpoints, schemas, quote logic
│   │   ├── products/             # product endpoints and schemas
│   │   ├── recipes/              # recipe endpoints and schemas
│   │   └── stores/               # store-location endpoints
│   ├── scripts/                  # operational maintenance scripts
│   └── main.py                   # uvicorn entry point
├── alembic/                      # database migrations
├── requirements.txt
└── requirements-dev.txt          # pytest and backend test dependencies
```

## Adding a module

1. Create `app/modules/<feature>/`.
2. Add `router.py` for the module's `APIRouter` and `schemas.py` for its
   request/response models.
3. Register the router in `app/api/router.py`.

Use Python 3.12, matching `Dockerfile`. After activating the virtual environment
and installing `requirements.txt`, run the application from this directory with:

```bash
python -m uvicorn app.main:app --reload --port 8080
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
`python -m app.cli create-admin`. The CLI prompts for the
email and a password twice without echoing the password. Supply `--email
admin@example.com` to skip the email prompt; password entry remains interactive.

## API smoke tests

Install the development dependencies and run the API smoke tests from the
`backend` directory. The collection endpoint tests use the configured local
database; they only issue read requests. Notification providers are not called.

```bash
python -m pip install -r requirements-dev.txt
python -m pytest
```

Apply schema changes after configuring the database:

```bash
alembic upgrade head
```

Use PostgreSQL 18 or later. Primary keys are UUIDv7; list-valued catalog,
coupon, and recipe fields use PostgreSQL `text[]` columns instead of JSON.
Existing integer keys are migrated to UUIDv7 while remapping their foreign-key
references, and existing JSON lists are converted in place by the migration.

Admin products store their descriptive details, RustFS image keys, category tags,
spice level and status. Pack size, price, MRP, SKU, stock, batch and expiry are
stored per product variant; regular product prices are never stored on the
`products` row. Orders created through
the storefront are persisted, reviewed through the admin order routes, and
retained across restarts. Order references use a sequential `MAS-` prefix and
exactly five digits (for example, `MAS-00001`); guest tracking checks the
reference together with the checkout phone number. Admins move orders through
placed, processing, shipped, and delivered in order. A courier partner and
tracking ID are required before shipping; both appear in guest order tracking.
Brevo sends a status-specific customer email at order placement and on each
subsequent status transition. Review submissions are pending moderation by
default.

Anonymous storefront sessions use an HttpOnly `guest_id` cookie. Cart and
watchlist contents are persisted against that guest in the database, while
prices and inventory are refreshed from the catalog and revalidated at
checkout. `GET` and `PUT /api/cart` exchange the current cart-line array
(writes accept product IDs, optional variant IDs, and quantities only);
`GET` and `PUT /api/watchlist` exchange the current product-slug array. To
remove sessions inactive for more than 90 days that have no orders, schedule
`python -m app.scripts.cleanup_guests` from the `backend` directory to run
daily.

Standard catalog entries are stored in `products`; discounted combo listings are
stored separately in `combos`. A combo can include regular product variants,
combo-only packs, or both. Regular variants are linked through
`combo_catalog_products`, and their inventory remains in `product_variants`.
Each `combo_products` row stores the name, pack size, SKU, price, MRP, and
independent inventory for a combo-only pack, plus the quantity included in its
combo. These packs are not regular catalog products. Public catalog responses
combine products and combos, while order lines retain a snapshot of the combo or
product purchased. Ordering a combo decrements stock in each included inventory
source. The `20261011_combo_catalog_products` migration clears existing rows
from `combo_products` before adding the regular-product relation.

## Admin API contracts

All data endpoints below require `Authorization: Bearer <access_token>` and use
JSON. `POST /api/admin/login` accepts `{ "email": "...", "password": "..." }`
and returns `{ "access_token": "...", "token_type": "bearer" }`.
`GET /api/admin/registration-status` reports whether accounts exist.
`POST /api/admin/register` accepts an email and a password (12–128 characters).
The first account can be registered without authentication; subsequent
registrations require an admin bearer token.
`GET /api/admin/admins` lists account metadata for authenticated admins.
`GET /api/admin/integration-settings` reports notification configuration
without returning provider secrets; `PUT /api/admin/integration-settings`
updates provider credentials, sender details, and enable/disable flags.
Notification settings are stored in a dedicated database table, with API
credentials stored in that table. Configure both Twilio SMS and Brevo
transactional email from Admin → API & notifications. The dashboard masks
provider credentials by default and allows administrators to reveal them.
Checkout requires the customer's email. Orders are saved before notifications
are sent; provider failures are logged and reported as per-channel confirmation
statuses without discarding the order.

Homepage hero images are uploaded and managed from the admin panel's **Hero
section**. `GET /api/hero-images` is public and supplies the homepage carousel;
the authenticated `/api/admin/hero-images` endpoints list, upload, and remove
slides. Apply the `hero_images` migration before using the section.

New RustFS images are stored in the `masaladb` bucket directly under section
folders such as `products/{product_id}/...`, `hero/...`,
`homepage/categories/...`, `blog/...`, and `recipes/...`. Filenames are derived
from the uploaded filename (or hero alt text); duplicate names receive a
numbered suffix rather than overwriting an existing image. Set
`RUSTFS_BUCKET=masaladb` and create that bucket in the RustFS console before
uploading. Set `RUSTFS_LEGACY_BUCKET=masala-store` to keep existing objects
readable while new uploads use `masaladb`.

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
| | `GET /api/admin/coupons` | Coupon array; coupons are created and managed in the admin dashboard. `POST /api/admin/coupons` creates; `PUT /api/admin/coupons/{id}` updates; `DELETE /api/admin/coupons/{id-or-code}` removes. Percentage/fixed promotions accept `percentage`/`fixed_amount` or `discount_value`; activation fields accept both `is_active`/`active`, `active_from`/`starts_at`, and `active_until`/`ends_at`. `first_order_only` is persisted and enforced against previous customer orders. |
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
