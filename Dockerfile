# Multi-stage build — builds the React client then the Express server, serves both from one container.
# Multi-arch compatible — builds for linux/amd64 and linux/arm64.
#
# docker buildx build \
#   --platform linux/amd64,linux/arm64 \
#   -t lmwcode/tracker:v1.0.0 \
#   --no-cache --push .

# ── Stage 1: build React client ───────────────────────────────────────────────
FROM node:22-alpine AS client-build

WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install all deps including devDependencies — vite and tsc live in devDependencies
RUN npm ci --workspace=client

COPY client/ ./client/
RUN npm run build --workspace=client

# ── Stage 2: build Express server ─────────────────────────────────────────────
FROM node:22-alpine AS server-build

WORKDIR /app

COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Install all deps including devDependencies — tsc lives in devDependencies
RUN npm ci --workspace=server

COPY server/ ./server/
RUN npm run build --workspace=server

# ── Stage 3: production image ─────────────────────────────────────────────────
FROM node:22-alpine AS production

# Upgrade all packages to pick up security patches
RUN apk upgrade --no-cache

WORKDIR /app

# Production server deps only.
# --ignore-scripts is intentionally omitted here so that better-sqlite3's
# install script can locate its pre-built binding. We copy node_modules from
# the build stage so the native .node file compiled there is already present.
COPY --from=server-build /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY client/package.json ./client/
COPY server/package.json ./server/

# Copy built artifacts
COPY --from=server-build /app/server/dist ./server/dist
COPY --from=client-build /app/client/dist ./client/dist

# SQLite data directory (mount a volume here on the VPS)
RUN mkdir -p /data

ENV NODE_ENV=production
ENV DB_PATH=/data
ENV PORT=3001

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:3001/api/health || exit 1

CMD ["node", "server/dist/index.js"]
