# ==========================================
# Stage 1: Install Dependencies
# ==========================================
FROM node:22-bookworm-slim AS deps
WORKDIR /app

COPY package*.json ./
RUN npm install

# ==========================================
# Stage 2: Build Next.js Application
# ==========================================
FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL:-http://localhost:3000}
ENV NODE_ENV=production

RUN npm run build

# ==========================================
# Stage 3: Production Runner
# ==========================================
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN groupadd -g 1001 nodejs && useradd -u 1001 -g nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
