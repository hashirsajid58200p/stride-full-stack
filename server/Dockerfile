# ====================================================
# Stage 1: Build Dependencies
# ====================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies for native compilation if required
RUN apk add --no-cache python3 make g++

# Copy package manifests
COPY package*.json ./

# Install only production dependencies cleanly
RUN npm ci --omit=dev

# ====================================================
# Stage 2: Production Runtime
# ====================================================
FROM node:22-alpine AS runner

# Install dumb-init for proper signal handling and wget for healthchecks
RUN apk add --no-cache dumb-init wget

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Copy node_modules from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application source files with non-root ownership
COPY --chown=node:node . .

# Run as unprivileged non-root user
USER node

EXPOSE 5000

# Health check instruction
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:5000/healthz || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
