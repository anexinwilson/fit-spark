# FitSpark Project: Workout Plan Generator Streaming UI & Rate Limit Error Handling

## Architecture

- **Next.js App Router & React**:
  - `src/app/workoutplan/page.tsx`: Server component managing Clerk authentication, subscription check, and mounting `WorkoutPlanForm`.
  - `src/features/workout-plan/workout-plan-form.tsx`: Client-side form handling multi-step inputs, TanStack Query `useMutation` generation lifecycle, and SSE stream consumption.
- **LangGraph Workout Generator Workflow**:
  - `src/features/workout-generator/graph.ts`: Stateful `StateGraph` using `WorkoutPlanState` root annotation.
  - Nodes: `equipmentResolver` -> `exerciseRetriever` (Pinecone REST API search) -> `planBuilder` (LLM plan generation) -> `safetyEvaluator` (LLM safety check) -> `shouldRetry` conditional edge (up to 2 retries).
  - Stream Execution: `workoutPlanWorkflow.streamEvents(initialState, { version: "v2" })` emitting `on_chain_start` status messages and `on_chat_model_stream` live token chunks over Server-Sent Events (SSE).
- **Streaming & UI Layer**:
  - Endpoint `POST /api/generate-plan`: Emits SSE messages (`status`, `chunk`, `complete`, `error`).
  - Loading UI: Redesigned loading view using `shadcn/Base UI` primitives (`Card`, `Badge`, `Spinner`, `Skeleton`, `Sonner`, `Button`, `Separator`).
  - Multi-Step Node Stepper: Visual progress indicator tracking node execution states (`equipmentResolver`, `exerciseRetriever`, `planBuilder`, `safetyEvaluator`).
  - Terminal-Style Token Stream Box: Auto-scrolling terminal component displaying raw LLM stream tokens in real-time with monospaced typography and status header.
  - Error State Component: Inline alert card catching 429 quota exhaustion and exceptions, displaying clear error details and retry capability without infinite loading spinners or wiping stream logs.

## Feature Inventory

| #   | Feature                            | Description                                                                                                                                      | Milestone | Source |
| --- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------- | ------ |
| 1   | Redesigned Loading Sequence        | Premium `shadcn/Base UI` loading view replacing form during generation                                                                           | M1        | survey |
| 2   | LangGraph Node Execution Stepper   | Visual indicator tracking active/completed node status (Profile Resolver, Pinecone Search, Plan Builder, Safety Evaluator)                       | M1        | survey |
| 3   | Real-Time Token Stream Terminal    | Auto-scrolling terminal box displaying raw LLM stream tokens in real-time                                                                        | M1        | survey |
| 4   | Fixed SSE Stream Parsing           | Robust SSE line decoder handling multiline JSON chunks without dropping tokens                                                                   | M1        | survey |
| 5   | Rate Limit & Error Definition      | Standardized `RateLimitQuotaExhaustedError` class (status 429) in `src/lib/errors.ts`                                                            | M2        | survey |
| 6   | Robust Error State UI              | Dedicated error alert view with retry capabilities, preserving stream history and avoiding infinite spinners                                     | M2        | survey |
| 7   | R2 Mock Verification Strategy      | Temporary `RateLimitQuotaExhaustedError` mock in `graph.ts` `llm.invoke` to verify R2 error handling                                             | M2        | survey |
| 8   | TypeScript & Codebase Health Fixes | Resolve `Annotation` reducers in `graph.ts`, `daysPerWeek` in `schema.ts`, ESLint `no-explicit-any` / unused vars, and Prettier formatting       | M3        | survey |
| 9   | End-to-End Test Suite              | Comprehensive Playwright test suite (`e2e/workout-plan-streaming.spec.ts`) covering streaming, node status, error handling, and zero AI branding | M3        | survey |

## Milestones

| #   | Name                                                        | Scope                                                                                                                                         | Dependencies | Status      |
| --- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------- |
| M1  | Redesign Loading Sequence & Live AI Token Streaming UI      | Build loading UI, node execution stepper, auto-scrolling terminal box, and fix SSE parser in `workout-plan-form.tsx`                          | none         | DONE        |
| M2  | Robust Error Handling, 429 Quota Limits & Mock Verification | Define `RateLimitQuotaExhaustedError`, update route handler error catching, build error alert UI with retry, and execute R2 mock verification | M1           | DONE        |
| M3  | Code Health, E2E Test Suite & Forensic Audit                | Fix TS types, ESLint, Prettier, run Playwright test suite, and perform Forensic Audit                                                         | M2           | IN_PROGRESS |

## Interface Contracts

### API Route ↔ Client Stream Consumer

- **Endpoint**: `POST /api/generate-plan`
- **Request Body**:
  ```ts
  {
    goal: string;
    experience: string;
    daysPerWeek: number;
    trainingDays: string[];
    injuries: string;
    equipment: string[];
  }
  ```
- **SSE Event Payloads**:
  - `data: {"status": "Building your weekly schedule..."}\n\n` -> Updates active node stepper / status heading
  - `data: {"chunk": "{\n  \"day1\":..."}\n\n` -> Appends token chunk to terminal stream box
  - `data: {"complete": true, "workoutPlan": {...}, "exercisesUsed": [...]}\n\n` -> Triggers completion & renders generated plan view
  - `data: {"error": "API Quota Exceeded..."}\n\n` -> Triggers error alert view with retry option

### Error Hierarchy

- `RateLimitQuotaExhaustedError`: Extends `Error`, `status = 429`, default message `"API Quota Exceeded. You have hit the daily request limit."`

## Code Layout

- `src/features/workout-plan/workout-plan-form.tsx`: Form container with state management, loading view, node stepper, terminal stream box, and error alert card.
- `src/features/workout-plan/components/workout-plan-loading.tsx`: Dedicated loading sequence component with LangGraph node stepper and token stream viewer.
- `src/features/workout-generator/graph.ts`: LangGraph workflow definition with annotation reducers and node execution logic.
- `src/features/workout-plan/schema.ts`: Zod validation schema including `daysPerWeek`.
- `src/lib/errors.ts`: Custom error classes including `RateLimitQuotaExhaustedError`.
- `src/app/api/generate-plan/route.ts`: Streaming SSE API route handler.
- `e2e/workout-plan-streaming.spec.ts`: E2E Playwright test suite for streaming UI, rate limit handling, and zero AI branding compliance.
