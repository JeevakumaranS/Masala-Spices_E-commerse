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
└── requirements.txt
```

## Adding a module

1. Create `app/modules/<feature>/`.
2. Add `router.py` for the module's `APIRouter` and `schemas.py` for its
   request/response models.
3. Add development data in `data.py` when the module needs seed data.
4. Register the router in `app/api/router.py`.

Run the application from this directory with:

```bash
.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```

## Environment and database setup

Copy `.env.example` to `.env`, set `DATABASE_URL`, an `ADMIN_TOKEN_SECRET`
containing at least 32 random bytes, and a unique `ADMIN_BOOTSTRAP_SECRET`.
Apply migrations, then use the first-admin registration page or
`POST /api/admin/register` with the bootstrap secret to create the initial
database-backed administrator. The bootstrap secret only works until that
first account has been committed. Later registrations require an active admin
bearer token. Admin passwords are stored as salted scrypt hashes; no admin
credentials are hard-coded or stored in environment variables. The login
endpoint is `POST /api/admin/login`; use its bearer token for every
`/api/admin/*` data endpoint and the legacy `/api/analytics/summary` endpoint.
Tokens expire after eight hours and are rejected when the corresponding
administrator is inactive or no longer exists.

Apply schema changes after configuring the database:

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
```

Admin products support nested variants (pack size, SKU, price, stock, batch and
expiry), image records, category tags and product facets. Orders created through
the storefront are persisted, reviewed through the admin order routes, and
retained across restarts. Review submissions are pending moderation by default.

## Admin API contracts

All data endpoints below require `Authorization: Bearer <access_token>` and use
JSON. `POST /api/admin/login` accepts `{ "email": "...", "password": "..." }`
and returns `{ "access_token": "...", "token_type": "bearer" }`.
`GET /api/admin/registration-status` reports whether accounts exist and whether
first-admin setup is configured. `POST /api/admin/register` accepts an email
and a password (12–128 characters); include `bootstrap_secret` only for the
first account. Subsequent registrations require an admin bearer token.
`GET /api/admin/admins` lists account metadata for authenticated admins.

| Method and path | Contract |
| --- | --- |
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
