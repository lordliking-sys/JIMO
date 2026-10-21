# This image is exclusively the development API: it retains the Neon branch guard.
FROM node:24.19.0-bookworm-slim AS build
WORKDIR /workspace
# Optional enterprise CA is a build secret, never copied into the resulting image.
RUN --mount=type=secret,id=network_ca \
    if [ -f /run/secrets/network_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/network_ca; fi; \
    npm install --global pnpm@11.19.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc turbo.json tsconfig.base.json ./
COPY apps/api ./apps/api
COPY packages ./packages
# Keep the workspace manifest complete, without copying mobile code or artwork.
COPY apps/mobile/package.json ./apps/mobile/package.json
RUN --mount=type=secret,id=network_ca \
    if [ -f /run/secrets/network_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/network_ca; fi; \
    pnpm --filter jimo --filter @jimo/api... install --frozen-lockfile
RUN node node_modules/turbo/bin/turbo run build --filter=@jimo/api
RUN --mount=type=secret,id=network_ca \
    if [ -f /run/secrets/network_ca ]; then export NODE_EXTRA_CA_CERTS=/run/secrets/network_ca; fi; \
    pnpm --filter @jimo/api deploy --legacy --prod /output

FROM node:24.19.0-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=development \
    PORT=10000 \
    ALLOW_DEV_AUTH=false \
    AI_IMPORT_ENABLED=false \
    NEON_DEVELOPMENT_BRANCH_ID=br-purple-math-b1fsq2wb
COPY --from=build --chown=node:node /output ./
USER node
EXPOSE 10000
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/ready').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/server.js"]
