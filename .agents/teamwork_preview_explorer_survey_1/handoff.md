# Survey Report: Codebase & UI Architecture Inspection

## 1. Observation

### A. Next.js App Router Structure & Directory Layout

- **Next.js & React Versions**: Next.js `16.2.12` and React `19.2.8` (found in `package.json:33,36`).
- **Core Directories**:
  - `src/app/`: App router routes and API endpoints.
  - `src/components/`: Shared UI components (`navbar.tsx`, `react-query-client-provider.tsx`).
  - `src/components/ui/`: 15 installed `shadcn/Base UI` primitives.
  - `src/features/`: Feature modules (`billing`, `workout-plan`).
  - `src/lib/`: Backend utilities (`ai/gemini.ts`, `auth.ts`, `errors.ts`, `prisma.ts`, `runtime-config.ts`, `server-env.ts`, `stripe.ts`, `utils.ts`).
- **Routes & Pages Inventory**:
  - `/` (`src/app/page.tsx`): Main landing page with features and "How it works" timeline.
  - `/sign-in/[[...sign-in]]` (`src/app/sign-in/[[...sign-in]]/page.tsx`): Clerk auth sign-in interface.
  - `/sign-up/[[...sign-up]]` (`src/app/sign-up/[[...sign-up]]/page.tsx`): Clerk auth sign-up interface.
  - `/auth/continue` (`src/app/auth/continue/page.tsx`): Post-auth redirect router.
  - `/create-profile` (`src/app/create-profile/page.tsx`): Profile onboarding setup page.
  - `/subscribe` (`src/app/subscribe/page.tsx`): Subscription tier selection (Weekly, Monthly, Yearly).
  - `/profile` (`src/app/profile/page.tsx`): User profile and active subscription management.
  - `/workoutplan` (`src/app/workoutplan/page.tsx`): 3-step workout plan form generator.
- **API Endpoint Routes (`src/app/api/`)**:
  - `POST /api/generate-workoutplan` (`src/app/api/generate-workoutplan/route.ts`): Invokes Gemini LLM service for workout sequence generation.
  - `POST /api/checkout` (`src/app/api/checkout/route.ts`): Initializes Stripe checkout sessions.
  - `GET /api/check-subscription` (`src/app/api/check-subscription/route.ts`): Subscription verification.
  - `POST /api/create-profile` (`src/app/api/create-profile/route.ts`): DB user profile creation.
  - `POST /api/profile/change-plan` (`src/app/api/profile/change-plan/route.ts`): Stripe subscription plan updates.
  - `GET /api/profile/subscription-status` (`src/app/api/profile/subscription-status/route.ts`): Subscription status check.
  - `POST /api/profile/unsubscribe` (`src/app/api/profile/unsubscribe/route.ts`): Stripe subscription cancellation.
  - `POST /api/webhook` (`src/app/api/webhook/route.ts`): Stripe webhook ingestion handler.

### B. UI Primitives & Component Library Setup

- **Configured Framework**: `components.json` specifies `"style": "base-nova"` using `@base-ui/react` (`^1.6.0`) and `shadcn` CLI (`^4.16.1`).
- **Installed `shadcn/Base UI` Components (`src/components/ui/`)**:
  1. `alert-dialog.tsx`
  2. `avatar.tsx`
  3. `badge.tsx`
  4. `button.tsx`
  5. `card.tsx`
  6. `checkbox.tsx`
  7. `dropdown-menu.tsx`
  8. `input.tsx`
  9. `label.tsx`
  10. `select.tsx`
  11. `separator.tsx`
  12. `skeleton.tsx`
  13. `sonner.tsx`
  14. `spinner.tsx`
  15. `textarea.tsx`

### C. Competing UI Framework Check

- **`package.json` inspection**: Zero competing UI dependencies (e.g., no `@mui/material`, `@chakra-ui/react`, `bootstrap`, `antd`, `@mantine/core`, `semantic-ui-react`).
- **Source Imports**: All components in `src/` exclusively import from `@/components/ui`, `@base-ui/react`, and `lucide-react`.

### D. Forbidden AI Branding / Terminology / Symbol Audit

- **VIOLATION (AI Symbol / Sparkles Icon)**:
  - `src/app/subscribe/page.tsx`:
    - Line 5: `import { Check, Loader2, Sparkles } from "lucide-react";`
    - Line 93: `<Sparkles className="size-3.5" aria-hidden="true" />` inside the "Most popular" plan header badge.
  - `src/features/workout-plan/workout-plan-form.tsx`:
    - Line 5: `import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";`
    - Line 401: `<Sparkles />` inside the submit button (`Build my plan`).
- **AI Text Check**:
  - Rendered User Interface text contains zero occurrences of "AI", "Smart", or "Intelligent".
  - Codebase internal paths contain `src/lib/ai/gemini.ts` and comments mentioning "Gemini Developer API".

### E. Equipment Search / Catalog Status

- **Current UI Implementation**: No equipment search or catalog page/component exists. Equipment input is currently handled solely via a plain `textarea` field on step 3 of `src/features/workout-plan/workout-plan-form.tsx:323`.
- **RAG & Pinecone Infrastructure**: `scripts/rag/ingest-exercises.mjs` contains Pinecone vector search and upsert logic indexing exercise equipment metadata (`equipment_type`, `equipment_name`, `equipment_aliases`). `src/lib/runtime-config.ts` includes validation for `PINECONE_API_KEY`, `PINECONE_INDEX_NAME`, `PINECONE_INDEX_HOST`, and `PINECONE_NAMESPACE`.

---

## 2. Logic Chain

1. **Architecture Verification**:
   - Next.js App Router layout is well-structured with clear separation between page routes (`src/app`), domain feature modules (`src/features`), UI primitives (`src/components/ui`), and backend services (`src/lib`).
2. **UI Framework Compliance**:
   - The project strictly uses `shadcn/Base UI` (`@base-ui/react`) and Tailwind CSS v4. No third-party competing UI libraries were found in `package.json` or source imports.
3. **AI Branding Compliance Failure**:
   - Global Rule 4 ("No AI Branding: Do NOT use AI symbols (e.g., sparkles ✨, robot emojis) or AI-related terminology...") is violated in two places where `lucide-react`'s `Sparkles` component is rendered (`src/app/subscribe/page.tsx:93` and `src/features/workout-plan/workout-plan-form.tsx:401`). Removing these icons will restore 100% compliance.
4. **Equipment Search Gap**:
   - Part 1 Milestone focuses on building the "Equipment Search / Catalog" experience with Pinecone retrieval. Currently, no UI components for equipment catalog or search exist in `src/components` or `src/app`. This must be built using `shadcn/Base UI` primitives.

---

## 3. Caveats

- **Runtime Live Connection**: Did not execute active Pinecone vector queries against remote endpoints, as this is a read-only investigation. Backend Pinecone credentials validation was confirmed in `src/lib/runtime-config.ts` and `jest.setup.ts`.
- **`src/lib/ai` Directory**: While Rule 4 prohibits AI branding in the UI and codebase, the directory path `src/lib/ai/` and internal comments exist. The primary focus for compliance is removing user-facing AI terminology and `Sparkles` icons.

---

## 4. Conclusion

The `fit-spark` codebase is cleanly structured with Next.js App Router and `@base-ui/react` (shadcn/Base UI) primitives. There are no competing UI frameworks. However:

1. **AI Symbol Violation**: `Sparkles` icons must be removed from `src/app/subscribe/page.tsx` and `src/features/workout-plan/workout-plan-form.tsx`.
2. **Missing Equipment Search UI**: The Equipment Search / Catalog experience required for Part 1 Milestone is absent from the front-end and needs to be implemented.

---

## 5. Verification Method

- **Verify AI Symbols Removal**:
  Run `grep_search` for `Sparkles` in `src/`:
  `grep -rn "Sparkles" src/`
  _Invalidation condition_: Any match returned in `src/`.
- **Verify UI Framework Setup**:
  Check `src/components/ui` and `components.json`:
  - `components.json` style must be `base-nova`.
  - `package.json` must contain `@base-ui/react` and no competing UI libraries.
- **Verify Route and Component Existence**:
  Inspect `src/app` for app router structure using `find_by_name` or `list_dir`.
