ARG APP=www

FROM node:24-bookworm-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c AS build

ARG APP
ENV COREPACK_HOME=/tmp/corepack
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@12.15.0 --activate
COPY . .
RUN pnpm install --frozen-lockfile
ARG APP_VERSION=0.0.0+unknown
ARG APP_REVISION=unknown
ENV APP_VERSION=${APP_VERSION} APP_REVISION=${APP_REVISION}

RUN pnpm --filter @seasonalnet/${APP} build

FROM node:24-bookworm-slim@sha256:c86ecead9e55a5210ac1727de38a4ca840bf03dcaf34dc9749addbf383b1920c AS runtime-files

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

FROM gcr.io/distroless/nodejs24-debian13:nonroot@sha256:a6c34457f6da4295807e051411c7783739c65b997a324fed14e4fa292615ae91 AS runtime

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
