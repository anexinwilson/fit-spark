# Handoff Report — Milestone 2: Equipment Enforcement & Programmatic Evals (worker_m2)

## 1. Observation

- **`src/features/workout-generator/graph.ts`**:
  - Line 82 previously hardcoded default equipment: `return { equipment: state.equipment || ["bodyweight"] };`.
  - Lines 99-104 previously forcibly appended `"bodyweight"`, `"none"`, `"None"` to `allowedEquipment` regardless of whether the user selected bodyweight:
    ```typescript
    const allowedEquipment = [
      ...(state.equipment || []),
      "bodyweight",
      "none",
      "None",
    ];
    ```
  - Lines 129-135 previously returned a static fallback exercise `Pushups` (Bodyweight) when Pinecone search returned `!response.ok`.
  - `planBuilder` system prompt rule 2 previously instructed: `"If you need a Cardio or Warmup exercise and none exist in the menu, you MUST select a 'Bodyweight' exercise from the menu..."` without forbidding bodyweight in `mainWorkout`.
  - `safetyEvaluator` previously only evaluated RAG menu compliance and injury heuristics, but did not evaluate equipment constraint compliance for `mainWorkout`.

- **`src/app/api/generate-plan/route.ts`**:
  - Line 42 previously defaulted empty equipment to bodyweight: `equipment: equipment ? equipment.split(", ") : ["bodyweight"]`.

- **`evals/eval-langsmith.ts`**:
  - Line 56 previously hardcoded `"bodyweight"` into the allowed equipment list in `ragEquipmentEvaluator`: `const allowed = [...equipmentInput, "bodyweight", "none"]...`.

- **Verification Output**:
  - `npm test`: Executed 11 test suites (36 total tests), 0 failures.
  - `npm run typecheck`: Passed with zero TypeScript errors.
  - `npm run lint`: Passed with zero ESLint errors (`--max-warnings=0`).
  - `npx prettier --check .`: Passed with zero formatting warnings.

## 2. Logic Chain

1. **Root Cause Resolution**:
   - By changing `equipmentResolver` in `graph.ts` to return `state.equipment ?? []`, empty equipment in graph state no longer silently transforms into `["bodyweight"]`.
   - By conditionally appending `"bodyweight"` to `allowedEquipment` in `exerciseRetriever` ONLY if the user explicitly selected `"bodyweight"` or `"none"`, exercises using bodyweight are excluded from RAG retrieval when non-bodyweight equipment (e.g., `"Machine"` or `"Dumbbells"`) is requested.
   - By dynamically generating Pinecone fallback exercises matching the user's requested `state.equipment` in `exerciseRetriever`, Pinecone API errors no longer inject Pushups into non-bodyweight requests.
   - By updating the `planBuilder` prompt with an explicit CRITICAL rule ("The `mainWorkout` MUST ONLY use exercises matching the user's selected equipment. If bodyweight is NOT in the selected equipment list, DO NOT include bodyweight exercises..."), the LLM is explicitly instructed to adhere to selected equipment constraints.
   - By introducing equipment constraint evaluation in `safetyEvaluator`, any plan that includes bodyweight exercises in `mainWorkout` when bodyweight was not requested is flagged with a `safetyIssues` error, forcing a retry.

2. **API Route Validation**:
   - In `route.ts`, validating `parsedEquipment.length === 0` and returning HTTP status 400 (`"Equipment selection cannot be empty."`) ensures invalid requests are rejected at the edge rather than executing the graph with fallback defaults.

3. **Evaluation Script Alignment**:
   - Fixing `ragEquipmentEvaluator` in `evals/eval-langsmith.ts` ensures LangSmith evals accurately flag RAG equipment violations when non-bodyweight equipment is provided as input.

4. **Programmatic Evals**:
   - Creating `__tests__/equipment-enforcement.test.ts` programmatically verifies:
     - Edge validation for empty equipment string and empty equipment array (returns HTTP 400).
     - RAG filtering and mainWorkout execution when `equipment: ["Machine"]` (zero bodyweight exercises in `mainWorkout`).
     - Detection of equipment constraint violations in `safetyEvaluator`.
     - Preservation of empty equipment in `equipmentResolver` without defaulting to bodyweight.

## 3. Caveats

- No caveats. All tasks defined in DISPATCH.md for Milestone 2 have been fully implemented, unit-tested, and verified against linting and typecheck constraints.

## 4. Conclusion

The equipment enforcement fixes in `graph.ts` and `route.ts`, the evaluation fix in `evals/eval-langsmith.ts`, and the programmatic test suite in `__tests__/equipment-enforcement.test.ts` are fully implemented and verified. When users request workouts with non-bodyweight equipment (e.g. Machines), bodyweight exercises are strictly excluded from both the RAG candidate list and the final `mainWorkout`.

## 5. Verification Method

To independently verify this implementation:

1. **Run Unit & Programmatic Tests**:
   ```bash
   npm test
   ```
   *Expected Output*: 11 test suites passed, 36 tests passed.

2. **Run TypeScript Check**:
   ```bash
   npm run typecheck
   ```
   *Expected Output*: Exits with code 0 (`tsc --noEmit`).

3. **Run Linter**:
   ```bash
   npm run lint
   ```
   *Expected Output*: Exits with code 0 (`eslint . --max-warnings=0`).

4. **Run Prettier Check**:
   ```bash
   npx prettier --check .
   ```
   *Expected Output*: "All matched files use Prettier code style!"
