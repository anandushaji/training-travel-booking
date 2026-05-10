# booking-service Dockerfile
# Build context: pgt/ (monorepo root)

FROM node:20-alpine
WORKDIR /workspace

# ── 0. Root tsconfig ──────────────────────────────────────────────────────────
COPY tsconfig.base.json ./tsconfig.base.json

# ── 1. Shared package (dist only — no npm install needed here) ────────────────
# Service's npm install resolves uuid transitively via file:../packages/shared
COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/shared/dist         ./packages/shared/dist

# ── 2. Service dependencies ───────────────────────────────────────────────────
COPY booking-service/package.json          ./booking-service/package.json
COPY booking-service/tsconfig.json         ./booking-service/tsconfig.json
COPY booking-service/tsconfig.docker.json  ./booking-service/tsconfig.docker.json
WORKDIR /workspace/booking-service
RUN npm config set fetch-timeout 600000 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install --no-package-lock --legacy-peer-deps
RUN ln -s /workspace/booking-service/node_modules /workspace/packages/shared/node_modules

# ── 3. Build TypeScript (using tsconfig.docker.json — no path aliases) ────────
WORKDIR /workspace
COPY booking-service/src ./booking-service/src
WORKDIR /workspace/booking-service
RUN node_modules/.bin/tsc --project tsconfig.docker.json

# ── Runtime ───────────────────────────────────────────────────────────────────
ENV NODE_ENV=production
EXPOSE 3001
COPY booking-service/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
