# 🛡️ CyberShield — Cybersecurity Threat Monitoring System

A full-stack, production-grade cybersecurity threat monitoring platform with real-time dashboards, log ingestion, threat intelligence, JWT authentication, and WebSocket live feeds.

---

## 📁 Project Structure

```
threat-monitor/
├── frontend/                       # Next.js 14 (App Router)
│   ├── app/
│   │   ├── (auth)/login/           # Login & register pages
│   │   ├── dashboard/              # Main dashboard + layout
│   │   ├── threats/                # Threat events CRUD table
│   │   ├── alerts/                 # Alert notification center
│   │   ├── analytics/              # Charts & stats
│   │   └── api/                    # Next.js API gateway proxy routes
│   ├── components/
│   │   ├── ThreatFeed.tsx          # Live WebSocket threat feed
│   │   ├── ThreatMap.tsx           # World map of attack origins
│   │   ├── AlertBell.tsx           # Sidebar unread badge
│   │   └── charts/
│   │       ├── ThreatTimelineChart.tsx
│   │       ├── CategoryDonutChart.tsx
│   │       ├── SeverityBarChart.tsx
│   │       └── ActivityHeatmap.tsx
│   ├── lib/
│   │   ├── api.ts                  # Axios client + JWT interceptors + refresh
│   │   ├── auth.ts                 # Zustand auth store (persist)
│   │   └── ws.ts                   # WebSocket singleton with auto-reconnect
│   └── middleware.ts               # Auth guard + rate limiting + security headers
│
├── backend/                        # FastAPI (Python 3.12)
│   ├── app/
│   │   ├── main.py                 # App entry + CORS + router mounting
│   │   ├── core/
│   │   │   ├── config.py           # Pydantic Settings (env-driven)
│   │   │   ├── database.py         # SQLAlchemy async engine + session
│   │   │   ├── security.py         # JWT encode/decode + bcrypt + RBAC
│   │   │   ├── rate_limit.py       # Redis sliding window rate limiter
│   │   │   ├── redis_client.py     # Async Redis singleton
│   │   │   └── sanitize.py         # Log sanitization + input validation
│   │   ├── api/
│   │   │   ├── auth.py             # /auth/login, /register, /refresh, /me
│   │   │   ├── threats.py          # /threats CRUD + WS broadcast
│   │   │   ├── logs.py             # /logs ingest + parse
│   │   │   ├── alerts.py           # /alerts list + mark-read
│   │   │   ├── analytics.py        # /analytics/stats, /analytics/dashboard
│   │   │   └── intel.py            # /intel/ip, /intel/domain, /intel/cve
│   │   ├── models/                 # SQLAlchemy ORM models
│   │   │   ├── user.py             # User + UserRole enum
│   │   │   ├── threat.py           # ThreatEvent + severity/category/status enums
│   │   │   ├── alert.py            # Alert model
│   │   │   └── log_entry.py        # LogEntry model
│   │   ├── schemas.py              # All Pydantic v2 request/response schemas
│   │   ├── services/
│   │   │   ├── threat_engine.py    # Auto-classify + risk scoring
│   │   │   ├── log_parser.py       # syslog / nginx / auth log parsers
│   │   │   ├── intel_fetcher.py    # AbuseIPDB / VirusTotal / NVD CVE
│   │   │   └── notifier.py         # Email / Slack / webhook dispatch
│   │   ├── workers/
│   │   │   ├── feed_poller.py      # Celery: poll threat intel feeds
│   │   │   └── analytics_job.py    # Celery: nightly aggregation
│   │   └── ws/
│   │       └── manager.py          # WebSocket connection manager
│   ├── tests/
│   │   ├── conftest.py
│   │   └── test_main.py            # Auth, threat, sanitize, engine tests
│   ├── alembic/
│   │   ├── env.py                  # Alembic async migration env
│   │   └── versions/               # Migration files
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env
│
├── docker-compose.yml
└── README.md
```

---

## 🚀 Quick Start

### Option 1 — Docker Compose (recommended)

```bash
git clone <repo>
cd threat-monitor

# Start all services (Postgres, Redis, FastAPI, Celery, Next.js)
docker compose up --build
```

| Service   | URL                        |
|-----------|----------------------------|
| Frontend  | http://localhost:3000       |
| API docs  | http://localhost:8000/api/docs |
| Backend   | http://localhost:8000       |

---

### Option 2 — Local development

#### Backend

```bash
cd backend

# Create virtualenv
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate

# Install deps
pip install -r requirements.txt

# Start Postgres and Redis (via Docker)
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=password -e POSTGRES_DB=cybershield postgres:16-alpine
docker run -d -p 6379:6379 redis:7-alpine

# Copy and configure environment
cp .env .env.local   # edit DATABASE_URL, REDIS_URL, SECRET_KEY

# Run database migrations (auto-creates tables on startup)
uvicorn app.main:app --reload --port 8000
```

#### Frontend

```bash
cd frontend

npm install
cp .env.local .env.local   # already configured for localhost

npm run dev   # http://localhost:3000
```

#### Celery worker (optional — for background jobs)

```bash
cd backend
celery -A app.workers.feed_poller worker --beat -l info
```

---

## 🔑 API Endpoints

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login → JWT tokens |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Revoke token |
| GET  | `/api/auth/me` | Current user profile |

### Threats
| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/threats` | List with filters (severity, status, search) |
| POST   | `/api/threats` | Create threat event |
| GET    | `/api/threats/{id}` | Get single threat |
| PATCH  | `/api/threats/{id}` | Update status/severity |
| DELETE | `/api/threats/{id}` | Delete (admin only) |

### Logs
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/logs` | Ingest + sanitize raw log line |
| GET  | `/api/logs` | List parsed logs |

### Alerts
| Method | Path | Description |
|--------|------|-------------|
| GET   | `/api/alerts` | List alerts (optional: unread_only) |
| PATCH | `/api/alerts/{id}/read` | Mark as read |
| POST  | `/api/alerts/mark-all-read` | Mark all read |

### Analytics
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/analytics/stats` | Severity / category / status counts |
| GET | `/api/analytics/dashboard` | Full dashboard summary |

### Intel
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/intel/ip/{ip}` | AbuseIPDB lookup |
| GET | `/api/intel/domain/{domain}` | VirusTotal lookup |

### WebSocket
```
ws://localhost:8000/ws/threats?token=<JWT>
```
Broadcasts `{ type: "new_threat", data: { ... } }` to all connected clients when a threat is created.

---

## 🔒 Security Features

| Feature | Implementation |
|---------|---------------|
| JWT Authentication | Access (15 min) + Refresh (7 days) tokens via `python-jose` |
| Password hashing | bcrypt via `passlib` |
| RBAC | `admin` / `analyst` / `viewer` roles enforced per route |
| Rate limiting | Redis sliding window per IP+endpoint |
| Input validation | Pydantic v2 strict schemas on all inputs |
| Log sanitization | ANSI strip, null-byte removal, HTML escape, max-length cap |
| Token blacklist | Redis-backed revocation on logout |
| Security headers | X-Frame-Options, X-Content-Type-Options, Referrer-Policy |
| CORS | Configurable allowed origins |

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Async PostgreSQL DSN | `postgresql+asyncpg://...` |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |
| `SECRET_KEY` | JWT signing key | **Change in production!** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token TTL | `15` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token TTL | `7` |
| `ABUSEIPDB_API_KEY` | Threat intel (optional) | `""` |
| `VIRUSTOTAL_API_KEY` | Domain intel (optional) | `""` |
| `SLACK_WEBHOOK_URL` | Alert notifications (optional) | `""` |
| `SMTP_USER` / `SMTP_PASSWORD` | Email alerts (optional) | `""` |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_BACKEND_URL` | FastAPI base URL |
| `NEXT_PUBLIC_WS_URL` | WebSocket base URL |
| `BACKEND_URL` | Server-side proxy target |

---

## 🧪 Running Tests

```bash
cd backend
pip install pytest pytest-asyncio httpx aiosqlite
pytest tests/ -v
```

---

## 📊 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Recharts, Zustand, TanStack Query |
| Backend | FastAPI, Python 3.12, Pydantic v2, SQLAlchemy 2 (async) |
| Auth | PyJWT, bcrypt, Redis token blacklist |
| Real-time | FastAPI WebSockets + Redis pub/sub |
| Workers | Celery + Redis broker |
| Database | PostgreSQL 16 |
| Cache / Rate limit | Redis 7 |
| Containerization | Docker + Docker Compose |
| Migrations | Alembic (async) |
| Testing | pytest-asyncio, httpx ASGI client |

---

## 🗺️ Threat Intel Integrations

Configure API keys in `.env` to enable live data:

- **[AbuseIPDB](https://www.abuseipdb.com/)** — IP reputation & abuse score
- **[VirusTotal](https://www.virustotal.com/)** — Domain / file / URL analysis
- **[NVD CVE](https://nvd.nist.gov/)** — CVE details & CVSS scores (no key needed)
- **[AlienVault OTX](https://otx.alienvault.com/)** — Threat pulses (add `OTX_API_KEY`)

---

## 📝 License

MIT — built for educational and operational use.
