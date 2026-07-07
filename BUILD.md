# Local build & verify (before Render / Vercel)

Run these steps on your machine to confirm everything works before deploying.

## 1. Install dependencies

```bash
cd /Users/tamehchana/projects/bidmarket
npm install
```

## 2. Environment files

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Edit if needed — defaults work for local production testing.

## 3. Production build (all packages)

```bash
npm run build
```

This builds, in order:

| Package | Output |
|---------|--------|
| `packages/shared` | `packages/shared/dist/` |
| `apps/api` | `apps/api/dist/` |
| `apps/web` | `apps/web/.next/` |

**Expected:** exit code 0, no TypeScript or Next.js errors.

## 4. Run API (production mode)

**Terminal 1:**

```bash
npm run start:api
```

Test:

```bash
curl http://localhost:4000/health
# → {"status":"ok"}

curl http://localhost:4000/auctions
# → JSON array of auctions
```

## 5. Run web (production mode)

**Terminal 2:**

```bash
npm run start:web
```

Open [http://localhost:3000](http://localhost:3000) — browse, sign in, admin, seller flows.

## 6. Docker image (optional — same as Render will use)

```bash
npm run docker:build
```

Test container locally:

```bash
npm run docker:run
# In another terminal:
curl http://localhost:4000/health
```

## 7. One-shot verify (recommended)

```bash
npm run verify:local
```

Builds everything, starts production API + web, runs health checks, and builds the Docker image. No manual copy-paste needed.

## 8. Push Docker image (after verify passes)

```bash
npm run docker:push
```

---

## One-shot verify script (manual steps)

## Checklist before deploy

- [ ] `npm run build` succeeds
- [ ] `npm run start:api` + `/health` returns ok
- [ ] `npm run start:web` + homepage loads auctions
- [ ] Sign in works (seeded bidder account with `SEED_ACCOUNT_PASSWORD` set)
- [ ] Admin works (seeded admin account with `SEED_ACCOUNT_PASSWORD` set)
- [ ] `npm run docker:build` succeeds (for Render)

When all pass → follow **DEPLOY.md** for Render + Vercel.

## Dev mode (day-to-day)

```bash
npm run dev:api   # terminal 1
npm run dev:web   # terminal 2
```
