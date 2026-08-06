# Project: FitSpark Optimization, Equipment Enforcement & Interactive Stream

## Architecture
- Framework: Next.js App Router (TypeScript)
- LangChain / LangGraph JS: `src/features/workout-generator/graph.ts`
- API Route: `src/app/api/generate-plan/route.ts`
- UI: `src/features/workout-plan/workout-plan-loading.tsx`, `workout-plan-form.tsx`
- Evals: `evals/eval-langsmith.ts`
- Vector DB: Pinecone

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Model Fallbacks | `.withFallbacks()` for `gemini-flash-latest` -> `gemini-1.5-flash-8b` / `gemini-1.5-pro` on HTTP 429 | M1 | Survey R1 |
| 2 | Collapse Redundant LLM Call | Programmatic `safetyEvaluator` node replacing 2nd LLM call | M1 | Survey R1 |
| 3 | Equipment Filter Fix | Prevent forced bodyweight injection in `allowedEquipment`, fallback, and defaults | M2 | Survey R2 |
| 4 | System Prompt Constraint | Strict rule forbidding bodyweight in main workout when not selected | M2 | Survey R2 |
| 5 | Programmatic Evals | Fix `evals/eval-langsmith.ts` and run programmatic eval confirming equipment enforcement | M2 | Survey R2 |
| 6 | Interactive Streaming | Stream rich agentic logs (`[AGENT]...`, `[RAG]...`) in `graph.ts` / `route.ts` | M3 | Survey R3 |
| 7 | Loading UI Enhancement | Update `WorkoutPlanLoading` terminal view to render interactive agentic logs cleanly | M3 | Survey R3 |
| 8 | Codebase Health & Formatting | Fix ESLint `any` errors, run Prettier, verify no AI branding, pass lint & typecheck | M4 | Survey R3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: LangGraph Optimization & Model Fallbacks | `graph.ts` `.withFallbacks()`, programmatic `safetyEvaluator` | none | DONE |
| 2 | M2: Equipment Enforcement & Programmatic Evals | `graph.ts`, `route.ts`, `evals/` equipment enforcement & eval suite | M1 | PLANNED |
| 3 | M3: Interactive Agentic Loading Stream | `graph.ts`, `route.ts`, `WorkoutPlanLoading` interactive log stream | M1, M2 | PLANNED |
| 4 | M4: Codebase Health, Formatting & Rules | ESLint, Prettier, AI branding audit, full verification | M1, M2, M3 | PLANNED |

## Code Layout
- Backend LangGraph: `src/features/workout-generator/graph.ts`
- API handler: `src/app/api/generate-plan/route.ts`
- Loading Component: `src/features/workout-plan/workout-plan-loading.tsx`
- Form Component: `src/features/workout-plan/workout-plan-form.tsx`
- Evals: `evals/eval-langsmith.ts`, `evals/equipment-enforcement.eval.ts`
