# PayFlow — Payout Management System

A full-stack payout management MVP with role-based access control, AES-256-GCM encrypted API, and a complete audit trail.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: MongoDB Atlas (Mongoose)
- **Auth**: JWT (jsonwebtoken)
- **Encryption**: AES-256-GCM on every API request/response
- **UI**: shadcn/ui — Mira theme

## Run in under 5 minutes

```bash
# 1. Clone and install
cd payout-management
pnpm install

# 2. Environment (already configured — no changes needed)
cp .env.local.example .env.local   # or use the existing .env.local

# 3. Seed the database
# Start dev server first, then hit:
curl -X POST http://localhost:3000/api/seed

# Or just log in — the login page auto-seeds on first successful login.

# 4. Run
pnpm dev
```

Open http://localhost:3000

## Demo Credentials

| Role    | Email              | Password |
|---------|--------------------|----------|
| OPS     | ops@demo.com       | ops123   |
| FINANCE | finance@demo.com   | fin123   |

## API Design

All endpoints are **POST-only**. Request + response bodies are **AES-256-GCM encrypted**.

| Endpoint                  | Role         | Description                          |
|---------------------------|--------------|--------------------------------------|
| `POST /api/auth/login`    | Public       | Returns JWT token                    |
| `POST /api/seed`          | Public       | Seeds users + vendors (idempotent)   |
| `POST /api/vendors/list`  | Any          | List all vendors                     |
| `POST /api/vendors/create`| OPS only     | Create a vendor                      |
| `POST /api/payouts/list`  | Any          | List payouts (status/vendor filters) |
| `POST /api/payouts/create`| OPS only     | Create Draft payout                  |
| `POST /api/payouts/detail`| Any          | Get payout + audit trail             |
| `POST /api/payouts/submit`| OPS only     | Draft → Submitted                    |
| `POST /api/payouts/approve`| FINANCE only| Submitted → Approved                 |
| `POST /api/payouts/reject` | FINANCE only| Submitted → Rejected (reason req'd)  |

## Status Transitions

```
Draft ──(OPS submit)──▶ Submitted ──(FINANCE approve)──▶ Approved
                                  └──(FINANCE reject) ──▶ Rejected
```

No status can be skipped. Backend validates every transition.

## Architecture Notes

- **Single API file**: All 10 endpoints live in `app/api/[...path]/route.ts` with a dispatch table
- **AES-256-GCM**: Server uses Node.js `crypto`, browser uses Web Crypto API — same `iv:tag:ciphertext` format
- **RBAC**: Role is read from the JWT on every request — never trusted from the client body
- **Audit trail**: Immutable records with pre-save hook preventing modifications
- **URL encoding**: Frontend route query params use `encodeURIComponent` / `URLSearchParams`

## Environment Variables

```
MONGODB_URI=           # MongoDB Atlas connection string
JWT_SECRET=            # Secret for signing JWTs
AES_KEY=               # 64-char hex string (32 bytes) for server-side AES-256-GCM
NEXT_PUBLIC_AES_KEY=   # Same key, exposed to browser for client-side crypto
```
