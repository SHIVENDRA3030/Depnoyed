FROM oven/bun:1 AS builder
WORKDIR /app

# Copy package management files
COPY package.json bun.lock ./
COPY prisma ./prisma/

# Install dependencies and generate prisma
RUN bun install --frozen-lockfile
RUN bunx prisma generate

# Copy source code
COPY . .

# Build-time env vars (next-auth needs NEXTAUTH_URL/SECRET even at build time)
ARG NEXTAUTH_URL=http://localhost:3000
ARG NEXTAUTH_SECRET=build-time-placeholder
ARG NODE_ENV=production
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV NODE_ENV=$NODE_ENV

# Build Next.js
# Note: Next.js standalone output is configured in next.config.ts / package.json
RUN bun run build

# Production image
FROM oven/bun:1-slim AS runner
WORKDIR /app

ENV NODE_ENV production
ENV PORT 3000

# Copy the standalone build from the builder stage
# (The package.json build script already copies static and public to standalone)
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# Start the Next.js standalone server
CMD ["bun", "server.js"]
