## 2026-08-06T12:52:00Z

<DISPATCH>
Role: teamwork_preview_worker
Working directory: c:\Users\aen\Music\fit-spark\.agents\worker_m2
Original Request: c:\Users\aen\Music\fit-spark\.agents\ORIGINAL_REQUEST.md
Scope: Milestone 2 - Equipment Enforcement & Programmatic Evals (R2)

Target Files:
- `src/features/workout-generator/graph.ts`
- `src/app/api/generate-plan/route.ts`
- `evals/eval-langsmith.ts`
- `__tests__/equipment-enforcement.test.ts`

Tasks:
1. **Fix Equipment Filtering & Fallbacks in `graph.ts` & `route.ts`**:
   - In `graph.ts` (around line 96), stop forcibly appending `"bodyweight"`, `"none"`, `"None"` to `allowedEquipment` if the user did not select bodyweight.
   - In `graph.ts` (around line 128), replace hardcoded Pushups (Bodyweight) Pinecone fallback with an equipment-compliant fallback (e.g. filtered equipment item or error handling).
   - In `graph.ts` (line 81) and `route.ts` (line 40), ensure empty or unselected equipment does NOT default to `["bodyweight"]`.
   - In `graph.ts` (`planBuilder` system prompt), add a strict prompt rule: "CRITICAL: The `mainWorkout` MUST ONLY use exercises matching the user's selected equipment. If bodyweight is NOT in the selected equipment list, DO NOT include bodyweight exercises (like Push-ups, Bodyweight Squats, Dips, Pull-ups) in `mainWorkout` under any circumstances."

2. **Fix & Write Programmatic Evals**:
   - In `evals/eval-langsmith.ts` (line 56), fix `ragEquipmentEvaluator` so it does NOT hardcode `"bodyweight"` into `allowed` when checking equipment compliance.
   - Create `__tests__/equipment-enforcement.test.ts` (or `evals/equipment-enforcement.test.ts`) that programmatically tests and asserts:
     - When generating a workout with input `equipment: ["machines"]` or `["dumbbells"]` (no bodyweight), zero bodyweight exercises appear in `mainWorkout`.
     - When equipment list is empty, proper error validation occurs instead of defaulting to bodyweight.
   - Run programmatic evals via `npm test` and verify pass.

3. **Verification**:
   - Run `npm run typecheck`, `npm run lint`, `npx prettier --check .`, and `npm test`.
   - Document commands and results in `c:\Users\aen\Music\fit-spark\.agents\worker_m2\handoff.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_preview_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.
</DISPATCH>
