# Dispatch Engine — Email Job Scheduler

A production-grade email scheduling system built with **Express.js + TypeScript**, **BullMQ + Redis**, **PostgreSQL**, **Ethereal Email**, and a **Next.js** dashboard.

---

## Architecture

```
┌──────────────┐    REST     ┌──────────────────┐   Enqueue   ┌───────────────┐
│   Next.js    │───────────▶│  Express API      │───────────▶│  BullMQ Queue │
│   Frontend   │◀───────────│  (TypeScript)     │            │  (Redis)      │
│   :3000      │   JSON      │  :4000           │            └──────┬────────┘
└──────────────┘             └────────┬─────────┘                   │
                                      │                      ┌──────▼────────┐
                                      │ Prisma ORM           │  Worker       │
                                      ▼                      │  (separate    │
                             ┌──────────────────┐            │   process)    │
                             │   PostgreSQL     │◀───────────┘  │
                             └──────────────────┘       ┌───────▼───────┐
                                                        │  Ethereal     │
                                                        │  SMTP         │
                                                        └───────────────┘
```

### Data Flow

1. **User composes** on the Next.js dashboard → `POST /api/emails/schedule`
2. **API server** validates input, writes `Dispatch` rows to PostgreSQL, enqueues **delayed BullMQ jobs** with `delay = scheduledAt - now`
3. **BullMQ** holds jobs in a Redis sorted set (scored by timestamp) — no polling needed
4. **Worker** picks up the job → idempotency check → rate limit check → sends via Ethereal SMTP → writes `Ledger` entry
5. **Dashboard** polls the listing APIs to show live status updates

---

## Tech Decisions

| Decision | Rationale |
|---|---|
| **BullMQ over cron** | Delayed jobs with precise timestamps; built-in retry/backoff; survives restarts via Redis persistence |
| **Separate worker process** | Isolates SMTP I/O from API latency; can scale workers independently |
| **Idempotency keys** | SHA-256 hash of (campaign + recipient + time) prevents duplicate sends on retries, crashes, or duplicate API calls |
| **Redis INCR rate limiter** | Atomic counter per sender per hour-bucket; no race conditions under concurrent workers |
| **Prisma** | Type-safe DB access with excellent migration tooling |
| **Ethereal** | Free fake SMTP for development — emails appear in a web inbox without sending real mail |

---

## Prerequisites

- **Node.js** ≥ 20
- **Docker** & **Docker Compose** (for PostgreSQL + Redis)
- **Google OAuth credentials** ([console.cloud.google.com](https://console.cloud.google.com/))

---

## Setup

### 1. Clone & install

```bash
git clone <your-repo-url>
cd "Email Job Scheduler"

# Backend
cd backend
cp ../.env.example .env      # edit with your Google OAuth creds + JWT secret
npm install
npx prisma generate

# Frontend
cd ../frontend
npm install
```

### 2. Start infrastructure

```bash
cd ..
docker compose up -d
```

### 3. Run database migrations

```bash
cd backend
npx prisma migrate dev --name init
npm run db:seed       # creates a dev test user
```

### 4. Start all services (3 terminals)

```bash
# Terminal 1 — API server
cd backend && npm run dev

# Terminal 2 — Worker
cd backend && npm run dev:worker

# Terminal 3 — Frontend
cd frontend && npm run dev
```

Open **http://localhost:3000** in your browser.

---

## Rate Limiting

- Each sender gets `MAX_EMAILS_PER_HOUR` (default 50) sends per clock-hour
- Implemented via Redis `INCR` on key `dispatch:rl:<senderId>:<hourBucket>`
- When exceeded, the worker **reschedules** the job to the start of the next hour + random jitter (0–30s)
- No emails are dropped — they queue up for the next window

---

## Persistence Guarantees

| Layer | Guarantee |
|---|---|
| **PostgreSQL** | Source of truth. Dispatch status tracks every state transition. |
| **Redis (AOF mode)** | BullMQ jobs persist across Redis restarts. Use `appendonly yes`. |
| **Recovery sweep** | On API server startup, queries DB for `SCHEDULED`/`RATE_LIMITED` rows that should have fired, and re-enqueues them. |
| **Idempotency** | `Ledger` table prevents double-sends even if a job is processed twice. |

---

## Trade-offs

- **Ethereal vs real SMTP** — Ethereal is dev-only. For production, swap transport config to SendGrid/SES.
- **Polling vs WebSocket** — Dashboard polls every 10–15s. Simpler to implement; sufficient for this scale.
- **At-least-once delivery** — We guarantee at-least-once (not exactly-once) sending, with idempotency checks to prevent visible duplicates.
- **Single-node worker** — Worker concurrency is 5. For true horizontal scaling, run multiple worker processes (BullMQ handles locking).

---

## Project Structure

```
├── backend/
│   ├── prisma/                 # Schema + migrations + seed
│   ├── src/
│   │   ├── config/             # env, redis, logger
│   │   ├── controllers/        # route handlers
│   │   ├── db/                 # Prisma client singleton
│   │   ├── middleware/         # auth, validation, errors
│   │   ├── queue/              # BullMQ queue + rate limiter
│   │   ├── routes/             # Express route definitions
│   │   ├── services/           # mailer, scheduler logic
│   │   ├── types/              # shared TypeScript interfaces
│   │   ├── app.ts              # Express app setup
│   │   ├── server.ts           # API entry point
│   │   └── worker.ts           # Worker entry point
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── app/                # Next.js App Router pages
│   │   ├── components/         # UI + domain components
│   │   ├── hooks/              # React Query hooks + session
│   │   ├── lib/                # API client, CSV parser
│   │   └── types/              # Frontend type definitions
│   └── package.json
├── docker-compose.yml          # PostgreSQL + Redis
├── .env.example
└── README.md
```
