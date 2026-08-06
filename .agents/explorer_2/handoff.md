# Handoff Report — Survey R2 (Equipment Enforcement & Programmatic Evals)

## 1. Observation

Direct observations from read-only codebase analysis:

1. **`src/features/workout-generator/graph.ts` (lines 94–99)**:
   ```typescript
   const allowedEquipment = [
     ...(state.equipment || []),
     "bodyweight",
     "none",
     "None",
   ];
   ```
   `exerciseRetriever` explicitly injects `"bodyweight"`, `"none"`, and `"None"` into `allowedEquipment` regardless of `state.equipment`.

2. **`src/features/workout-generator/graph.ts` (lines 125–133)**:
   ```typescript
   if (!response.ok) {
     const errorText = await response.text();
     console.error("Pinecone search failed", response.status, errorText);
     return {
       exercises: [
         JSON.stringify({
           name: "Pushups",
           equipment_name: "Bodyweight",
           category: "Chest",
         }),
       ],
     };
   }
   ```
   Pinecone API search failure fallback hardcodes ONLY Pushups (Bodyweight).

3. **`src/features/workout-generator/graph.ts` (line 81) & `src/app/api/generate-plan/route.ts` (line 40)**:
   ```typescript
   // graph.ts:81
   return { equipment: state.equipment || ["bodyweight"] };

   // route.ts:40
   equipment: equipment ? equipment.split(", ") : ["bodyweight"],
   ```
   Defaulting to `["bodyweight"]` occurs whenever state or body equipment string is empty.

4. **`src/features/workout-generator/graph.ts` (lines 191–196)**:
   Prompt rule 2 states:
   `2. If you need a Cardio or Warmup exercise and none exist in the menu, you MUST select a 'Bodyweight' exercise from the menu, or leave the field empty.`
   There is no prompt rule prohibiting bodyweight exercises in `mainWorkout` when bodyweight is not selected by the user.

5. **`src/features/workout-generator/graph.ts` (lines 208–238)**:
   `safetyEvaluator` evaluates safety (injuries) and RAG menu membership (`state.exercises`), but does NOT evaluate whether `mainWorkout` exercises conform to `state.equipment`.

6. **`evals/eval-langsmith.ts` (lines 56–58)**:
   ```typescript
   const allowed = [...equipmentInput, "bodyweight", "none"].map((e: unknown) =>
     String(e).toLowerCase(),
   );
   ```
   Existing evaluation harness hardcodes `"bodyweight"` into `allowed`, causing `ragEquipmentEvaluator` to pass even when bodyweight exercises are returned for non-bodyweight requests.

7. **Test Suite Status**:
   - `npm run typecheck` passes with zero errors.
   - `npx jest --no-cache` passes all 9 test suites (27 tests total).

---

## 2. Logic Chain

1. **User input flow**: User selects "Machines" on the UI without checking "Include Bodyweight". UI submits `equipment: "Leg Press Machine, Lat Pulldown Machine, Chest Press Machine"`.
2. **API Route**: `/api/generate-plan/route.ts` parses `equipment.split(", ")` resulting in `initialState.equipment = ["Leg Press Machine", "Lat Pulldown Machine", "Chest Press Machine"]`.
3. **Pinecone Retriever Filter**: `exerciseRetriever` creates `allowedEquipment = ["Leg Press Machine", "Lat Pulldown Machine", "Chest Press Machine", "bodyweight", "none", "None"]`. Because `"bodyweight"` is added, Pinecone hit filtering allows bodyweight exercises into `state.exercises`.
4. **Pinecone Failure Case**: If Pinecone search is unreachable or fails, `exerciseRetriever` returns Pushups (Bodyweight) as the only exercise in `state.exercises`.
5. **Plan Builder**: `planBuilder` receives `state.exercises` containing bodyweight exercises. Without a prompt constraint forbidding bodyweight in `mainWorkout`, the LLM uses bodyweight exercises in `mainWorkout`.
6. **Safety Evaluator**: `safetyEvaluator` checks if plan exercises are in `state.exercises`. Since bodyweight exercises are in `state.exercises`, `safetyEvaluator` returns `PASS`.
7. **Evaluation Harness**: `evals/eval-langsmith.ts` also hardcoded `"bodyweight"`, masking this issue during evaluation runs.

---

## 3. Caveats

- **Pinecone Index Contents**: We inspected the code that queries Pinecone endpoint (`/records/namespaces/exercises-v1/search`), but did not query live Pinecone vector index embeddings directly as API keys require active environment runtime.
- **Cardio / Warmups**: The user requirement specifically states that bodyweight exercises should not appear in the **main workout** if not selected. Warmups or mobility can remain flexible or empty if specified.

---

## 4. Conclusion

The unwanted injection of bodyweight exercises for machines-only requests is caused by:
1. Hardcoded `"bodyweight"` addition in `allowedEquipment` in `graph.ts:96`.
2. Hardcoded Pushups fallback on Pinecone search failure in `graph.ts:128`.
3. Absence of equipment compliance checks in `planBuilder` prompt rules and `safetyEvaluator` node.
4. Flawed evaluator logic in `evals/eval-langsmith.ts:56` hardcoding `"bodyweight"` as allowed.

---

## 5. Verification Method

To independently verify these findings and test future fixes:

1. **Typecheck & Existing Unit Tests**:
   - Run `npm run typecheck`
   - Run `npx jest --no-cache`

2. **Programmatic Equipment Enforcement Eval Verification**:
   - Inspect `evals/eval-langsmith.ts` line 56.
   - Run `npx tsx evals/eval-langgraph.ts` or run a dedicated Jest test asserting zero bodyweight exercises in `mainWorkout` for a Machines-only request.

3. **Code Inspection Verification**:
   - Inspect `src/features/workout-generator/graph.ts` lines 81, 96, 128, 191, 208.
   - Verify `allowedEquipment` does not unconditionally include `"bodyweight"`.
