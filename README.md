# 🛡️ Access Logger (`access-logger`)

A lightweight, self-hosted request/access logger and analytics dashboard for **your own website or server**. It records the IP, device (browser / OS parsed from the User-Agent), timestamp and an approximate (city-level) location for each request that hits its tracking endpoint — for analytics, rate-limiting and security monitoring on infrastructure you control.

> **Scope & ethics.** This tool is meant to log traffic to sites and servers **you own**, and visitors should be informed that logging happens (a privacy notice / banner). It is **not** for sending disguised links to other people to covertly collect their location or identity. IP geolocation is approximate (city / ISP level) and does **not** identify an individual.

---

## ✨ Features

- `GET /track` endpoint that records each request and returns a 1×1 GIF beacon (or JSON with `?debug=1`).
- Accurate client-IP extraction, handling the `x-forwarded-for` header and `req.ip` behind proxies.
- Browser & OS detection from the `User-Agent` (no external dependency).
- Approximate, city-level IP geolocation with a Google Maps link to the estimated area.
- Simple web dashboard to review, filter and auto-refresh logs — timestamps shown in **Vietnam time (UTC+7)**.
- Pluggable storage: local file (`logs/access.log`) for local/Render, or **Upstash Redis** for serverless (Vercel).

---

## 🧱 Tech stack

Node.js · TypeScript · Express · Upstash Redis (optional) · deployable to Render or Vercel.

---

## 📁 Project structure

```
IP Trap/
├─ src/
│  ├─ index.ts      # entry point (listens locally; exports app for Vercel)
│  ├─ app.ts        # Express app, routes, UA/IP parsing
│  ├─ store.ts      # storage abstraction (Redis or file)
│  ├─ logger.ts     # file backend (logs/access.log, JSON Lines)
│  ├─ geo.ts        # approximate IP geolocation (ipwho.is)
│  └─ dashboard.ts  # dashboard HTML (served inline)
├─ public/          # static copy of the dashboard (local use)
├─ test/
│  └─ api.test.ts   # local tests (node:test + supertest)
├─ logs/            # access.log is written here (file backend)
├─ render.yaml      # Render Blueprint
├─ tsconfig.json
└─ package.json
```

---

## ⚙️ Getting started

```bash
npm install
npm run dev          # dev mode with ts-node-dev
# or
npm run build && npm start
```

- Health check: `http://localhost:3000/health`
- Generate a log entry: `http://localhost:3000/track` (add `?debug=1` to see the parsed JSON)
- Dashboard: `http://localhost:3000/dashboard`

Log entries are written to `logs/access.log` (one JSON object per line) unless Upstash Redis is configured.

> At localhost the IP is `127.0.0.1` / `::1`, so geolocation is skipped — you only see real locations when deployed with real visitors.

### Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `TRUST_PROXY` | Number of reverse proxies in front (so `req.ip` is correct) | `1` |
| `LOG_DIR` | Directory for the log file (file backend) | `./logs` |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL (enables Redis backend) | — |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token | — |

If both Upstash variables are present, the Redis backend is used; otherwise it falls back to the file backend.

---

## 📡 Using the beacon

Embed the tracking endpoint on your own pages so visits are recorded:

```html
<img src="https://your-deployment-url/track" width="1" height="1" alt="" />
```

Each visitor who loads your page creates one entry.

---

## 📊 Dashboard

Open `/dashboard` to see a table of recent entries: time (Vietnam, UTC+7), IP, approximate region + ISP, a Google Maps link to the estimated area, browser, OS, path and User-Agent. You can filter by IP, limit rows and enable auto-refresh.

Geolocation is **approximate** (city / ISP level, often off by kilometres, unreliable for mobile / CGNAT / VPN) and is not a street address or an identity.

---

## 🧪 Testing

```bash
npm install
npm test
```

Uses Node's built-in test runner (`node:test`) with `supertest`, run via `tsx`. Tests cover `/health`, `/track?debug=1` (IP extraction + UA parsing), the GIF beacon, and `/api/logs` (read-back and IP filter). Tests write to a temporary directory, so they don't touch your real `logs/access.log`. Requires Node ≥ 18.19.

---

## ☁️ Deployment

### Render (recommended for the file backend + persistent dashboard)

A `render.yaml` Blueprint is included.
1. Push this repo to GitHub.
2. On Render: **New → Blueprint**, point it at this repo.
3. It configures build/start, the `/health` check, `TRUST_PROXY=1`, and a 1 GB disk mounted at `/var/data` with `LOG_DIR=/var/data/logs` so logs persist across restarts.

### Vercel + Upstash Redis (serverless)

Vercel is serverless and has no persistent writable filesystem, so logs are stored in Upstash Redis.
1. Import the repo at vercel.com (Express preset, zero-config — no `vercel.json` or `api/` folder needed).
2. Add an Upstash Redis database: **Storage → Marketplace → Upstash**, connect it to the project (it auto-adds the env vars). Or add `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` manually.
3. Add `TRUST_PROXY=1`.
4. Deploy. The dashboard then persists logs (keeps the most recent 5,000 entries).

---

## 📋 Roadmap / Checklist

### Phase 1 — Setup & environment
- [x] Initialize a Node.js + TypeScript project (`npm init` & `tsconfig.json`) <!-- id: 1 -->
- [x] Install core libraries (`express`, `@types/node`, `@types/express`, `cors`) <!-- id: 2 -->
- [x] Set up a standard project structure (`src/`, `logs/`) <!-- id: 3 -->

### Phase 2 — Core logic
- [x] Request-capture endpoint (`GET /track`) <!-- id: 4 -->
- [x] Real client-IP extraction (`x-forwarded-for` + `req.ip`) <!-- id: 5 -->
- [x] Browser / OS detection from the `User-Agent` <!-- id: 6 -->

### Phase 3 — Storage & visualization
- [x] Write logs to `access.log` (or a store such as Redis) <!-- id: 7 -->
- [x] Dashboard / API to review logged entries <!-- id: 8 -->

### Phase 4 — Testing & deployment
- [x] Local test suite <!-- id: 9 -->
- [x] Deploy to free cloud hosting (Render / Vercel) <!-- id: 10 -->

---

## 📝 License

MIT
