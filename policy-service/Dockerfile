# policy-service Dockerfile
# Build context: pgt/ (monorepo root)

FROM node:20-alpine
WORKDIR /workspace

COPY tsconfig.base.json ./tsconfig.base.json

COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/shared/dist         ./packages/shared/dist

COPY policy-service/package.json          ./policy-service/package.json
COPY policy-service/tsconfig.json         ./policy-service/tsconfig.json
COPY policy-service/tsconfig.docker.json  ./policy-service/tsconfig.docker.json
WORKDIR /workspace/policy-service
RUN npm config set fetch-timeout 600000 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install --no-package-lock --legacy-peer-deps
RUN ln -s /workspace/policy-service/node_modules /workspace/packages/shared/node_modules

WORKDIR /workspace
COPY policy-service/src ./policy-service/src
WORKDIR /workspace/policy-service
RUN node_modules/.bin/tsc --project tsconfig.docker.json

ENV NODE_ENV=production
EXPOSE 3002
COPY policy-service/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
