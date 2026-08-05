## 2026-08-06T03:56:45Z
Execute Milestone 2 (Robust Error Handling, 429 Quota Limits & Mock Verification).

Specific Instructions:
1. Define Rate Limit Error Class (`src/lib/errors.ts`):
   - Export `RateLimitQuotaExhaustedError` extending `Error` with property `status = 429` and default message `"API Quota Exceeded. You have hit the daily request limit."`.
2. Update Route Handler (`src/app/api/generate-plan/route.ts`):
   - Import `RateLimitQuotaExhaustedError` and catch it explicitly (checking `error instanceof RateLimitQuotaExhaustedError`, `error?.status === 429`, or quota messages). Enqueue SSE payload `data: {"error": errorMessage}\n\n` and close stream cleanly.
3. Enhance Frontend Error UI & State Management (`src/features/workout-plan/workout-plan-form.tsx`):
   - Prevent `useMutation.onError` from wiping `generationStatus` or `generationStream`. Preserve execution logs so users can inspect where the failure occurred.
   - Implement a clean, dedicated Error Card UI using `shadcn/Base UI` primitives (`Card`, `Badge`, `Button`, `Separator`) with a clear error header, detailed message, and a prominent "Retry Generation" action button.
4. Requirement R2 Mock Verification:
   - Temporarily patch `llm.invoke` in `src/features/workout-generator/graph.ts` (line 130) to throw `new RateLimitQuotaExhaustedError("429 Rate limit quota exceeded")`.
   - Verify that invoking the endpoint streams the error payload and that the UI transitions cleanly to the error state without infinite spinners.
   - Create or update unit test in `__tests__/workout-plan-error.test.ts` (or similar) confirming rate limit error handling.
   - Remove/uncomment the temporary mock in `graph.ts` so the file remains production-ready.
5. Code Health Verification:
   - Run `npx tsc --noEmit` / `npm run typecheck`, `npm run lint`, `npx prettier --check .`, and `npm run test`.
6. Document all changes, verification steps, and test results in handoff.md in your working directory (`c:\Users\aen\Music\fit-spark\.agents\teamwork_preview_worker_m2\handoff.md`).
7. Send message to orchestrator with summary of work and path to handoff.md.
