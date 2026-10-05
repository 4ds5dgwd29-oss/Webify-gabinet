# Buduje kompletny projekt z archiwum znajdującego się w repozytorium.
FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates unzip && rm -rf /var/lib/apt/lists/*
COPY Webify-Gabinet.zip /tmp/webify-source.zip
RUN echo "98f95a0e5f20b8ae3a107501ab7ac1f763ce2db29c2319cfc93cd05b6e181e85  /tmp/webify-source.zip" | sha256sum -c - \
    && unzip -q /tmp/webify-source.zip -d /tmp/webify-source \
    && cp -a /tmp/webify-source/webify-gabinet/. /app/ \
    && rm -rf /tmp/webify-source /tmp/webify-source.zip
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm ci --no-audit --no-fund
RUN npm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
# Narzędzia migracji/seed są częścią obrazu, ale nie uruchamiają się w procesie WWW.
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/assets ./assets
COPY --from=builder --chown=node:node /app/scripts ./scripts
RUN mkdir -p /app/storage && chown node:node /app/storage
USER node
EXPOSE 3000
CMD ["node", "server.js"]
