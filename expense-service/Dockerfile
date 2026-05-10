# expense-service Dockerfile
# Build context: pgt/ (monorepo root)

FROM node:20-alpine
WORKDIR /workspace

COPY tsconfig.base.json ./tsconfig.base.json

COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/shared/dist         ./packages/shared/dist

COPY expense-service/package.json          ./expense-service/package.json
COPY expense-service/tsconfig.json         ./expense-service/tsconfig.json
COPY expense-service/tsconfig.docker.json  ./expense-service/tsconfig.docker.json
WORKDIR /workspace/expense-service
RUN npm config set fetch-timeout 600000 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install --no-package-lock --legacy-peer-deps
RUN ln -s /workspace/expense-service/node_modules /workspace/packages/shared/node_modules

WORKDIR /workspace
COPY expense-service/src ./expense-service/src
WORKDIR /workspace/expense-service
RUN node_modules/.bin/tsc --project tsconfig.docker.json

ENV NODE_ENV=production
EXPOSE 3006
COPY expense-service/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
