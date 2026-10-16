# BUNK24 Gallery — TURNER

A full-stack art gallery and print-store foundation for BUNK24, featuring the work of artist TURNER. The visual direction is editorial and gallery-led: warm paper tones, ink-black typography, expressive orange accents, and art-first layouts.

## Stack

- Web: Next.js App Router, React, TypeScript, responsive CSS.
- API: FastAPI, SQLAlchemy 2, PostgreSQL.
- Data: artwork, print variants, orders, and order items.
- Commerce: Stripe Checkout session creation is environment-gated; this app never handles card details.
- Local development: Docker Compose.

## Run locally

Prerequisites: Docker Desktop and Git.

1. Clone the repository.
2. Copy `.env.example` to `.env`. Set a strong local `POSTGRES_PASSWORD` and a random `JWT_SECRET_KEY` of at least 32 characters. The Compose file builds the database URL from your PostgreSQL settings automatically.
3. Start the whole stack from the repository root:

   ```bash
   docker compose up --build
   ```

   This builds the frontend and API containers, starts PostgreSQL, waits for the database health check, and then starts the API and web app. On API startup, SQLAlchemy creates any missing tables and a small compatibility step updates an existing local database when needed. Demo catalog rows are added only if `SEED_DEMO_DATA=true` and the catalog is empty.
4. Visit the gallery at http://localhost:3000, admin at http://localhost:3000/admin, API docs at http://localhost:8000/docs, API health at http://localhost:8000/health, and database readiness at http://localhost:8000/health/ready.

Docker stores database files in the named `postgres_data` volume, so they persist when you stop containers. Stop with `docker compose down`. **Do not** use `docker compose down -v` unless you intentionally want to delete your local database data.

## Admin credentials

Generate a bcrypt password hash using the backend dependencies. From the backend folder after installing requirements, run:

    python -c "from getpass import getpass; from passlib.context import CryptContext; print(CryptContext(schemes=['bcrypt']).hash(getpass('New admin password: ')))"

Put the resulting hash in ADMIN_PASSWORD_HASH and your admin email in ADMIN_EMAIL in the local .env file. Never put the plaintext password in environment files or source control. Set a unique random JWT_SECRET_KEY of at least 32 characters. Restart the stack after changing environment values with `docker compose up --build -d`. Then sign in at http://localhost:3000/admin to manage artwork, print variants, inventory, and orders.

## Repository layout

- frontend/app/ — public gallery, shop, admin landing, metadata, styling.
- backend/app/main.py — FastAPI routes.
- backend/app/models.py — SQLAlchemy models for artwork, variants, orders, and order items.
- backend/app/schemas.py — request and response validation.
- backend/app/security.py — JWT helpers and admin dependency.
- backend/app/commerce.py — Stripe Checkout session creation.
- backend/migrations/ — initial PostgreSQL schema.
- compose.yaml — local frontend, API, and PostgreSQL services with health checks and persistent database storage.
- .github/workflows/ci.yml — automatic frontend type-check/build and backend/PostgreSQL schema checks on pushes and pull requests.

## Deployment notes

### Frontend on Vercel

Import this repository into Vercel and set the Root Directory to frontend. Configure NEXT_PUBLIC_API_URL to the deployed API origin. The shop reads the published catalog from the API and submits the cart to the checkout endpoint. Local demo artwork is inserted only when SEED_DEMO_DATA=true; turn this off in production and replace demo artwork, prices, and inventory with approved catalog entries.

### API on Vercel or another ASGI host

The API has a Vercel entrypoint at backend/api/index.py and configuration in backend/vercel.json. Configure DATABASE_URL, FRONTEND_ORIGIN, JWT_SECRET_KEY, ADMIN_EMAIL, ADMIN_PASSWORD_HASH, and Stripe settings in the deployment environment. Serverless instances are ephemeral, so do not rely on in-process state or local files for persistence.

### PostgreSQL

Use a managed PostgreSQL provider with TLS enabled. Set DATABASE_URL to the provider's SQLAlchemy/psycopg connection URL. The API can create tables on startup for initial local development; for controlled deployments, apply backend/migrations/001_initial.sql, 002_stripe_events.sql, and 003_inventory_reservations.sql before routing traffic.

### Stripe

Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, and STRIPE_SUCCESS_URL / STRIPE_CANCEL_URL. Configure the Stripe dashboard webhook endpoint as https://YOUR_API_HOST/webhooks/stripe and subscribe to checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.expired, and checkout.session.async_payment_failed. The API verifies Stripe signatures, records event IDs for idempotency, reserves stock during checkout, releases reservations on expired/failed sessions, and marks verified paid orders. Test webhook retries and inventory edge cases in Stripe test mode before live sales. Shipping address collection is enabled for the US, but shipping rates, tax calculation, refunds, and fulfillment integrations still need to be configured.

## Security and launch checklist

- [ ] Replace all example secrets; use a cryptographically random JWT secret.
- [ ] Restrict CORS to the exact production frontend origin.
- [ ] Configure TLS and managed database backups.
- [ ] Add rate limiting to login and checkout endpoints at the edge/API gateway.
- [ ] Provision the initial admin account securely.
- [ ] Configure and test the Stripe webhook endpoint with STRIPE_WEBHOOK_SECRET.
- [ ] Configure shipping rates and tax calculation before live sales.
- [ ] Add shipping/tax rules, refund policy, privacy policy, terms, and customer support contact.
- [ ] Replace demo artwork and sample descriptions with TURNER's approved images, titles, sizes, and prices.

The shop is connected to the live catalog and checkout API. The admin console supports JWT sign-in, artwork creation, print variant creation, inventory edits, and order-status management. Complete end-to-end tests, shipping/tax setup, and fulfillment operations before launch.
