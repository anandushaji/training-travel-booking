# payment-service Dockerfile
# Build context: pgt/ (monorepo root)

FROM node:20-alpine
WORKDIR /workspace

COPY tsconfig.base.json ./tsconfig.base.json

COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/shared/dist         ./packages/shared/dist

COPY payment-service/package.json          ./payment-service/package.json
COPY payment-service/tsconfig.json         ./payment-service/tsconfig.json
COPY payment-service/tsconfig.docker.json  ./payment-service/tsconfig.docker.json
WORKDIR /workspace/payment-service
RUN npm config set fetch-timeout 600000 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install --no-package-lock --legacy-peer-deps
RUN ln -s /workspace/payment-service/node_modules /workspace/packages/shared/node_modules

WORKDIR /workspace
COPY payment-service/src ./payment-service/src
WORKDIR /workspace/payment-service
RUN node_modules/.bin/tsc --project tsconfig.docker.json

ENV NODE_ENV=production
EXPOSE 3004
COPY payment-service/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
