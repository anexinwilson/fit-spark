# Analysis: Equipment Enforcement & Programmatic Evals (Survey R2)

## 1. Executive Summary

This document presents the detailed architectural and root-cause analysis for Requirement R2 of FitSpark. Users reported receiving bodyweight exercises (like Pushups, Bodyweight Squats, Planks) in their main workout plan even when selecting exclusively "Machines" or gym equipment (without selecting "Bodyweight" or "Cardio"). Our read-only investigation traced this behavior through the UI, API route, LangGraph workflow, Pinecone RAG retrieval, LLM prompts, safety evaluators, and existing evaluation scripts. We identified 6 distinct root causes in equipment filtering and fallbacks, and designed a concrete solution architecture and programmatic evaluation framework.

---

## 2. Root Cause Analysis: Equipment Enforcement & Default Injections

### Issue 1: Forced Bodyweight Injection in Pinecone Retriever (`graph.ts:94-99`)
- **Location**: `src/features/workout-generator/graph.ts` (lines 94–99)
- **Observed Code**:
  ```typescript
  const allowedEquipment = [
    ...(state.equipment || []),
    "bodyweight",
    "none",
    "None",
  ];
  ```
- **Root Cause**: `exerciseRetriever` automatically appends `"bodyweight"`, `"none"`, `"None"` to the allowed equipment array regardless of user choice.
- **Impact**: When `allowedSet` is constructed from `allowedEquipment`, `"bodyweight"` is always present. All bodyweight exercises returned by Pinecone pass the post-retrieval filter and populate `state.exercises` (the RAG menu).

### Issue 2: Hardcoded Fallback to Bodyweight when Pinecone Fails (`graph.ts:125-133`)
- **Location**: `src/features/workout-generator/graph.ts` (lines 125–133)
- **Observed Code**:
  ```typescript
  if (!response.ok) {
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
- **Root Cause**: When the Pinecone HTTP API call fails or encounters network/config issues, `exerciseRetriever` returns a static fallback containing ONLY Pushups (Bodyweight).
- **Impact**: For a user who requested a "Machines-only" plan, an API failure forces the workflow to generate a plan with Pushups as the single available exercise.

### Issue 3: Equipment Resolver & API Route Defaulting (`graph.ts:81` and `route.ts:40`)
- **Location 1**: `src/features/workout-generator/graph.ts` (line 81)
  ```typescript
  return { equipment: state.equipment || ["bodyweight"] };
  ```
- **Location 2**: `src/app/api/generate-plan/route.ts` (line 40)
  ```typescript
  equipment: equipment ? equipment.split(", ") : ["bodyweight"],
  ```
- **Root Cause**: An empty equipment selection defaults to `["bodyweight"]`. While defaulting to bodyweight when NO equipment is provided is appropriate, if the user explicitly provided equipment (e.g., `["Leg Press"]`), empty strings or bad split operations shouldn't trigger bodyweight defaults.

### Issue 4: LLM Plan Builder Prompt Rule Flaws (`graph.ts:191-196`)
- **Location**: `src/features/workout-generator/graph.ts` (lines 191–196)
- **Observed Code**:
  ```typescript
  CRITICAL RULES:
  1. STRICT MENU COMPLIANCE: You MUST ONLY use exercises from the "Available Exercises" JSON menu above. DO NOT invent exercises.
  2. If you need a Cardio or Warmup exercise and none exist in the menu, you MUST select a 'Bodyweight' exercise from the menu, or leave the field empty.
  ```
- **Root Cause**: Rule 2 actively directs the model to pick bodyweight exercises for warmups/cardio, and there is NO rule in the prompt forbidding bodyweight exercises in the `mainWorkout` when "Bodyweight" was NOT in the user's selected equipment.
- **Impact**: Because bodyweight exercises were present in `state.exercises` (due to Issue 1), the LLM freely includes them in `mainWorkout`.

### Issue 5: Safety Evaluator Node Ignored Equipment Compliance (`graph.ts:208-238`)
- **Location**: `src/features/workout-generator/graph.ts` (lines 208–238)
- **Root Cause**: The `safetyEvaluator` node only checks safety (injuries) and RAG menu compliance (whether exercises match the `state.exercises` list). It does NOT check whether exercises in `state.plan` match the user's requested `state.equipment`.
- **Impact**: Plans containing unwanted bodyweight exercises for machines-only requests return `PASS` without triggering a retry.

### Issue 6: UI Checkbox Default & Preset Logic (`workout-plan-form.tsx:342-350, 454-457, 967-986`)
- **Location**: `src/features/workout-plan/workout-plan-form.tsx`
- **Observed Code**:
  ```typescript
  const finalEquip = [
    ...equipmentAliases,
    ...(includeBodyweight ? ["Bodyweight"] : []),
  ];
  ```
- **Impact**: The UI properly passes `includeBodyweight` as separate from `equipmentAliases` when generating the plan string. However, backend nodes (`graph.ts`) ignore this distinction because `exerciseRetriever` forcibly adds `"bodyweight"` anyway!

---

## 3. Evaluation Setup & Flaws in Existing Evals

### Assessment of Existing Evals
1. **`evals/eval-langgraph.ts`**:
   - Runs local LangGraph test cases, but only tests safety retries (pregnancy, bodybuilder).
   - Does NOT test equipment enforcement or machines-only scenarios.

2. **`evals/eval-langsmith.ts`**:
   - FLAWED Evaluator: Line 56 hardcodes:
     ```typescript
     const allowed = [...equipmentInput, "bodyweight", "none"].map(...)
     ```
     This means `ragEquipmentEvaluator` returns `score: 1` (PASS) even when bodyweight exercises are returned for a non-bodyweight equipment request!
   - Uses `@langchain/google-genai` and `langsmith/evaluation`.
   - Has a 15-second delay per example to respect rate limits.

---

## 4. Proposed Fixes & Implementation Plan

### A. Fix `src/features/workout-generator/graph.ts`
1. **Strict Allowed Equipment Array in `exerciseRetriever`**:
   ```typescript
   const userEquipment = state.equipment || [];
   const hasBodyweight = userEquipment.some(
     (e) => e.toLowerCase() === "bodyweight",
   );
   const allowedEquipment = [...userEquipment];
   if (hasBodyweight || userEquipment.length === 0) {
     allowedEquipment.push("bodyweight", "none", "None");
   }
   ```
2. **Context-Aware Pinecone Error Fallback**:
   Instead of static Pushups, return default exercises matching user selection (e.g., Leg Press, Lat Pulldown, Chest Press Machine for Machines; Pushups for Bodyweight).
3. **Enhance `planBuilder` Prompt**:
   - Add explicit rule: "STRICT EQUIPMENT ENFORCEMENT: The 'mainWorkout' MUST strictly use only exercises matching the user's requested equipment. If the user did not select 'Bodyweight', DO NOT include bodyweight exercises in the mainWorkout."
4. **Enhance `safetyEvaluator` Node**:
   - Check equipment compliance for `mainWorkout`: if `state.equipment` excludes bodyweight, reject plans that use bodyweight in `mainWorkout`.

### B. Fix & Expand Evals (`evals/eval-langsmith.ts` and Jest Evals)
1. **Fix `evals/eval-langsmith.ts`**: Remove hardcoded `"bodyweight"` in `ragEquipmentEvaluator`. Only allow bodyweight if present in `inputs.equipment`.
2. **Create Programmatic Evals (`evals/eval-equipment-enforcement.ts` & Jest unit test `__tests__/equipment-enforcement.test.ts`)**:
   - Construct test cases where `equipment: ["Lat Pulldown Machine", "Leg Press Machine", "Chest Press Machine"]`.
   - Assert zero bodyweight exercises in `mainWorkout`.
