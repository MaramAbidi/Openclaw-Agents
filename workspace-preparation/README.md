# Lumiscore OpenClaw Portal

A local MVP web app for the Lumiscore OpenClaw Portal, inspired by Lumière Logistique.

It includes:

- a polished corporate homepage
- sign up and login flows
- MySQL-backed user accounts
- manual admin approval
- protected dashboard and OpenClaw info pages
- `express-session` authentication
- bcrypt password hashing
- a black-and-orange logistics-style UI

## Project structure

- `frontend/`
- `backend/`
- `backend/sql/init.sql`

## Demo admin account

- Email: `admin@lumiscore.local`
- Password: `Admin1234!`

The admin account is seeded automatically on first run if it does not already exist.

## Database

Create the database first if your MySQL user cannot create databases automatically.

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS lumicore CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

The backend also creates the `users` table automatically on startup.

## Environment variables

Copy the example file and adjust the values:

```bash
copy .env.example backend\.env
copy .env.example frontend\.env
```

You can also keep separate per-app env files:

- `backend/.env.example`
- `frontend/.env.example`

### Backend env

```env
PORT=3001
SESSION_SECRET=replace-me-with-a-long-random-string
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3307
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DATABASE=lumicore
SESSION_MAX_AGE_MS=28800000
REMEMBER_MAX_AGE_MS=2592000000
BCRYPT_SALT_ROUNDS=10
```

### Frontend env

```env
OPENCLAW_URL="http://127.0.0.1:18789/#token=984247bffb816e601e74726b1f3ab20cf5cb54596f365bd9"
```

This uses a static OpenClaw dashboard token for local testing only.

## Sample MySQL config

- Host: `127.0.0.1`
- Port: `3307`
- Database: `lumicore`
- User: `root`
- Password: your local MySQL password

## SQL init file

The schema file is here:

- [backend/sql/init.sql](./backend/sql/init.sql)

It defines the `users` table required by the MVP.

## Install

Install dependencies in both apps:

```bash
cd backend
npm install

cd ../frontend
npm install
```

## Run

Open two terminals.

### Terminal 1: backend

```bash
cd backend
npm run dev
```

### Terminal 2: frontend

```bash
cd frontend
npm run dev
```

The frontend runs on the Vite dev server, usually `http://127.0.0.1:5173`.
The backend runs on `http://127.0.0.1:3001`.

## Login and access flow

1. A user visits the homepage at `/`.
2. They can choose `Login` or `Request Access`.
3. A new user signs up through `/signup`.
4. The backend stores the account in MySQL with `pending` status and hashes the password with bcrypt.
5. The backend logs a clear admin notification message in the console.
6. An admin logs in with the seeded admin account.
7. The admin opens `/admin` and sees the pending users coming from MySQL.
8. The admin clicks `Approve` or `Reject`, which updates the same MySQL row.
9. Only `approved` users can log in successfully.
10. Approved users are redirected to `/dashboard`.
11. From the dashboard, they can open OpenClaw in a new tab with `window.open(OPENCLAW_URL, "_blank")`.

## Important MySQL setup note

If you want to receive new sign-up requests in your own MySQL instance, make sure `backend/.env` contains valid values for:

- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `MYSQL_DATABASE`

The backend connects to that database, inserts new users as `pending`, and the admin page reads the same database to approve them.

## Backend routes

- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/me`
- `GET /api/admin/pending-users`
- `POST /api/admin/users/:id/approve`
- `POST /api/admin/users/:id/reject`

## Pages

- `/`
- `/login`
- `/signup`
- `/dashboard`
- `/openclaw-info`
- `/admin`

## Security notes

- Passwords are hashed with bcrypt.
- Passwords are never stored in plaintext.
- Session cookies are `httpOnly`.
- The app does not use `localStorage` for auth.
- The OpenClaw URL is kept in the frontend environment only for this MVP.
- In production, the OpenClaw integration should move behind a secure backend or trusted-proxy layer.

## Homepage copy direction

The homepage is intentionally styled as a corporate logistics portal with a professional black-and-orange identity suitable for an internal operations gateway.

## Production note

This is a local MVP only. It is designed to validate the approval flow and the protected OpenClaw launch behavior before any production integration.
