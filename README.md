# Masala & Spices E-commerce Platform

This repository is organized as a monorepo with a Next.js storefront in `frontend` and a FastAPI backend in `backend`.

## Stack
- Frontend: Next.js 16 + App Router + TypeScript + Tailwind CSS
- Backend: FastAPI + SQLAlchemy + PostgreSQL + Alembic
- Local orchestration: Docker Compose

## Quick start

1. Copy the environment examples and adjust values as needed:
   - `frontend/.env.example`
   - `backend/.env.example`
2. Start local services:
   ```bash
   docker compose up --build
   ```
3. Open the app:
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8000/docs
   - PostgreSQL: localhost:5432

## Windows note: `&` in the project path

This folder name (`Masala&Spices_E-commerse`) contains an ampersand, which breaks the
`.cmd`/`.npx` shims — `npm run dev`, `npx next build`, `npx tsc` etc. fail because
`cmd.exe` treats `&` as a command separator. Two workarounds, both run from `frontend/`:

1. **Call node directly** (no npm shim involved):
   ```bash
   node .\node_modules\next\dist\bin\next dev
   node .\node_modules\next\dist\bin\next build
   node .\node_modules\next\dist\bin\next start -p 3000
   node .\node_modules\typescript\bin\tsc --noEmit
   ```
2. **Quote the working directory** if you must go through npm: the `&` only breaks when
   the path is expanded unquoted, so `npm --prefix "E:\Projects\Masala&Spices_E-commerse\frontend" run dev`
   works while a bare `cd` + `npm run` in some shells does not.

The backend has no such issue once you are inside `backend/`:
`.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000`

## ISR revalidation note

Admin updates should trigger on-demand revalidation from the admin write flow (for example `revalidatePath` / `revalidateTag`) in the Next.js app after a product, category, recipe, or blog change is saved. This keeps statically cached store pages fresh without forcing a full site rebuild on every request.

## Scope note

This initial build focuses on the project shell, data contracts, and the SEO-critical storefront routes (`/`, collection pages, PDPs, recipes, blogs, and order lookup). The backend includes the main CRUD endpoints and sample seed data for local development. Guest cart and checkout now include server-validated starter promos, domestic shipping thresholds, and a configurable “Flying Abroad” shipping matrix. Automated order confirmation email/SMS/WhatsApp notifications are intentionally deferred; the checkout shows the order reference and routes payment confirmation through the admin by phone.
