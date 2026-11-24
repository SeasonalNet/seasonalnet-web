ARG APP=www

FROM node:26-bookworm-slim@sha256:0042e17d232a87a2cd485be1da7900fca4d10a4ad11b29e9285da1d2e54798c9 AS dependencies

WORKDIR /repo

RUN npm install --global pnpm@12.21.0 \
    && test "$(pnpm --version)" = "12.21.0"
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm fetch --frozen-lockfile

FROM dependencies AS build
COPY . .
RUN pnpm install --offline --frozen-lockfile
ARG APP
ARG APP_VERSION=0.0.0+unknown
ARG APP_REVISION=unknown
ENV APP_VERSION=${APP_VERSION} APP_REVISION=${APP_REVISION}

RUN pnpm --filter @seasonalnet/${APP} build

FROM node:26-bookworm-slim@sha256:0042e17d232a87a2cd485be1da7900fca4d10a4ad11b29e9285da1d2e54798c9 AS runtime-files

ARG APP
ENV NODE_ENV=production \
    APP=${APP} \
    HOSTNAME=0.0.0.0 \
    PORT=3000

RUN groupadd --system --gid 10001 seasonalweb \
    && useradd --system --uid 10001 --gid 10001 --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin seasonalweb

WORKDIR /app
COPY --from=build --chown=0:0 /repo/apps/${APP}/.next/standalone ./
COPY --from=build --chown=0:0 /repo/apps/${APP}/.next/static ./apps/${APP}/.next/static
COPY --from=build --chown=0:0 /repo/apps/${APP}/public ./apps/${APP}/public

RUN install -d -o 10001 -g 10001 /app/apps/${APP}/.next/cache

RUN printf 'import("./apps/%s/server.js");\n' "${APP}" > /app/launch.mjs

ARG APP_VERSION=0.0.0+unknown
ARG APP_REVISION=unknown
ENV APP_VERSION=${APP_VERSION} APP_REVISION=${APP_REVISION}

RUN node -e "const fs=require('node:fs'); for(const file of ['package.json', 'apps/'+process.env.APP+'/package.json']) { if(fs.existsSync(file)) { const p=JSON.parse(fs.readFileSync(file,'utf8')); p.version=process.env.APP_VERSION; fs.writeFileSync(file,JSON.stringify(p,null,2)+'\\n'); } }"

RUN chmod -R go-w /app

FROM gcr.io/distroless/nodejs26-debian13:nonroot@sha256:ffa8a7545403036c94ec76674b5dbac2d425af2d679147cdf3e30180071487b7 AS runtime

ARG APP_VERSION=0.0.0+unknown
ARG APP_REVISION=unknown
ENV APP_VERSION=${APP_VERSION} APP_REVISION=${APP_REVISION}
LABEL org.opencontainers.image.version="${APP_VERSION}" org.opencontainers.image.revision="${APP_REVISION}"

USER 0
ENV PATH=/nodejs/bin
ARG APP
ENV NODE_ENV=production APP=${APP} HOSTNAME=0.0.0.0 PORT=3000
WORKDIR /app
COPY --from=runtime-files --chown=0:0 /app /app
COPY --from=runtime-files --chown=10001:10001 /app/apps/${APP}/.next/cache /app/apps/${APP}/.next/cache
RUN ["/nodejs/bin/node", "-e", "const fs=require('node:fs'); fs.chownSync('/app',0,0); fs.chmodSync('/app',0o755);"]
USER 10001:10001
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["/nodejs/bin/node", "-e", "fetch('http://127.0.0.1:3000/', { redirect: 'manual', signal: AbortSignal.timeout(4000) }).then(r => process.exit(r.status < 400 ? 0 : 1)).catch(() => process.exit(1))"]
ENTRYPOINT []
CMD ["/nodejs/bin/node", "/app/launch.mjs"]
RUN ["/nodejs/bin/node", "-e", "const fs=require('node:fs'); if(process.getuid()===0 || fs.statSync('/app/package.json').uid!==0) process.exit(1); for(const p of ['/app/package.json','/app']) { let writable=true; try { fs.accessSync(p,fs.constants.W_OK); } catch { writable=false; } if(writable) process.exit(1); }"]
