# BUNK24 API — NestJS + MySQL

NestJS REST API backed by MySQL through Prisma. This is the active backend for the Next.js application. The former Python/FastAPI backend is retained temporarily as a migration reference and is not used by the new API.

## Local setup (Windows PowerShell)

1. Create a MySQL database named `bunk24_gallery` in MySQL Workbench or phpMyAdmin.
2. Copy `.env.example` to `.env` and set your MySQL username/password and a random JWT secret (32+ characters).
3. Install and generate Prisma:

```powershell
cd api
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

The API listens on `http://localhost:8000`; health checks are at `/health` and `/health/ready`.

Set the frontend's `NEXT_PUBLIC_API_URL=http://localhost:8000`. Create an admin password hash with:

```powershell
node -e "const b=require('bcryptjs'); b.hash('YOUR_PASSWORD',12).then(console.log)"
```

Put the hash in `ADMIN_PASSWORD_HASH`. Keep secrets in local environment files only.
