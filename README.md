# Masala & Spices E-commerce Platform

This repository is organized as a monorepo with a Next.js storefront in `frontend` and a FastAPI backend in `backend`.

## Stack
- Frontend: Next.js 16 + App Router + TypeScript + Tailwind CSS
- Backend: FastAPI + SQLAlchemy + PostgreSQL + Alembic
- Local development: frontend, backend, and PostgreSQL run on the host; RustFS runs in Docker

## Docker quick start

1. Copy `backend/.env.example` to `backend/.env` and set `ADMIN_TOKEN_SECRET` to a random value of at least 32 bytes.
2. Start the application:
   ```bash
   docker compose up --build
   ```
3. Open the app:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8000/docs
   - PostgreSQL: localhost:5433

Compose starts PostgreSQL 18, waits for it to become ready, applies backend
migrations, loads the sample catalog only when the catalog tables are empty,
then starts the API and storefront. Existing catalog records are preserved. The
PostgreSQL 18 database uses the `postgres_data_pg18` volume. If you previously ran this project with
PostgreSQL 16, its `postgres_data` volume is preserved but is not automatically
migrated; back up and restore that data separately if you need it.

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
python scripts/seed_data.py
python -m uvicorn app.main:app --reload --port 8000
```

Start the frontend in a second terminal:

```bash
cd frontend
npm ci
npm run dev
```

The local frontend environment targets the API at `http://localhost:8000`.
Browser API requests use the Next.js same-origin proxy; set `API_PROXY_TARGET`
if the API has a different address reachable from the Next.js server. To run
object storage in Docker, use
`docker compose -f rustfs/docker-compose.yml up -d`. The optional full-stack
Compose setup targets the backend container at `http://backend:8000`.

## ISR revalidation note

Admin updates should trigger on-demand revalidation from the admin write flow (for example `revalidatePath` / `revalidateTag`) in the Next.js app after a product, category, recipe, or blog change is saved. This keeps statically cached store pages fresh without forcing a full site rebuild on every request.

## Scope note

This initial build focuses on the project shell, data contracts, and the SEO-critical storefront routes (`/`, collection pages, PDPs, recipes, blogs, and order lookup). The backend includes the main CRUD endpoints and sample seed data for local development. Guest cart and checkout now include server-validated starter promos, domestic shipping thresholds, and a configurable “Flying Abroad” shipping matrix. Order confirmation emails can be sent through Brevo transactional email and SMS confirmations through Twilio when configured in the admin API settings; WhatsApp delivery is not integrated. The checkout shows the order reference and routes payment confirmation through the admin by phone.
