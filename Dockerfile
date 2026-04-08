# Build stage
FROM node:20-alpine as builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Enable pnpm (project package manager)
RUN corepack enable

# Nuxt client + Vite SSR builds are memory-heavy (3k+ modules). 4GB often OOMs in Docker.
# Override at build time: docker compose build --build-arg NODE_MEMORY=12288 app
ARG NODE_MEMORY=8192
ENV NODE_OPTIONS=--max-old-space-size=${NODE_MEMORY}

# Copy package files
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/

# Clean install with proper architecture support
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN pnpm exec prisma generate

# Build application (NODE_OPTIONS must apply to this process)
RUN NODE_OPTIONS="--max-old-space-size=${NODE_MEMORY}" pnpm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache dumb-init

# Enable pnpm in runtime image too
RUN corepack enable

# Copy built application
COPY --from=builder /app/.output ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
# Source shim (Nitro usually inlines it; kept for tooling / future requires)
COPY --from=builder /app/server/shims ./server/shims

# Install dependencies (includes Prisma CLI for generate step)
RUN pnpm install --frozen-lockfile

# Generate Prisma client for production
RUN pnpm exec prisma generate

# Pre-create writable directories for the non-root user
RUN mkdir -p server/ml/models/forecast
RUN mkdir -p public/uploads/logos public/uploads/avatars public/uploads/blog public/uploads/documents

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nuxt -u 1001

# Change ownership
RUN chown -R nuxt:nodejs /app
USER nuxt

# Set environment variables
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start application: run migrations then start server
CMD ["dumb-init", "sh", "-c", "npx prisma migrate deploy && node server/index.mjs"]
