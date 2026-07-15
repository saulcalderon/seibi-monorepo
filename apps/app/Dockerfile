# syntax=docker/dockerfile:1
# Multi-stage build: install → compile the Vite SPA → ship a slim nginx image.
# Build from the repo root so pnpm can resolve the workspace + lockfile:
#   docker build -f apps/app/Dockerfile -t seibi-app .

# -----------------------------------------------------------------------------
# Stage 1: base — shared Node + pnpm for every later stage
# -----------------------------------------------------------------------------
FROM node:24-alpine AS base
# Corepack pins the same pnpm version the repo uses locally (see packageManager / lockfile).
RUN corepack enable && corepack prepare pnpm@11.3.0 --activate
WORKDIR /app

# -----------------------------------------------------------------------------
# Stage 2: deps — install dependencies only (cached unless lockfiles change)
# -----------------------------------------------------------------------------
FROM base AS deps
# Avoid pnpm interactive prompts in non-TTY Docker builds.
ENV CI=true
# Workspace manifests first so the layer stays cached across source-only changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/app/package.json ./apps/app/
RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# Stage 3: builder — compile the Vite app into static assets under dist/
# -----------------------------------------------------------------------------
FROM base AS builder
ENV CI=true
# VITE_* values are inlined at build time, so they must be present here.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
# Bring the installed node_modules (root + workspace) from deps.
COPY --from=deps /app/ ./
# .dockerignore keeps node_modules out of the context, so this adds only source.
COPY . .
RUN pnpm --filter @seibi/app build

# -----------------------------------------------------------------------------
# Stage 4: runner — production image serving the static build via nginx
# -----------------------------------------------------------------------------
FROM nginx:alpine AS runner
# SPA fallback + sensible cache headers for the app shell / service worker.
COPY apps/app/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
