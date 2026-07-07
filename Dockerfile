# BidMarket API — deploy to Render via Docker (no GitHub required)
FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/

RUN npm ci --workspace=packages/shared --workspace=apps/api --include-workspace-root

COPY packages/shared packages/shared
COPY apps/api apps/api

RUN npm run build --workspace=packages/shared \
  && npm run build --workspace=apps/api

FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/

RUN npm ci --workspace=packages/shared --workspace=apps/api --include-workspace-root --omit=dev

COPY --from=builder /app/packages/shared/dist packages/shared/dist
COPY --from=builder /app/apps/api/dist apps/api/dist

WORKDIR /app/apps/api

EXPOSE 4000

CMD ["node", "dist/index.js"]
