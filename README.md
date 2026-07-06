# BidMarket

MVP auction marketplace — browse as a visitor, register to bid, highest bidder wins.

## Stack

- **Web:** Next.js 15 + React + Tailwind (`apps/web`) → deploy on **Vercel**
- **API:** Fastify (`apps/api`) → deploy on **Render**
- **Payments:** [Fapshi](https://fapshi.com) — MTN MoMo & Orange Money (Cameroon)
- **Shared types:** `packages/shared`

## Quick start

```bash
# Install dependencies
npm install

# Terminal 1 — API (port 4000)
npm run dev:api

# Terminal 2 — Web (port 3000)
npm run dev:web
```

Open [http://localhost:3000](http://localhost:3000)

### Demo accounts

| Role | Email | Password |
|------|-------|----------|
| Bidder | `demo@bidmarket.com` | `password123` |
| Seller | `seller@bidmarket.com` | `password123` |
| Admin | `admin@bidmarket.com` | `password123` |

## Project structure

```
bidmarket/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # Fastify REST API
└── packages/
    └── shared/       # Shared TypeScript types
```

## Environment variables

### Web (`apps/web/.env.local`)

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
API_URL=http://localhost:4000
```

### API (`apps/api/.env`)

```
PORT=4000
FRONTEND_URL=http://localhost:3000

# Fapshi payments (Cameroon)
FAPSHI_ENV=sandbox
FAPSHI_API_USER=your-api-user
FAPSHI_API_KEY=your-api-key
FAPSHI_WEBHOOK_SECRET=your-webhook-secret
```

Without Fapshi credentials, the API runs in **mock payment mode** for local development.

## Payments (Fapshi)

BidMarket uses Fapshi for winner checkout in Cameroon:

- **MTN Mobile Money** and **Orange Money**
- Hosted payment page via `initiate-pay`
- Webhook at `POST /webhooks/fapshi` for payment confirmation
- All amounts in **XAF** (Central African CFA franc)

### Fapshi setup

1. Create a service on the [Fapshi dashboard](https://fapshi.com) and get `apiuser` + `apikey`
2. Use sandbox (`https://sandbox.fapshi.com`) for development
3. Set a webhook secret in the dashboard and configure webhook URL: `https://your-api.onrender.com/webhooks/fapshi`
4. Whitelist your server IP for transaction creation (initiate-pay)

### Winner checkout flow

1. Auction ends → winning bidder sees **Pay with Mobile Money**
2. API calls Fapshi `initiate-pay` and redirects to hosted checkout
3. Customer pays on phone → Fapshi sends webhook → order marked paid
4. User returns to `/payments/callback`

## Deployment

### Vercel (web)

1. Import the repo and set root to `apps/web` (or monorepo with web as app).
2. Set `API_URL` to your Render API URL (e.g. `https://bidmarket-api.onrender.com`).
3. The Next.js rewrite proxies `/api/*` → Render in production.

### Render (API)

Use `render.yaml` or create a Web Service:

- **Build:** `npm install && npm run build --workspace=packages/shared && npm run build --workspace=apps/api`
- **Start:** `npm run start --workspace=apps/api`
- **Env:** `FRONTEND_URL`, `FAPSHI_*` variables

## MVP features

- Visitor browse + product detail (read-only auction view)
- Register/login modal with return URL (visitor → bidder)
- Place bids with validation
- Live polling on product pages
- My Bids dashboard (authenticated)
- Seller dashboard + create listings (become a seller flow)
- Winner checkout via Fapshi (MTN MoMo / Orange Money, XAF)
- Admin dashboard (users, auctions, payments moderation)

## Next steps

- PostgreSQL + Prisma for persistent data
- WebSockets for real-time bid updates
- Seller payouts via Fapshi disbursement API
