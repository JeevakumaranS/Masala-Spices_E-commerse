# Masala & Spices E-commerce Platform

This repository is organized as a monorepo with a Next.js storefront in `frontend` and a FastAPI backend in `backend`.

## Stack
- Frontend: Next.js 16 + App Router + TypeScript + Tailwind CSS
- Backend: FastAPI + SQLAlchemy + PostgreSQL + Alembic
- Local development: frontend, backend, and PostgreSQL run on the host; RustFS runs in Docker

## Docker quick start

1. Copy `.env.example` to `.env`, `backend/.env.example` to `backend/.env`, and `frontend/.env.example` to `frontend/.env`. Set `ADMIN_TOKEN_SECRET` in `backend/.env` to a random value of at least 32 bytes, and replace the development database and RustFS credentials in `.env`.
2. Start the application:
   ```bash
   docker compose up --build
   ```
3. Open the app:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8000/docs
   - PostgreSQL: localhost:5433

Compose starts PostgreSQL 18, waits for it to become ready, applies backend
migrations, then starts the API and storefront. Catalog content is managed
through the admin dashboard; no sample catalog or unused sample promotions are
inserted automatically. The PostgreSQL 18 database uses the
`postgres_data_pg18` volume. If you previously ran this project with PostgreSQL
16, its `postgres_data` volume is preserved but is not automatically migrated;
back up and restore that data separately if you need it.

## Local development (macOS/Linux)

The backend requires Python 3.12, matching `backend/Dockerfile`. Install Python
3.12 before creating its virtual environment if `python3.12` is not available.

Install and configure local PostgreSQL 18 once. This keeps the `DATABASE_URL`
port at `5433` without running the database in Docker:

```bash
brew install postgresql@18
PG_PREFIX="$(brew --prefix postgresql@18)"
"$PG_PREFIX/bin/pg_ctl" \
  -D "$(brew --prefix)/var/postgresql@18" \
  -o "-p 5433" \
  -l "$(brew --prefix)/var/log/postgresql@18.log" start
"$PG_PREFIX/bin/psql" -h localhost -p 5433 -d postgres <<'SQL'
CREATE ROLE masala LOGIN PASSWORD 'masala123';
CREATE DATABASE masala_db OWNER masala;
ALTER SYSTEM SET port = '5433';
SQL
```

Start the backend in one terminal:

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
alembic upgrade head
python -m uvicorn app.main:app --reload --port 8000
```

Start the frontend in a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

Configure the API and site endpoints in the root `.env` for Docker Compose.
`BACKEND_API_URL` is the backend address reachable from the frontend container
(for example, `http://backend:8000`); browser API traffic is proxied through the
frontend at runtime. `NEXT_PUBLIC_SITE_URL` is the public frontend URL and
`CORS_ORIGINS` lists the allowed frontend origins. Set these to the production
domain values before deploying, then run `docker compose up -d --build` so the
public site metadata and RustFS image settings are rebuilt. For standalone local
development, set `BACKEND_API_URL` and `NEXT_PUBLIC_SITE_URL` in
`frontend/.env`, and configure database, CORS, and RustFS credentials in
`backend/.env`. To run object storage in Docker, use
`docker compose -f rustfs/docker-compose.yml up -d`. The optional full-stack
Compose setup targets the backend container at `http://backend:8000`.

## ISR revalidation note

Admin updates should trigger on-demand revalidation from the admin write flow (for example `revalidatePath` / `revalidateTag`) in the Next.js app after a product, category, recipe, or blog change is saved. This keeps statically cached store pages fresh without forcing a full site rebuild on every request.

## Scope note

This build includes the storefront routes (`/`, collection pages, PDPs, recipes, blogs, and order lookup) and admin-managed CRUD endpoints. Guest cart and checkout include server-validated promotions, domestic shipping thresholds, and a configurable “Flying Abroad” shipping matrix. Order confirmation emails can be sent through Brevo transactional email and SMS confirmations through Twilio when configured in the environment; WhatsApp delivery is not integrated. The checkout shows the order reference and routes payment confirmation through the admin by phone.
