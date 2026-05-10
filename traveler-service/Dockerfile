# traveler-service Dockerfile
# Build context: pgt/ (monorepo root)

FROM node:20-alpine
WORKDIR /workspace

COPY tsconfig.base.json ./tsconfig.base.json

COPY packages/shared/package.json ./packages/shared/package.json
COPY packages/shared/dist         ./packages/shared/dist

COPY traveler-service/package.json          ./traveler-service/package.json
COPY traveler-service/tsconfig.json         ./traveler-service/tsconfig.json
COPY traveler-service/tsconfig.docker.json  ./traveler-service/tsconfig.docker.json
WORKDIR /workspace/traveler-service
RUN npm config set fetch-timeout 600000 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm install --no-package-lock --legacy-peer-deps
RUN ln -s /workspace/traveler-service/node_modules /workspace/packages/shared/node_modules

WORKDIR /workspace
COPY traveler-service/src ./traveler-service/src
WORKDIR /workspace/traveler-service
RUN node_modules/.bin/tsc --project tsconfig.docker.json

ENV NODE_ENV=production
EXPOSE 3003
COPY traveler-service/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
ENTRYPOINT ["/docker-entrypoint.sh"]
