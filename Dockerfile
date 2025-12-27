# Dockerfile for Digital Canvas
# TypeScript 기반 프로덕션 빌드

# Stage 1: Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Copy source code and prisma schema
COPY src ./src
COPY prisma ./prisma

# Install all dependencies (including dev dependencies for build)
RUN npm install

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# Stage 2: Production stage
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy Prisma schema and generated client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Copy compiled JavaScript from builder
COPY --from=builder /app/dist ./dist

# Copy public files
COPY public ./public

# Copy entrypoint script
COPY entrypoint.sh ./

# Create necessary directories and set permissions
RUN mkdir -p public/uploads prisma && \
    chmod +x entrypoint.sh && \
    chown -R node:node /app

# Use non-root user
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:7400/api/viewer/images', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Expose port
EXPOSE 7400

# Start application with dumb-init and entrypoint script
ENTRYPOINT ["dumb-init", "--"]
CMD ["sh", "entrypoint.sh"]

