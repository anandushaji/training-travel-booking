# inventory-service Dockerfile
# Build context: pgt/ (monorepo root)

FROM node:20-alpine
WORKDIR /workspace

COPY tsconfig.base.json ./tsconfig.base.json

COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/shared/dist         ./packages/shared/dist

COPY inventory-service/package.json          ./inventory-service/package.json
COPY inventory-service/tsconfig.json         ./inventory-service/tsconfig.json
COPY inventory-service/tsconfig.docker.json  ./inventory-service/tsconfig.docker.json
WORKDIR /workspace/inventory-service
RUN npm config set fetch-timeout 600000 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install --no-package-lock --legacy-peer-deps
RUN ln -s /workspace/inventory-service/node_modules /workspace/packages/shared/node_modules

WORKDIR /workspace
COPY inventory-service/src ./inventory-service/src
WORKDIR /workspace/inventory-service
RUN node_modules/.bin/tsc --project tsconfig.docker.json

ENV NODE_ENV=production
EXPOSE 3005
COPY inventory-service/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
