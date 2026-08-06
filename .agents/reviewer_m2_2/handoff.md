# Review Handoff Report — Milestone 2: Equipment Enforcement & Programmatic Evals

## 1. Observation

- **`src/features/workout-generator/graph.ts`**:
  - Line 82: `equipmentResolver` returns `{ equipment: state.equipment ?? [] }`, preventing unselected bodyweight defaults.
  - Lines 100-108: `exerciseRetriever` checks if `userEquipment` contains `"bodyweight"` or `"none"` before appending bodyweight strings to `allowedEquipment`.
  - Lines 136-143: `exerciseRetriever` Pinecone error handler dynamically constructs fallback exercises based on `userEquip` rather than hardcoding Pushups.
  - Lines 159-178: `exerciseRetriever` post-retrieval filter matches hit `equipment_name` against `allowedSet`.
  - Lines 218: `planBuilder` prompt rule 2 explicitly forbids bodyweight exercises in `mainWorkout` unless requested.
  - Lines 331-365: `safetyEvaluator` checks `mainWorkout` exercises for bodyweight keywords/equipment when bodyweight is not selected, recording a safety issue if violated.

- **`src/app/api/generate-plan/route.ts`**:
  - Lines 41-48: Validates `parsedEquipment.length === 0` and returns HTTP status 400 (`"Equipment selection cannot be empty."`).

- **`evals/eval-langsmith.ts`**:
  - Lines 57-60: `ragEquipmentEvaluator` only appends `"bodyweight"` to `allowed` if `equipmentInput` explicitly contains bodyweight.

- **`__tests__/equipment-enforcement.test.ts`**:
  - Lines 73-108: Unit tests for HTTP 400 validation on empty equipment string & empty array.
  - Lines 111-172: Unit test verifying RAG filtering for `equipment: ["Machine"]` excludes bodyweight exercises from both RAG retrieval and `mainWorkout`.
  - Lines 174-208: Unit test verifying `safetyEvaluator` detects equipment constraint violations if bodyweight is included in `mainWorkout`.
  - Lines 210-228: Unit test verifying `equipmentResolver` preserves empty equipment array.

- **Verification Commands Executed**:
  - `npm run typecheck` (`tsc --noEmit`): Exited with code 0 (0 errors).
  - `npm run lint` (`eslint . --max-warnings=0`): Exited with code 0 (0 warnings).
  - `npx prettier --check .`: Exited with code 0 ("All matched files use Prettier code style!").
  - `npm test` (`jest`): Exited with code 0 (11 test suites passed, 36 tests passed).

## 2. Logic Chain

1. **Equipment Default Fix**:
   - In `graph.ts`, changing `equipmentResolver` to `state.equipment ?? []` ensures an empty equipment array does not default to `["bodyweight"]`.
   - In `route.ts`, checking `parsedEquipment.length === 0` rejects empty requests at the API boundary with HTTP 400.

2. **RAG Filtering & Fallback Integrity**:
   - `exerciseRetriever` dynamically filters vector search hits against user-specified equipment. Non-bodyweight equipment selections (e.g. `["Machine"]`) strictly exclude `Bodyweight` hits.
   - If Pinecone returns an error, fallback exercises are generated from `userEquip` (`<eq> Press`, `<eq> Row`, `<eq> Extension`), eliminating unselected bodyweight injections.

3. **Prompting & Evaluation Enforcement**:
   - `planBuilder` system prompt rule 2 instructs the LLM to strictly avoid bodyweight exercises in `mainWorkout` when bodyweight is not selected.
   - `safetyEvaluator` programmatically scans `mainWorkout` exercises for bodyweight keywords (`pushup`, `dip`, `pullup`, `air squat`, `bodyweight`) and triggers a retry loop if a violation occurs.

4. **Evaluation & Verification Consistency**:
   - Updating `ragEquipmentEvaluator` in `evals/eval-langsmith.ts` aligns offline evaluation metrics with graph logic.
   - All tests in `__tests__/equipment-enforcement.test.ts` pass, alongside all existing 10 test suites in the codebase.

## 3. Caveats

- No caveats. All changes were examined, tested, and verified against edge cases and codebase standards. No integrity violations or shortcuts were identified.

## 4. Conclusion

- **Verdict**: **APPROVE**
- Worker `worker_m2` successfully implemented strict equipment enforcement, zero unwanted bodyweight injection, API edge validation, fallback safety, and comprehensive programmatic test coverage. All linters, type checks, formatters, and test suites pass cleanly.

## 5. Verification Method

To independently verify:
```bash
npm run typecheck
npm run lint
npx prettier --check .
npm test
```
All four commands must exit with code 0.
