# Use a lightweight Node.js base image
FROM node:22-alpine AS base

# Stage 1: Install production dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# Stage 2: Build the Next.js app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma only validates the URL and generates code during this stage; it does
# not connect to this placeholder database.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/fit_spark"
ENV FITSPARK_RUNTIME_CONFIG_JSON="{\"CLERK_SECRET_KEY\":\"mock\",\"CLERK_ENCRYPTION_KEY\":\"mock\",\"NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY\":\"pk_test_bWFnbmV0aWMtbGl6YXJkLTk3LmNsZXJrLmFjY291bnRzLmRldiQ\",\"DATABASE_URL\":\"postgresql://build:build@localhost:5432/fit_spark\",\"GEMINI_API_KEY\":\"mock\",\"GEMINI_MODEL\":\"mock\",\"STRIPE_SECRET_KEY\":\"mock\",\"STRIPE_WEBHOOK_SECRET\":\"mock\",\"NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY\":\"pk_test_51RjFXo2emdHTaRR3MS1Rog3m0TFGjWiMxiWNSzLUnVWpr0SjR7Zf9SqMNwS4bWupi9tox2r9b4avm6cuIHA7uY2u0096I17pAC\",\"STRIPE_PRICE_WEEKLY\":\"mock\",\"STRIPE_PRICE_MONTHLY\":\"mock\",\"STRIPE_PRICE_YEARLY\":\"mock\",\"NEXT_PUBLIC_BASE_URL\":\"http://localhost:3000\",\"PINECONE_API_KEY\":\"mock\",\"PINECONE_INDEX_NAME\":\"mock\",\"PINECONE_INDEX_HOST\":\"https://mock.pinecone.io\",\"PINECONE_NAMESPACE\":\"mock\",\"RAG_IMAGE_BUCKET\":\"mock\"}"
RUN npx prisma generate

# Build optimized Next.js production output
RUN npm run build

# Stage 3: Create minimal runtime image
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# Use non-root user for security
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs

# Copy only required build artifacts
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
