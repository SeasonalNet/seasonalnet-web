ARG APP=www

FROM node:22-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5 AS build

ARG APP
ENV COREPACK_HOME=/tmp/corepack
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@11.22.0 --activate
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @seasonalnet/${APP} build

FROM node:22-bookworm-slim@sha256:83f487e0a63425e5b4d146fb5e5be574bcbe1b7b843d3ebafdd95eaf7767a7e5

ARG APP
ENV NODE_ENV=production \
    APP=${APP} \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN groupadd --system --gid 10001 seasonalweb \
    && useradd --system --uid 10001 --gid 10001 --create-home --home-dir /home/seasonalweb seasonalweb

WORKDIR /app
COPY --from=build --chown=10001:10001 /repo/apps/${APP}/.next/standalone ./
COPY --from=build --chown=10001:10001 /repo/apps/${APP}/.next/static ./.next/static
COPY --from=build --chown=10001:10001 /repo/apps/${APP}/public ./public

USER 10001:10001
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["sh", "-c", "exec node /app/apps/${APP}/server.js"]
