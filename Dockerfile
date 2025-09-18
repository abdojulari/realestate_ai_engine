# Build stage
FROM node:20-alpine as builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Clean install with proper architecture support
RUN npm ci --force

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache dumb-init

# Copy built application
COPY --from=builder /app/.output ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package*.json ./

# Install production dependencies only
RUN npm ci --only=production --force

# Generate Prisma client for production
RUN npx prisma generate

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

# Start application with dumb-init
CMD ["dumb-init", "node", "server/index.mjs"]
