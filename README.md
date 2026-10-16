# BUNK24 Gallery — TURNER

A full-stack art gallery and print-store foundation for BUNK24, featuring the work of artist TURNER. The visual direction is editorial and gallery-led: warm paper tones, ink-black typography, expressive orange accents, and art-first layouts.

## Stack

- Web: Next.js App Router, React, TypeScript, responsive CSS.
- API: FastAPI, SQLAlchemy 2, PostgreSQL.
- Data: artwork, print variants, orders, and order items.
- Commerce: Stripe Checkout session creation is environment-gated; this app never handles card details.
- Local development: native Windows Python/Node plus a local PostgreSQL installation. Docker Compose is optional.

## Run locally on Windows (without Docker)

### Prerequisites

- Git
- Python 3.12 recommended
- Node.js 22 LTS recommended
- PostgreSQL installed and running locally
- A PostgreSQL login and database for this app

The backend loads the repository-root `.env` file automatically, regardless of whether Uvicorn is started from the repository root or the `backend` directory. Shell/deployment environment variables take precedence. The `.env` file is ignored by Git and must never be committed.

### 1. Configure environment variables

From the repository root in PowerShell:

```powershell
Copy-Item .env.example .env
notepad .env
```

In `.env`, set `DATABASE_URL` to match the PostgreSQL role, password, and database you created. For example, if both the role and database are named `bunk24_app`:

```dotenv
DATABASE_URL=postgresql+psycopg://bunk24_app:YOUR_LOCAL_PASSWORD@127.0.0.1:5432/bunk24_app
```

Replace `YOUR_LOCAL_PASSWORD` with the password for that PostgreSQL role. If the password contains URL-reserved characters such as `@`, `:`, `/`, or `#`, URL-encode those characters in the URL. Keep the real password only in your local `.env` file.

The checked-in `.env.example` contains placeholders, not working credentials. You do not need to create a second database if you already created `bunk24_app` in pgAdmin.

### 2. Install and start the API

Open a PowerShell terminal at the repository root and run:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Use the virtual environment commands above to keep project packages separate from global Python or Anaconda packages. If PowerShell blocks activation, you can invoke the environment's Python directly instead:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

On first startup, the API creates missing tables and adds the current inventory-reservation compatibility column. Demo catalog rows are added only when `SEED_DEMO_DATA=true` and the catalog is empty.

Verify the API and database:

- API health: http://127.0.0.1:8000/health
- Database readiness: http://127.0.0.1:8000/health/ready
- Interactive API docs: http://127.0.0.1:8000/docs

The readiness endpoint should return `{"status":"ok","database":"connected"}`.

### 3. Install and start the frontend

Keep the API running. Open a **second** PowerShell terminal at the repository root:

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:3000 for the gallery and http://localhost:3000/admin for the admin page. The frontend's API base URL defaults to `http://localhost:8000`; set `NEXT_PUBLIC_API_URL` in `frontend/.env.local` only if you need to override it.

### Common local issues

- **`role "app" does not exist`:** the API is not reading the intended `DATABASE_URL`. Confirm the repository-root `.env` exists, its URL uses your actual PostgreSQL role/database, and restart Uvicorn.
- **Password authentication failed:** check the role password in pgAdmin and the URL in `.env`.
- **Database does not exist:** confirm the database name under pgAdmin's Databases node and use that exact name in `DATABASE_URL`.
- **Port 5432 is already in use:** use the port configured for your local PostgreSQL server; don't stop or delete an existing database service just to start this app.
- **PowerShell activation is blocked:** use the direct `.venv\Scripts\python.exe` commands shown above.

## Optional: run with Docker Compose

Docker is not required. If you prefer Docker later, install Docker Desktop, copy `.env.example` to `.env`, replace the example passwords/secrets, then run from the repository root:

```bash
docker compose up --build
```

Compose maps its PostgreSQL container to host port `5433` to avoid the common conflict with a local PostgreSQL server on `5432`. The API container uses the internal Compose hostname `db`, not `localhost`. Stop with `docker compose down`. **Do not** use `docker compose down -v` unless you intentionally want to delete the Compose database volume.

## Admin credentials

Generate a bcrypt password hash using the backend dependencies. With the backend virtual environment activated, run:

```powershell
python -c "from getpass import getpass; from passlib.context import CryptContext; print(CryptContext(schemes=['bcrypt']).hash(getpass('New admin password: ')))"
```

Put the resulting hash in `ADMIN_PASSWORD_HASH` and your admin email in `ADMIN_EMAIL` in the local `.env` file. Never put the plaintext admin password in environment files or source control. Set a unique random `JWT_SECRET_KEY` of at least 32 characters. Restart the API after changing environment values. Then sign in at http://localhost:3000/admin to manage artwork, print variants, inventory, and orders.

## Repository layout

- `frontend/app/` — public gallery, shop, admin landing, metadata, styling.
- `backend/app/main.py` — FastAPI routes.
- `backend/app/database.py` — database connection and local environment loading.
- `backend/app/models.py` — SQLAlchemy models for artwork, variants, orders, and order items.
- `backend/app/schemas.py` — request and response validation.
- `backend/app/security.py` — JWT helpers and admin dependency.
- `backend/app/commerce.py` — Stripe Checkout session creation.
- `backend/migrations/` — initial PostgreSQL schema.
- `compose.yaml` — optional frontend, API, and PostgreSQL services with health checks and persistent database storage.
- `.github/workflows/ci.yml` — automatic frontend type-check/build and backend/PostgreSQL schema checks on pushes and pull requests.

## Deployment notes

### Frontend on Vercel

Import this repository into Vercel and set the Root Directory to `frontend`. Configure `NEXT_PUBLIC_API_URL` to the deployed API origin. The shop reads the published catalog from the API and submits the cart to the checkout endpoint. Local demo artwork is inserted only when `SEED_DEMO_DATA=true`; turn this off in production and replace demo artwork, prices, and inventory with approved catalog entries.

### API on Vercel or another ASGI host

The API has a Vercel entrypoint at `backend/api/index.py` and configuration in `backend/vercel.json`. Configure `DATABASE_URL`, `FRONTEND_ORIGIN`, `JWT_SECRET_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, and Stripe settings in the deployment environment. Serverless instances are ephemeral, so do not rely on in-process state or local files for persistence.

### PostgreSQL

Use a managed PostgreSQL provider with TLS enabled. Set `DATABASE_URL` to the provider's SQLAlchemy/psycopg connection URL. The API can create tables on startup for initial local development; for controlled deployments, apply `backend/migrations/001_initial.sql`, `002_stripe_events.sql`, and `003_inventory_reservations.sql` before routing traffic.

### Stripe

Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_SUCCESS_URL` / `STRIPE_CANCEL_URL`. Configure the Stripe dashboard webhook endpoint as `https://YOUR_API_HOST/webhooks/stripe` and subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, and `checkout.session.async_payment_failed`. The API verifies Stripe signatures, records event IDs for idempotency, reserves stock during checkout, releases reservations on expired/failed sessions, and marks verified paid orders. Test webhook retries and inventory edge cases in Stripe test mode before live sales. Shipping address collection is enabled for the US, but shipping rates, tax calculation, refunds, and fulfillment integrations still need to be configured.

## Security and launch checklist

- [ ] Replace all example secrets; use a cryptographically random JWT secret.
- [ ] Restrict CORS to the exact production frontend origin.
- [ ] Configure TLS and managed database backups.
- [ ] Add rate limiting to login and checkout endpoints at the edge/API gateway.
- [ ] Provision the initial admin account securely.
- [ ] Configure and test the Stripe webhook endpoint with `STRIPE_WEBHOOK_SECRET`.
- [ ] Configure shipping rates and tax calculation before live sales.
- [ ] Add shipping/tax rules, refund policy, privacy policy, terms, and customer support contact.
- [ ] Replace demo artwork and sample descriptions with TURNER's approved images, titles, sizes, and prices.

The shop is connected to the catalog and checkout API. The admin console supports JWT sign-in, artwork creation, print variant creation, inventory edits, and order-status management. Complete end-to-end tests, shipping/tax setup, and fulfillment operations before launch.
