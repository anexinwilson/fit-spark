## 2026-08-06T12:41:30Z

<DISPATCH>
Role: teamwork_preview_worker
Working directory: c:\Users\aen\Music\fit-spark\.agents\worker_m1
Original Request: c:\Users\aen\Music\fit-spark\.agents\ORIGINAL_REQUEST.md
Scope: Milestone 1 - LangGraph Optimization & Model Fallbacks (R1)

Target File: `src/features/workout-generator/graph.ts`

Tasks:
1. **Model Fallback Configuration**:
   - In `graph.ts` (lines 57–69), update `.withFallbacks()` configuration.
   - Replace invalid model names `"gemini-3.5-flash"` and `"gemini-3.0-flash"` with `"gemini-1.5-flash-8b"` and `"gemini-1.5-pro"`.
   - Ensure the primary model `gemini-flash-latest` falls back to `gemini-1.5-flash-8b` and then `gemini-1.5-pro` on HTTP 429 quota exhaustion.

2. **Collapse Redundant LLM Call**:
   - In `graph.ts` (lines 208–238), refactor `safetyEvaluator` node to be a programmatic TypeScript validator instead of calling `llm.invoke`.
   - Check exercise string matching / equipment set constraints programmatically in TypeScript without making an extra LLM call.
   - Ensure the workflow only executes 1 LLM call (`planBuilder`) per plan generation.

3. **Verification**:
   - Run `npm run typecheck` and `npm test` (or `npx jest`).
   - Confirm zero build/type/test errors.
   - Document commands and results in `c:\Users\aen\Music\fit-spark\.agents\worker_m1\handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
</DISPATCH>
