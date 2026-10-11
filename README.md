# Bunk24 Gallery

A full-stack starter with a Next.js App Router frontend, FastAPI backend, and PostgreSQL database.

## Run the stack

1. (Optional) Copy `.env.example` to `.env` and change `POSTGRES_PASSWORD`.
2. Start the services from the project root:

   ```sh
   docker compose up --build
   ```

3. Open:
   - Web app: <http://localhost:3000>
   - API docs: <http://localhost:8000/docs>
   - API readiness check: <http://localhost:8000/health/ready>

The readiness endpoint verifies its PostgreSQL connection. PostgreSQL data persists in the `postgres_data` volume. To stop the services, run `docker compose down`; to also remove the database volume, run `docker compose down -v`.

## Project structure

- `frontend/` — Next.js, React, and TypeScript application
- `backend/app/` — FastAPI application and SQLAlchemy database setup
- `compose.yaml` — local web, API, and PostgreSQL services

The API is configured by `DATABASE_URL` and `FRONTEND_ORIGIN`. The browser-facing API URL is configured by `NEXT_PUBLIC_API_URL` in the frontend environment.

## Useful endpoints

- `GET /health` — confirms the API process is running
- `GET /health/ready` — confirms the API can query PostgreSQL
- `/docs` — interactive OpenAPI documentation
