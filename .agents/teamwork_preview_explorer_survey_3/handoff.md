# Handoff Report — Survey & Investigation: Error Handling, Mock Verification & Codebase Health

## 1. Observation

### Rate Limiting and Quota Errors
- **Current Error Definitions**: `RateLimitQuotaExhaustedError` is **not defined** in the codebase.
  - File: `c:\Users\aen\Music\fit-spark\src\lib\errors.ts` (Lines 1-5): Only exports `getErrorMessage(error: unknown): string`.
  - File: `c:\Users\aen\Music\fit-spark\src\lib\ai\gemini.ts` (Lines 22-30): Defines `GeminiApiError extends Error` with optional `status?: number`.
- **API Error Handling**:
  - File: `c:\Users\aen\Music\fit-spark\src\app\api\generate-plan\route.ts` (Lines 79-87):
    ```ts
    } catch (error: any) {
      console.error("Stream execution error:", error);
      let errorMessage = "Failed to generate plan. Please try again.";
      if (error?.status === 429 || error?.message?.includes("429") || error?.message?.includes("Quota")) {
        errorMessage = "API Quota Exceeded. You have hit the 20 requests/day limit on this API key.";
      }
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
      controller.close();
    }
    ```
- **UI Error Consumption**:
  - File: `c:\Users\aen\Music\fit-spark\src\features\workout-plan\workout-plan-form.tsx` (Lines 70, 321-324, 835-842): Catches stream error, updates `generation` mutation state (`isError: true`, `isPending: false`), rendering an inline alert card at lines 835-842.

### Mock Verification Strategy for `llm.invoke` in `graph.ts`
- **Location**: `c:\Users\aen\Music\fit-spark\src\features\workout-generator\graph.ts`
  - Line 51: `const llm = primaryLlm.withFallbacks({ fallbacks: [fallback1, fallback2] });`
  - Line 130 (inside `planBuilder` node): `const response = await llm.invoke(prompt);`
  - Line 150 (inside `safetyEvaluator` node): `const response = await llm.invoke([{ role: "user", content: prompt }]);`
- **Verification Mock Setup**:
  To verify R2 requirement, `llm.invoke` (or `planBuilder` in `graph.ts`) can be temporarily patched to throw `RateLimitQuotaExhaustedError`:
  ```ts
  throw new RateLimitQuotaExhaustedError("API Quota Exceeded (HTTP 429)");
  ```
  During graph execution via `/api/generate-plan`, `streamEvents` catches the thrown error in `route.ts`, sends an SSE error message `data: {"error": "..."}`, closes the stream, and `WorkoutPlanForm` transitions out of loading state into an error alert display without infinite spinners.

### Build & Tooling Configuration
- **Configurations inspected**:
  - `package.json` (Lines 5-21): Scripts for `build`, `lint` (`eslint . --max-warnings=0`), `typecheck` (`tsc --noEmit`), `test` (`jest`), `test:e2e` (`playwright test`), `format` (`prettier --write .`), `format:check` (`prettier --check .`).
  - `tsconfig.json` (Lines 1-37): ES2023 target, bundler resolution, `@/*` alias -> `./src/*`.
  - `eslint.config.mjs` (Lines 1-25): ESLint 9 flat config using `eslint-config-next`.
  - `jest.config.ts` (Lines 1-22): Next.js Jest setup with `jsdom` environment.
  - `playwright.config.ts` (Lines 1-32): Playwright e2e setup targeting `./e2e`.

### Codebase Health Audit Executions
- **`npm run typecheck`**: FAILED with type errors:
  1. `src/features/workout-generator/graph.ts` (Lines 12-18): `Annotation<...>()` default callback type mismatch with LangGraph 1.4.9 reducers.
  2. `src/features/workout-plan/server/generate-workout-plan.ts` (Line 11) & `src/features/workout-plan/workout-plan-form.tsx` (Line 240, 474): `daysPerWeek` referenced on `workoutPlanSchema` input, but missing in `src/features/workout-plan/schema.ts`.
  3. `evals/eval-langgraph.ts` (Line 1): Import path ending with `.ts` extension is invalid under TS module resolution.
  4. `scripts/test-langgraph.ts` (Lines 16-20, 230): `Annotation` reducer argument mismatches.
- **`npm run lint`**: FAILED with 13 problems (7 errors, 6 warnings):
  1. `scripts/test-langgraph.ts`: Line 47 (`no-explicit-any`), Line 94 (`no-explicit-any`), warnings for unused `e` and `pool`.
  2. `src/app/api/generate-plan/route.ts`: Line 31 (`no-explicit-any`), Line 79 (`no-explicit-any`), Line 99 (`no-explicit-any`), warning for unused `e`.
  3. `src/features/workout-generator/graph.ts`: Line 23 (`no-explicit-any`), Line 91 (`no-explicit-any`), warnings for unused `pg` and `e`.
- **`npm run format:check`**: FAILED. Code style issues found in 29 files including key project files:
  - `src/app/api/generate-plan/route.ts`
  - `src/app/workoutplan/page.tsx`
  - `src/features/workout-generator/graph.ts`
  - `src/features/workout-plan/schema.ts`
  - `src/features/workout-plan/server/generate-workout-plan.ts`
  - `src/features/workout-plan/workout-plan-form.tsx`
  - `src/features/workout-plan/workout-plan-result.tsx`
  - `__tests__/equipment-search.test.ts`, `e2e/equipment-search.spec.ts`, `evals/eval-langgraph.ts`, `jest.config.ts`, `package.json`, `scripts/test-langgraph.ts`.

### AI Branding Audit
- **Scanned Paths**: All files under `src/`, `app/`, `components/`, `public/`.
- **Findings**:
  - Zero user-facing AI branding terms (`"AI"`, `"Smart"`, `"Intelligent"`, `"Powered by AI"`) in UI components.
  - Zero forbidden emojis (`✨`, `🤖`) or sparkles icons (`lucide-sparkles`, `data-icon='sparkles'`).
  - Internal non-UI code comment in `src/lib/ai/gemini.ts` ("Google AI Studio") and directory path `src/lib/ai/` are code-internal.
  - Automated Playwright audit in `e2e/ai-branding-audit.spec.ts` verifies compliance across 8 routes (`/`, `/equipment`, `/subscribe`, `/sign-in`, `/sign-up`, `/create-profile`, `/profile`, `/workoutplan`).

## 2. Logic Chain
1. **Observation**: `RateLimitQuotaExhaustedError` does not exist in `src/lib/errors.ts` or `src/features/workout-generator/graph.ts`.
   - **Reasoning**: A custom error class `RateLimitQuotaExhaustedError` extending `Error` with `status = 429` must be created so that it can be imported, thrown in `graph.ts`, and checked in `route.ts`.
2. **Observation**: `graph.ts` calls `llm.invoke` inside `planBuilder` (Line 130) and `safetyEvaluator` (Line 150).
   - **Reasoning**: Temporarily throwing `new RateLimitQuotaExhaustedError("429 Quota Exceeded")` inside `planBuilder` simulates a rate limit failure during LangGraph execution. When tested against `/api/generate-plan`, `route.ts` will catch it and return SSE error data, validating R2 requirements.
3. **Observation**: `npm run typecheck` and `npm run lint` failed on `graph.ts`, `route.ts`, `schema.ts`, `eval-langgraph.ts`, and `test-langgraph.ts`.
   - **Reasoning**: Before concluding R1/R2 implementation, the implementer agent must fix `workoutPlanSchema` in `schema.ts` to include `daysPerWeek`, fix `Annotation` definitions in `graph.ts`, remove `any` types in `route.ts` & `graph.ts`, remove unused imports/variables, and fix `.ts` extension import in `eval-langgraph.ts`.
4. **Observation**: `prettier --check .` flagged 29 files as unformatted.
   - **Reasoning**: Running `npx prettier --write .` will resolve formatting warnings and achieve zero-error compliance.

## 3. Caveats
- `src/features/workout-generator/graph.ts` uses `@langchain/google-genai` and Gemini models directly. If API keys are missing or exhausted in production/test environments, fallback handling relies on clear rate limit error messages.
- The lint, typecheck, and formatting issues are pre-existing in the codebase and should be addressed during implementation.

## 4. Conclusion
- Rate limit and quota error handling can be standardized by declaring `RateLimitQuotaExhaustedError` in `src/lib/errors.ts` and catching it explicitly in `src/app/api/generate-plan/route.ts`.
- The R2 mock verification strategy is clear: throw `new RateLimitQuotaExhaustedError("429 Rate limit quota exceeded")` inside `planBuilder` in `src/features/workout-generator/graph.ts` and test `/api/generate-plan` streaming endpoint.
- Codebase AI branding is 100% compliant in user-facing UI.
- Codebase health requires fixing schema/annotation type errors, resolving ESLint `no-explicit-any` / unused variable errors, and running Prettier formatting.

## 5. Verification Method
- **Typecheck**: `npm run typecheck` (Must pass with 0 errors).
- **Lint & Format**: `npm run lint` and `npm run format:check` (Must pass with 0 errors/warnings).
- **Mock Rate Limit Test**:
  1. Patch `src/features/workout-generator/graph.ts` line 130 to throw `new RateLimitQuotaExhaustedError("Quota exceeded")`.
  2. POST to `/api/generate-plan` with valid payload.
  3. Verify response streams `data: {"error": "API Quota Exceeded..."}` and closes cleanly.
- **AI Branding E2E Test**: `npx playwright test e2e/ai-branding-audit.spec.ts` (Must pass all 8 route checks).
