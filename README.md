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
2. Copy .env.example to .env and replace the example database password and JWT secret.
3. Run from the repository root:

   docker compose up --build

4. Visit the gallery at http://localhost:3000, API docs at http://localhost:8000/docs, API health at http://localhost:8000/health, and database readiness at http://localhost:8000/health/ready.

Stop with docker compose down. To also delete the local database volume, use docker compose down -v.

## Admin credentials

Generate a bcrypt password hash using the backend dependencies. From the backend folder after installing requirements, run:

    python -c "from getpass import getpass; from passlib.context import CryptContext; print(CryptContext(schemes=['bcrypt']).hash(getpass('New admin password: ')))"

Put the resulting hash in ADMIN_PASSWORD_HASH and your admin email in ADMIN_EMAIL in the local .env file. Never put the plaintext password in environment files or source control. Set a unique random JWT_SECRET_KEY of at least 32 characters. The admin web page is a visual placeholder; use the API docs to exercise protected endpoints after obtaining a bearer token.

## Repository layout

- frontend/app/ — public gallery, shop, admin landing, metadata, styling.
- backend/app/main.py — FastAPI routes.
- backend/app/models.py — SQLAlchemy models for artwork, variants, orders, and order items.
- backend/app/schemas.py — request and response validation.
- backend/app/security.py — JWT helpers and admin dependency.
- backend/app/commerce.py — Stripe Checkout session creation.
- backend/migrations/ — initial PostgreSQL schema.
- compose.yaml — local frontend, API, and PostgreSQL services.

## Deployment notes

### Frontend on Vercel

Import this repository into Vercel and set the Root Directory to frontend. Configure NEXT_PUBLIC_API_URL to the deployed API origin. The shop reads the published catalog from the API and submits the cart to the checkout endpoint. Local demo artwork is inserted only when SEED_DEMO_DATA=true; turn this off in production and replace demo artwork, prices, and inventory with approved catalog entries.

### API on Vercel or another ASGI host

The API has a Vercel entrypoint at backend/api/index.py and configuration in backend/vercel.json. Configure DATABASE_URL, FRONTEND_ORIGIN, JWT_SECRET_KEY, ADMIN_EMAIL, ADMIN_PASSWORD_HASH, and Stripe settings in the deployment environment. Serverless instances are ephemeral, so do not rely on in-process state or local files for persistence.

### PostgreSQL

Use a managed PostgreSQL provider with TLS enabled. Set DATABASE_URL to the provider's SQLAlchemy/psycopg connection URL. The API can create tables on startup for initial local development; for controlled deployments, apply backend/migrations/001_initial.sql before routing traffic.

### Stripe

Set STRIPE_SECRET_KEY and STRIPE_SUCCESS_URL / STRIPE_CANCEL_URL to enable Checkout session creation. Keep the secret key on the server only. Before accepting live payments, implement and verify a Stripe webhook, persist event IDs idempotently, and transition order states only from verified webhook events. A Checkout redirect alone is not proof of payment. Inventory reservation, shipping, tax, refunds, and order fulfillment are not complete.

## Security and launch checklist

- [ ] Replace all example secrets; use a cryptographically random JWT secret.
- [ ] Restrict CORS to the exact production frontend origin.
- [ ] Configure TLS and managed database backups.
- [ ] Add rate limiting to login and checkout endpoints at the edge/API gateway.
- [ ] Provision the initial admin account securely.
- [ ] Add verified Stripe webhooks and idempotent order fulfillment before live sales.
- [ ] Add shipping/tax rules, refund policy, privacy policy, terms, and customer support contact.
- [ ] Replace demo artwork and sample descriptions with TURNER's approved images, titles, sizes, and prices.

The backend includes JWT-protected artwork creation, print variant management, inventory updates, order listing, and order-status routes. The browser-based admin console and live catalog/cart integration still need to be connected and tested before launch.
