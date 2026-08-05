# Backend Graph Execution Survey Report

## 1. Observation

### Key Codebase Artifacts & Locations
- **LangGraph Workflow Definition**: `c:\Users\aen\Music\fit-spark\src\features\workout-generator\graph.ts`
- **Streaming API Route Handler**: `c:\Users\aen\Music\fit-spark\src\app\api\generate-plan\route.ts`
- **Frontend Form & Stream Consumer**: `c:\Users\aen\Music\fit-spark\src\features\workout-plan\workout-plan-form.tsx`
- **LangGraph Evals Runner**: `c:\Users\aen\Music\fit-spark\evals\eval-langgraph.ts`
- **Legacy Non-Streaming API Route Handler**: `c:\Users\aen\Music\fit-spark\src\app\api\generate-workoutplan\route.ts`
- **Gemini Direct Client**: `c:\Users\aen\Music\fit-spark\src\lib\ai\gemini.ts`

### Detailed Code Observations

#### A. State Schema & LLM Setup (`src/features/workout-generator/graph.ts`)
- **State Schema** (lines 8–19):
  ```typescript
  export const WorkoutPlanState = Annotation.Root({
    goal: Annotation<string>(),
    experience: Annotation<string>(),
    daysPerWeek: Annotation<number>(),
    trainingDays: Annotation<string[]>({ default: () => [] }),
    injuries: Annotation<string>(),
    equipment: Annotation<string[]>({ default: () => [] }),
    exercises: Annotation<string[]>({ default: () => [] }),
    plan: Annotation<string | null>({ default: () => null }),
    safetyIssues: Annotation<string[]>({ default: () => [] }),
    retryCount: Annotation<number>({ default: () => 0 }),
  });
  ```
- **LLM Fallback Configuration** (lines 30–53):
  Uses `@langchain/google-genai` `ChatGoogleGenerativeAI` with fallback models:
  - Primary: `gemini-3.6-flash` (temperature: 0.4, maxRetries: 0)
  - Fallback 1: `gemini-3.5-flash` (temperature: 0.4, maxRetries: 0)
  - Fallback 2: `gemini-3.0-flash` (temperature: 0.4, maxRetries: 0)
  - Combined instance: `const llm = primaryLlm.withFallbacks({ fallbacks: [fallback1, fallback2] });`

#### B. Graph Nodes & Transitions (`src/features/workout-generator/graph.ts`)
1. **`equipmentResolver`** (lines 55–60):
   - Resolves equipment list (defaults to `["bodyweight"]` if empty).
2. **`exerciseRetriever`** (lines 62–99):
   - Queries Pinecone REST API vector search (`${config.PINECONE_INDEX_HOST}/records/namespaces/${config.PINECONE_NAMESPACE}/search`) for top 30 matching exercises. Fallback on error returns `["Pushups"]`.
3. **`planBuilder`** (lines 101–132):
   - **`llm.invoke` location 1** (line 130): `const response = await llm.invoke(prompt);`
   - Builds 7-day workout JSON plan restricted to allowed Pinecone RAG exercises.
4. **`safetyEvaluator`** (lines 134–162):
   - **`llm.invoke` location 2** (line 150): `const response = await llm.invoke([{ role: "user", content: prompt }]);`
   - Evaluates plan safety and RAG exercise compliance. Returns `"PASS"` or lists safety issues.
5. **Conditional Retry Routing (`shouldRetry`) & Graph Compilation** (lines 164–187):
   - Transitions: `__start__` → `equipmentResolver` → `exerciseRetriever` → `planBuilder` → `safetyEvaluator` → conditional `shouldRetry`.
   - `shouldRetry` logic: If `safetyIssues.length > 0` and `retryCount < 2`, loops back to `planBuilder`. Otherwise transitions to `END`.

#### C. API Route Handler & SSE Event Emission (`src/app/api/generate-plan/route.ts`)
- Route: `POST /api/generate-plan`
- Stream Initialization (lines 26–30):
  `const events = workoutPlanWorkflow.streamEvents(initialState, { version: "v2" });`
- **Event Dispatching** (lines 33–52):
  - `on_chain_start` (node-level events):
    - `equipmentResolver` → `"Analyzing your profile..."`
    - `exerciseRetriever` → `"Finding the best exercises for you..."`
    - `planBuilder` → `"Building your weekly schedule..."`
    - `safetyEvaluator` → `"Verifying safety and compliance..."`
    Enqueued as `data: {"status": "<msg>"}\n\n`.
  - `on_chat_model_stream` (LLM token streaming):
    Enqueued as `data: {"chunk": "<token_content>"}\n\n`.
  - `on_chain_end` (`name === "LangGraph"`):
    Captures `finalState = event.data.output`.
- Completion Response (lines 58–78):
  - If safety issues remain: Enqueues `data: {"error": "Could not generate a safe plan based on your injuries."}\n\n` and closes stream.
  - If success: Parses plan JSON and enqueues `data: {"complete": true, "workoutPlan": parsedPlan, "exercisesUsed": finalState.exercises}\n\n`.

#### D. Stream Consumption in Frontend (`src/features/workout-plan/workout-plan-form.tsx`)
- Client function `generateWorkoutPlan` (lines 33–81):
  - Sends `POST /api/generate-plan` request.
  - Reads response body stream using `ReadableStreamDefaultReader` and decodes line-by-line (`data: ` SSE format).
  - Updates React states via callbacks:
    - `onStatusUpdate` → updates `generationStatus` string (displayed as card title).
    - `onChunkUpdate` → appends to `generationStream` string (displayed in terminal box).
  - Throws error if `data.error` is present.
- UI Loading View (lines 421–443):
  - Renders `generationStatus` and a monospaced terminal box containing `generationStream`.

#### E. Error Propagation (Rate Limit HTTP 429 & Exceptions)
- **Catch Block in Route Handler** (`src/app/api/generate-plan/route.ts` lines 79–87):
  ```typescript
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
- **Frontend Error Handler**:
  - `generateWorkoutPlan` catches `data.error` and throws Error.
  - TanStack Query mutation (`generation`) sets `isPending = false` and stores error in `generation.error`.
  - Form UI renders alert box with error message (`generation.error?.message`), stopping the loading indicator cleanly.

---

## 2. Logic Chain

1. **Graph Setup & Model Execution**:
   - `workoutPlanWorkflow` is built as a stateful `StateGraph(WorkoutPlanState)`.
   - Node execution sequence is linear (`equipmentResolver` → `exerciseRetriever` → `planBuilder` → `safetyEvaluator`) with a conditional loop back from `safetyEvaluator` to `planBuilder` if safety issues are detected and `retryCount < 2`.
   - LLM calls occur at two distinct nodes (`planBuilder` line 130 and `safetyEvaluator` line 150) using `llm.invoke`.

2. **Event Streaming Architecture**:
   - The API route handler `src/app/api/generate-plan/route.ts` calls `workoutPlanWorkflow.streamEvents(initialState, { version: "v2" })`.
   - LangGraph automatically emits v2 stream events during graph execution:
     - Node start triggers `on_chain_start`, which the API route transforms into friendly status messages (`generationStatus`).
     - Model execution inside nodes emits `on_chat_model_stream` events token-by-token, which the API route forwards as `data: {"chunk": ...}` SSE events to the frontend.

3. **Frontend Presentation**:
   - `WorkoutPlanForm` receives status updates and token chunks via stream callbacks.
   - When active (`generation.isPending`), it renders the loading screen showing the node status heading and the real-time token stream in a terminal-style scroll box.

4. **Error Resilience**:
   - Any error in `streamEvents` (e.g. rate limit HTTP 429 or `RateLimitQuotaExhaustedError`) is caught in the route handler `try/catch` block.
   - The handler formats a user-friendly error message, emits `data: {"error": ...}`, and closes the SSE stream.
   - The frontend receives the `error` event, throws, and TanStack Query transitions out of `isPending` into `isError`, cleanly rendering an inline alert without infinite loading.

---

## 3. Caveats

- **Mock Verification for R2 Requirement**:
  - In `src/features/workout-generator/graph.ts`, `llm.invoke` is live and uses `@langchain/google-genai` with fallbacks.
  - To test `RateLimitQuotaExhaustedError` propagation as required by R2 verification instructions in `ORIGINAL_REQUEST.md`, `llm.invoke` (or the underlying model call) will need to be temporarily mocked/monkey-patched during implementing/testing phase.
- **Legacy Route Coexistence**:
  - `src/app/api/generate-workoutplan/route.ts` is an alternative non-streaming endpoint using `createWorkoutPlan()` in `src/features/workout-plan/server/generate-workout-plan.ts` and direct Gemini API helper `src/lib/ai/gemini.ts`.
  - The UI (`WorkoutPlanForm`) uses `POST /api/generate-plan` for the full streaming LangGraph workflow.

---

## 4. Conclusion

The FitSpark backend workout generation graph architecture is fully structured around a LangGraph workflow (`workoutPlanWorkflow` in `src/features/workout-generator/graph.ts`) connected to a Next.js Server-Sent Events (SSE) streaming route handler (`src/app/api/generate-plan/route.ts`).

- **4 Nodes**: `equipmentResolver`, `exerciseRetriever`, `planBuilder`, `safetyEvaluator`.
- **2 LLM Invocation Points**: Lines 130 and 150 in `graph.ts`.
- **Streaming Pipeline**: `workoutPlanWorkflow.streamEvents()` emits `on_chain_start` (mapped to status messages) and `on_chat_model_stream` (mapped to token chunks) via SSE (`data: {...}`).
- **Error Handling**: Route handler catches 429 rate limit/quota errors, emits SSE error payload, and frontend gracefully displays error alert without hanging.

---

## 5. Verification Method

To independently verify these findings:

1. **Inspect Graph Definition & Node Call Chain**:
   - View `c:\Users\aen\Music\fit-spark\src\features\workout-generator\graph.ts` (lines 8–187).
   - Confirm nodes `equipmentResolver`, `exerciseRetriever`, `planBuilder`, `safetyEvaluator`, state annotation `WorkoutPlanState`, and `llm.invoke` calls at lines 130 and 150.

2. **Inspect API Route Stream Pipeline**:
   - View `c:\Users\aen\Music\fit-spark\src\app\api\generate-plan\route.ts` (lines 26–88).
   - Verify `workoutPlanWorkflow.streamEvents()`, event handling for `on_chain_start`, `on_chat_model_stream`, `on_chain_end`, and the `catch` block handling status 429 / quota errors.

3. **Inspect Client Stream Parsing & UI**:
   - View `c:\Users\aen\Music\fit-spark\src\features\workout-plan\workout-plan-form.tsx` (lines 33–81, 421–443).
   - Verify `generateWorkoutPlan` SSE parser and terminal box rendering logic for `generationStream` and status headers for `generationStatus`.

4. **Run Codebase Quality Checks**:
   - Execute `npx tsc --noEmit` / `npm run typecheck` to verify TypeScript types across the graph and API handler.
