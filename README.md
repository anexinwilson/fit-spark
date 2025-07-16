# Fit Spark 

Fit Spark is a Next.js app built with TypeScript that generates personalized workout plans based on fitness goals, available equipment, and experience level, offering weekly or monthly program options. It has social login and email sign-in through Clerk, flexible subscriptions via Stripe weekly, monthly, yearly, and features to change or cancel plans anytime. The app also has profile management for viewing subscription details and uses Stripe webhooks to keep subscription status updated in real time.

## Features

| Area | What's inside |
| ---- | ------------- |
| **Authentication** | Clerk (email-link + social) |
| **Payments** | Stripe Checkout & webhooks (create / upgrade / cancel) |
| **Workout AI** | GPT-4o prompt -> JSON schedule rendered day-by-day |
| **Database** | PostgreSQL on Neon, accessed through Prisma |
| **UI** | Material UI, Emotion |
| **State / Data-fetch** | React Query |
| **Tests** | Jest + custom mocks (OpenAI, Stripe, Prisma, Clerk) |

## Tech Stack (Core)

- Next.js 15 – App Router
- TypeScript
- React 19
- Prisma ORM → Neon Postgres
- Stripe SDK
- OpenAI SDK

## Getting Started

### 1. Clone & Install

```bash
git https://github.com/anexinwilson/fit-spark.git
cd fit-spark
npm install       
```

### 2. Environment Variables

Duplicate `.env.local.example` to `.env.local` and fill in the required values for Clerk, Stripe, OpenAI, and the base URL:

```ini
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PRICE_WEEKLY=...
STRIPE_PRICE_MONTHLY=...
STRIPE_PRICE_YEARLY=...
OPENAI_API_KEY=...
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

Duplicate `.env.example` to `.env` and add the Prisma database URL:

```ini
DATABASE_URL=postgres://<user>:<password>@<your-neon>.neon.tech/neondb
```

### 3. Database Migration (Neon + Prisma)

```bash
npx prisma generate
npx prisma migrate deploy
```

### 4. Stripe CLI for Local Webhooks

To test Stripe webhooks locally, set up the Stripe CLI:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhook
```

### 5. Run Dev Server

```bash
npm run dev
```

App opens on `http://localhost:3000`.

### Unit Tests

```bash
npm run test
```

### Build

```bash
npm run build
npm start
```