# Deploy BidMarket (no GitHub required)

Deploy directly from your machine using **Vercel CLI** (web) and **Docker** (API on Render).

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`
- [Docker Hub](https://hub.docker.com/) account (free)
- [Render](https://render.com/) account (free tier)
- [Vercel](https://vercel.com/) account (free tier)

---

## 1. API → Render (Docker)

### Build and push the image

Replace `YOUR_DOCKERHUB_USER` with your Docker Hub username (e.g. `tamehchana`):

```bash
cd /path/to/bidmarket

docker build -t tamehchana/bidmarket-api:latest .
docker login
docker push tamehchana/bidmarket-api:latest
```

### Create the Render service

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Web Service**
2. Choose **Deploy an existing image from a registry**
3. Image URL: `docker.io/tamehchana/bidmarket-api:latest`
4. **Name:** `bidmarket-api`
5. **Region:** closest to Cameroon (e.g. Frankfurt)
6. **Instance type:** Free or Starter

### Environment variables (Render dashboard)

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `4000` |
| `FRONTEND_URL` | `https://your-app.vercel.app` (set after Vercel deploy) |
| `FAPSHI_ENV` | `sandbox` or `production` |
| `FAPSHI_API_USER` | from Fapshi dashboard |
| `FAPSHI_API_KEY` | from Fapshi dashboard |
| `FAPSHI_WEBHOOK_SECRET` | from Fapshi dashboard |
| `UPLOAD_DIR` | `/data/uploads` (when using a Render disk — see below) |

7. **Create Web Service** — note your API URL, e.g. `https://bidmarket-api.onrender.com`

### Image uploads on Render

Sellers can upload photos from their phone or computer. Files are stored on the **API** (not Vercel).

**For production on Render**, attach a **Persistent Disk** so images survive redeploys:

1. Render service → **Disks** → **Add disk**
2. **Mount path:** `/data/uploads`
3. **Size:** 1 GB is enough to start
4. Add env var: `UPLOAD_DIR` = `/data/uploads`
5. Redeploy the service

Without a disk, uploads work but are **wiped** when the container restarts or redeploys.

Locally, files save to `apps/api/uploads/` (gitignored).

Uploaded images are served at `https://your-api.onrender.com/uploads/...` and proxied through Vercel as `/uploads/...`.

### Fapshi webhook

In the Fapshi dashboard, set webhook URL to:

```
https://bidmarket-api.onrender.com/webhooks/fapshi
```

### Re-deploy after code changes

```bash
docker build -t tamehchana/bidmarket-api:latest .
docker push tamehchana/bidmarket-api:latest
```

On Render, open the service → **Manual Deploy** → **Deploy latest image**.

---

## 2. Web → Vercel CLI

```bash
cd apps/web
vercel login
vercel        # preview — follow prompts, root directory = apps/web
vercel --prod # production
```

When prompted:

- **Set up and deploy?** Yes
- **Which scope?** your account
- **Link to existing project?** No (first time)
- **Project name:** `bidmarket` (or your choice)
- **Directory:** `./` (you are already in `apps/web`)

### Environment variables (Vercel dashboard or CLI)

```bash
vercel env add API_URL production
# Enter: https://bidmarket-api.onrender.com

vercel env add NEXT_PUBLIC_APP_URL production
# Enter: https://your-project.vercel.app
```

Then redeploy:

```bash
vercel --prod
```

### Update Render after Vercel is live

Set `FRONTEND_URL` on Render to your Vercel URL (for CORS), then redeploy the API service.

---

## 3. Verify

| Check | URL |
|-------|-----|
| API health | `https://bidmarket-api.onrender.com/health` |
| Web app | `https://your-project.vercel.app` |
| Browse auctions | should load live data from Render |

---

## Quick commands (root package.json)

```bash
npm run docker:build    # build image locally
npm run docker:run      # run API on localhost:4000 (needs apps/api/.env)
```

---

## Notes

- **Free Render** services spin down after inactivity — first request may take ~30s.
- Data is **in-memory** until PostgreSQL is added — restarts wipe auctions/users.
- Without Fapshi credentials, payments run in **mock mode** (dev simulate button).
