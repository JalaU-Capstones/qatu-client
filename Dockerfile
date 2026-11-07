# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=26
ARG NGINX_VERSION=1.29

# ── Stage 1: deps ───────────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS deps
WORKDIR /app
RUN chown node:node /app
ENV HUSKY=0
RUN npm install -g corepack && corepack enable && corepack prepare pnpm@11 --activate
COPY --chown=node:node package.json pnpm-lock.yaml pnpm-workspace.yaml ./
USER node
RUN pnpm install --frozen-lockfile

# ── Stage 2: build ──────────────────────────────────────────────────────────
FROM deps AS build
COPY --chown=node:node . .
ARG VITE_API_BASE_URL=/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN pnpm build

# ── Stage 3: development ────────────────────────────────────────────────────
FROM build AS development
USER node
ENV HOST=0.0.0.0
EXPOSE 5173
CMD ["pnpm", "dev", "--host", "0.0.0.0"]

# ── Stage 4: runtime ────────────────────────────────────────────────────────
FROM nginx:${NGINX_VERSION}-alpine AS runtime
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
RUN mkdir -p /var/cache/nginx/{client_temp,proxy_temp,fastcgi_temp,uwsgi_temp,scgi_temp} \
    && chown -R nginx:nginx /var/cache/nginx /var/run /var/log/nginx \
    && touch /var/run/nginx.pid \
    && chown nginx:nginx /var/run/nginx.pid
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
CMD ["nginx", "-g", "daemon off;"]
