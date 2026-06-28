# 🚀 Release Checklist

**Live demo:**
- App (SPA): https://release-checklist-web.onrender.com
- API: https://release-checklist-api-ry9r.onrender.com/api/health

> Hosted on Render (free tier) + Neon Postgres. The API spins down after
> inactivity, so the first request after an idle period can take ~50s to wake.

A small, single-page web app to track a software release through a fixed
checklist of steps. A **Release** has a name, a date, optional notes, and a set
of steps that are either **on** or **off**. Its status is **computed, never
chosen**:

| Steps completed | Status    |
| --------------- | --------- |
| none            | `planned` |
| some            | `ongoing` |
| all             | `done`    |

> Single-user app — no auth, no accounts.

---

## Tech stack

| Layer        | Choice                                                       | Why                                                       |
| ------------ | ------------------------------------------------------------ | --------------------------------------------------------- |
| **Frontend** | React 18 + TypeScript, built with Vite (SPA)                 | Fast, typed, deploys as static files.                     |
| **Backend**  | Node + Express + TypeScript (REST)                           | Small, explicit, easy to read.                            |
| **Database** | PostgreSQL (Neon) via Prisma ORM                             | Managed, scalable; type-safe migrations.                  |
| **Cache**    | Redis (optional)                                             | Caches the release list; **degrades gracefully** if down. |
| **Repo**     | npm-workspaces monorepo (`server/` + `web/`)                 | One repo, one install.                                    |
| **Tests**    | Vitest + Supertest                                           | Unit (status logic) + API integration.                    |

The steps are **fixed and defined in code** (`server/src/domain/steps.ts`), so
there is no `steps` table — each release just stores which step ids are done.

---

## System architecture

```
┌────────────────────┐        HTTPS / JSON        ┌─────────────────────┐
│   React SPA (Vite)  │  ───────────────────────▶  │  Express REST API   │
│  static site        │     /api/releases ...      │  (Node + TypeScript)│
│  (Render / nginx)   │  ◀───────────────────────  │                     │
└────────────────────┘                             └───────┬──────┬──────┘
                                                           │      │
                                          Prisma (SQL)     │      │  cache (best-effort)
                                                           ▼      ▼
                                                   ┌────────────┐ ┌──────────┐
                                                   │ PostgreSQL │ │  Redis   │
                                                   │  (Neon)    │ │ (Upstash)│
                                                   └────────────┘ └──────────┘
```

- The API is **stateless** → scale horizontally behind a load balancer.
- `status` is derived from `steps` on every read → a single source of truth that
  can never drift.
- Redis caches `GET /api/releases` and is invalidated on every write. If Redis is
  unreachable the API falls back to Postgres — a cache outage costs latency, never
  correctness. (`X-Cache: HIT|MISS` response header shows which path was taken.)
- Step toggles use a transactional read-modify-write so concurrent edits to the
  same release can't lose updates.

---

## File structure

```
release-checklist/
├── server/                      # Express + Prisma REST API
│   ├── prisma/
│   │   ├── schema.prisma         # Release model
│   │   └── migrations/           # committed SQL migrations
│   ├── src/
│   │   ├── index.ts              # entrypoint (listen + graceful shutdown)
│   │   ├── app.ts                # express app factory (testable)
│   │   ├── config/env.ts         # zod-validated environment
│   │   ├── lib/
│   │   │   ├── prisma.ts          # shared Prisma client
│   │   │   └── cache.ts           # Redis wrapper (graceful no-op)
│   │   ├── domain/steps.ts       # ★ canonical steps + computeStatus()
│   │   ├── schemas/              # zod request validation
│   │   ├── middleware/           # validate + central error handler
│   │   ├── services/             # business logic + caching
│   │   ├── controllers/          # thin HTTP handlers
│   │   └── routes/               # route table
│   ├── tests/                    # steps unit test + API e2e test
│   └── Dockerfile
├── web/                         # React + Vite SPA
│   ├── src/
│   │   ├── App.tsx               # list + detail layout
│   │   ├── api/client.ts         # typed fetch wrapper
│   │   ├── hooks/useReleases.ts  # state + optimistic updates
│   │   ├── components/           # StatusBadge, StepChecklist, ReleaseDetail, modal
│   │   └── styles.css
│   ├── nginx.conf                # serves SPA + proxies /api (docker)
│   └── Dockerfile
├── docker-compose.yaml          # Postgres + Redis + API + web, one command
├── render.yaml                  # Render deploy blueprint
└── .env.example
```

---

## Database schema

One table. Steps are stored as a JSONB map, status is computed (not stored).

```prisma
model Release {
  id             String   @id @default(uuid()) @db.Uuid
  name           String   @db.VarChar(200)         // mandatory
  releaseDate    DateTime @db.Timestamptz(6)       // mandatory
  additionalInfo String?                            // optional
  steps          Json     @default("{}")           // { "code_freeze": true, ... }
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([releaseDate])
}
```

Equivalent SQL:

```sql
CREATE TABLE releases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            VARCHAR(200) NOT NULL,
  release_date    TIMESTAMPTZ  NOT NULL,
  additional_info TEXT,
  steps           JSONB        NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ  NOT NULL
);
CREATE INDEX releases_release_date_idx ON releases (release_date);
```

---

## API endpoints

Base path: `/api`. All responses are JSON, wrapped as `{ "data": ... }` (errors as
`{ "error": { "message": ... } }`).

| Method   | Path                   | Description                                  | Body                              |
| -------- | ---------------------- | -------------------------------------------- | --------------------------------- |
| `GET`    | `/api/health`          | Liveness + cache status                      | —                                 |
| `GET`    | `/api/steps`           | The canonical checklist (`id` + `label`)     | —                                 |
| `GET`    | `/api/releases`        | List all releases (sorted by date)           | —                                 |
| `POST`   | `/api/releases`        | Create a release                             | `{ name, releaseDate, additionalInfo? }` |
| `GET`    | `/api/releases/:id`    | Get one release                              | —                                 |
| `PATCH`  | `/api/releases/:id`    | Update name / date / additional info         | `{ additionalInfo?, name?, releaseDate? }` |
| `PATCH`  | `/api/releases/:id/steps` | Check / uncheck one step                  | `{ stepId, completed }`           |
| `DELETE` | `/api/releases/:id`    | Delete a release                             | —                                 |

A release object looks like:

```json
{
  "id": "35ece412-…",
  "name": "v2.4.0 — Billing revamp",
  "releaseDate": "2026-07-15T09:00:00.000Z",
  "additionalInfo": "rollback plan in #releases",
  "steps": { "code_freeze": true, "unit_tests": false, "...": false },
  "status": "ongoing",
  "completedCount": 1,
  "totalSteps": 8,
  "createdAt": "…",
  "updatedAt": "…"
}
```

---

## Run locally

### Option A — Node (uses your own Postgres/Redis or Neon/Upstash)

```bash
git clone <repo> && cd release-checklist
npm install

cp .env.example server/.env        # then edit server/.env with your DATABASE_URL
npm run db:migrate                 # apply migrations
npm run dev                        # API :4000 + web :5173 together
```

Open **http://localhost:5173**. The Vite dev server proxies `/api` → `:4000`.

`REDIS_URL` is optional — leave it unset to run without caching.

### Option B — Docker (self-contained: Postgres + Redis + API + web)

```bash
docker compose up --build
```

Open **http://localhost:8080**. No external services needed — compose runs its own
Postgres and Redis and applies migrations automatically on startup.

---

## Tests

```bash
npm test          # from repo root (runs the server suite)
```

- `tests/steps.test.ts` — unit tests for the status rule (planned/ongoing/done)
  and resilience of the stored-steps normalization.
- `tests/releases.e2e.test.ts` — full API lifecycle via Supertest
  (create → toggle → complete → update → delete + validation). Requires
  `DATABASE_URL`; it only touches rows it creates and cleans up after itself.

---

## Deployment (Render + Neon)

This repo ships a [`render.yaml`](./render.yaml) Blueprint that creates two
services: the **API** (Docker) and the **web** SPA (static site).

1. Create a Postgres database on [Neon](https://neon.tech) and copy its
   connection string (must end with `?sslmode=require`).
2. *(Optional)* create a Redis instance on [Upstash](https://upstash.com) and copy
   its `rediss://` URL.
3. Push this repo to GitHub.
4. In Render: **New → Blueprint** → select the repo. It reads `render.yaml`.
5. Set the secret env vars (marked `sync: false`):
   - on **release-checklist-api**: `DATABASE_URL`, `REDIS_URL` (optional),
     `WEB_ORIGIN` = the web service URL.
   - on **release-checklist-web**: `VITE_API_URL` = the API service URL, then
     trigger a redeploy so it's baked into the build.

Migrations run automatically on API startup (`prisma migrate deploy`).

### Environment variables

| Variable            | Used by | Description                                                |
| ------------------- | ------- | ---------------------------------------------------------- |
| `DATABASE_URL`      | API     | PostgreSQL connection string (required)                    |
| `REDIS_URL`         | API     | Redis URL (optional; app runs without it)                  |
| `WEB_ORIGIN`        | API     | Comma-separated allowed CORS origins (the web app URL)     |
| `CACHE_TTL_SECONDS` | API     | TTL for the cached release list (default 60)               |
| `PORT`              | API     | Listen port (default 4000)                                 |
| `VITE_API_URL`      | web     | API base URL baked at build time (empty = same origin)     |

---

## Design notes / trade-offs

- **Status is computed, not stored.** Keeps a single source of truth; cost is a
  trivial in-memory calculation per row.
- **Steps in code, not a table** — matches the spec. `normalizeSteps()` makes
  adding/removing a step safe for existing rows (missing keys default to `false`,
  unknown keys are dropped).
- **Redis is optional.** The cache accelerates the hot list endpoint but is never
  required for correctness — important for resilience at scale.
- **Stateless API** → trivially horizontally scalable; Prisma pools DB connections.
```
