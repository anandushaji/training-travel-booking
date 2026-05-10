# api-gateway Dockerfile
# Build context: pgt/ (monorepo root)
# No @travel/shared dependency. No TypeORM migrations.

FROM node:20-alpine
WORKDIR /workspace

COPY tsconfig.base.json ./tsconfig.base.json

COPY api-gateway/package.json          ./api-gateway/package.json
COPY api-gateway/tsconfig.json         ./api-gateway/tsconfig.json
COPY api-gateway/tsconfig.docker.json  ./api-gateway/tsconfig.docker.json
WORKDIR /workspace/api-gateway
RUN npm config set fetch-timeout 600000 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install --no-package-lock --legacy-peer-deps

WORKDIR /workspace
COPY api-gateway/src ./api-gateway/src
WORKDIR /workspace/api-gateway
RUN node_modules/.bin/tsc --project tsconfig.docker.json

ENV NODE_ENV=production
EXPOSE 4000
COPY api-gateway/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
