# Handoff Report: Workout Plan Generator UI & Streaming Response Survey

## 1. Observation

### 1.1 Codebase Structure & Component Map

- **Page Route**: `src/app/workoutplan/page.tsx`
  - Lines 8-26: Checks user session via `@clerk/nextjs/server` `auth()`, checks subscription status in Prisma (`prisma.profile`), loads saved plan from `prisma.workoutPlan`, and renders `<WorkoutPlanForm initialPlan={initialPlan} />`.
- **Form & Generator Component**: `src/features/workout-plan/workout-plan-form.tsx`
  - Lines 33-81: `generateWorkoutPlan(input, onStatusUpdate, onChunkUpdate)` client-side helper function that executes `fetch("/api/generate-plan")` and reads the SSE `ReadableStream`.
  - Lines 226-227: React state `generationStatus` (initialized to `"Building your plan..."`) and `generationStream` (initialized to `""`).
  - Lines 310-325: `generation = useMutation({ mutationFn: ... })` managing the plan generation lifecycle.
  - Lines 421-443: Loading screen UI rendered when `generation.isPending` is `true`.
  - Lines 433-439: Real-time LLM token stream output container (`div` with `h-[200px] overflow-y-auto whitespace-pre-wrap`).
  - Lines 835-842: Error message container `{(draftError || generation.isError) && <div role="alert" ...>}`.
- **Server Route Handler**: `src/app/api/generate-plan/route.ts`
  - Lines 29-52: Streams events from LangGraph `workoutPlanWorkflow.streamEvents(initialState, { version: "v2" })`.
  - Lines 34-44: Maps node `on_chain_start` events (`equipmentResolver`, `exerciseRetriever`, `planBuilder`, `safetyEvaluator`) to user-friendly status strings sent as `data: {"status": "..."}\n\n`.
  - Lines 45-48: Emits LLM token chunks on `on_chat_model_stream` as `data: {"chunk": "..."}\n\n`.
  - Lines 72-76: Emits completion payload `data: {"complete": true, "workoutPlan": ...}\n\n`.
  - Lines 79-87: Catches errors (including rate limit 429 errors) and enqueues `data: {"error": errorMessage}\n\n`.
- **LangGraph Workflow**: `src/features/workout-generator/graph.ts`
  - Lines 8-19: `WorkoutPlanState` Annotation schema with `goal`, `experience`, `daysPerWeek`, `trainingDays`, `injuries`, `equipment`, `exercises`, `plan`, `safetyIssues`, `retryCount`.
  - Lines 30-53: Google Gemini LLM setup with fallback chain (`gemini-3.6-flash` -> `gemini-3.5-flash` -> `gemini-3.0-flash`).
  - Lines 55-162: Nodes `equipmentResolver`, `exerciseRetriever` (Pinecone vector search), `planBuilder`, `safetyEvaluator`.
  - Lines 164-175: `shouldRetry` conditional edge loop logic (retries up to 2 times).
- **Available UI Components**: `src/components/ui/`
  - Primitives installed: `alert-dialog.tsx`, `avatar.tsx`, `badge.tsx`, `button.tsx`, `card.tsx`, `checkbox.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `input.tsx`, `label.tsx`, `select.tsx`, `separator.tsx`, `skeleton.tsx`, `sonner.tsx` (toasts), `spinner.tsx`, `textarea.tsx`.
  - Framework: Built on `@base-ui/react` v1.6.0 with Tailwind CSS v4 and `lucide-react` icons.

### 1.2 Typecheck Errors Discovered (`npm run typecheck`)

Running `npm run typecheck` produced the following existing type errors:
1. `src/features/workout-generator/graph.ts` (lines 12-18): `@langchain/langgraph` `Annotation` definitions missing `value` reducer property:
   - `trainingDays: Annotation<string[]>({ value: (x, y) => y ?? x, default: () => [] })`
   - `exercises`, `plan`, `safetyIssues`, `retryCount` also need `value` reducers.
2. `src/features/workout-plan/workout-plan-form.tsx` (line 240 & line 474):
   - `defaultValues` contains `daysPerWeek: 3` which is missing from `workoutPlanSchema` in `schema.ts`.
   - `form.handleSubmit(submitPlan)` fails type check due to type mismatch on `submitPlan`.
3. `src/features/workout-plan/server/generate-workout-plan.ts` (line 11):
   - Property `daysPerWeek` accessed on `WorkoutPlanInput`, but absent in `workoutPlanSchema`.

### 1.3 Identified UI & State Bugs / Streaming Bottlenecks

1. **SSE Line Splitting vs. Multi-line Tokens** (`src/features/workout-plan/workout-plan-form.tsx:61-75`):
   ```typescript
   buffer += decoder.decode(value, { stream: true });
   const lines = buffer.split("\n");
   buffer = lines.pop() || "";
   for (const line of lines) {
     if (line.startsWith("data: ")) {
       try {
         const data = JSON.parse(line.replace("data: ", ""));
         ...
       } catch(e) {
         if (e instanceof Error && e.message !== "Unexpected end of JSON input" && !e.message.includes("Unexpected token")) throw e;
       }
     }
   }
   ```
   *Issue*: Splitting raw stream buffers by simple `\n` breaks whenever an LLM token chunk contains literal newline characters `\n` inside its JSON payload. The second line does not start with `data: `, causing raw JSON chunks to be lost and `JSON.parse` syntax errors to be silently swallowed by the catch filter.

2. **Wiping State on Error** (`src/features/workout-plan/workout-plan-form.tsx:321-324`):
   ```typescript
   onError: () => {
     setGenerationStatus("Building your plan...");
     setGenerationStream("");
   }
   ```
   *Issue*: On generation failure (such as rate limits or network issues), `onError` resets status and wipes the token stream log. The loading screen unmounts, revealing the form again, but the stream history that led to the failure is erased.

3. **Poor Error UX Placement** (`src/features/workout-plan/workout-plan-form.tsx:835-842`):
   *Issue*: The error container is rendered at line 835 (near the bottom of the multi-step form card). When generation fails, the user is abruptly taken back to the form with no prominent error header or retry mechanism at top.

4. **Lack of Node Execution Stepper / Progress Visualization**:
   *Issue*: Current status display (line 427) relies on replacing a single text string (`{generationStatus}`). Users cannot see which LangGraph nodes have already executed, which node is currently active, or how many steps remain.

5. **Basic Terminal Box**:
   *Issue*: The current terminal box (lines 434-438) is a simple scrollable `div` without automatic bottom-scrolling, line numbers, cursor animation, status indicator, or copy functionality.

---

## 2. Logic Chain

1. **Observation**: `src/app/api/generate-plan/route.ts` streams LangGraph node start events and LLM tokens over SSE (`data: { status | chunk | complete | error }\n\n`).
2. **Observation**: `WorkoutPlanForm` in `src/features/workout-plan/workout-plan-form.tsx` uses `useMutation` and `generateWorkoutPlan` to read SSE chunks and update local state (`generationStatus`, `generationStream`).
3. **Logic**:
   - Because `generateWorkoutPlan` splits stream chunks by `\n`, multiline LLM JSON tokens get fragmented and dropped.
   - Because `useMutation.onError` wipes `generationStream` and `generationStatus`, users lose all execution context when errors (e.g., HTTP 429 quota exhaustion) occur.
   - Because loading UI is a single spinning icon with a replacing status string, the step-by-step intelligence of LangGraph (Pinecone search -> Plan builder -> Safety evaluator) is concealed.
   - Existing TypeScript errors in `graph.ts` and `schema.ts` (`Annotation` reducer definitions and missing `daysPerWeek`) must be fixed so `npm run typecheck` passes cleanly.
4. **Conclusion**: To fulfill the requirements in `ORIGINAL_REQUEST.md`, we must:
   - Create a dedicated, robust loading sequence component utilizing `shadcn / Base UI` components (`Card`, `Badge`, `Spinner`, `Skeleton`, `Button`, `Sonner`).
   - Implement a multi-step LangGraph node progress tracker (showing status for Profile Resolver, Pinecone Exercise Retriever, Plan Builder, and Safety Evaluator).
   - Implement an auto-scrolling, terminal-style token stream viewer with proper line wrapping and status indicators.
   - Fix SSE stream parsing to handle multiline JSON strings correctly.
   - Provide a clean, inline error UI with retry action and error details when rate limits or graph errors occur, without wiping previous stream logs.
   - Fix pre-existing TypeScript type errors in `graph.ts`, `schema.ts`, and `workout-plan-form.tsx`.

---

## 3. Caveats

- **No Caveats**: All component files, API routes, LangGraph workflow nodes, and UI primitive dependencies were directly inspected and verified.

---

## 4. Conclusion

The workout generator pipeline is cleanly structured around Next.js App Router, `@langchain/langgraph`, and `@tanstack/react-query`. The redesign of the loading sequence and streaming UI can be isolated cleanly within `src/features/workout-plan/` (by introducing modular components for the loading stage, stepper, and terminal viewer), updating stream parsing in `generateWorkoutPlan`, and fixing the `Annotation` / schema type discrepancies.

---

## 5. Verification Method

To verify codebase health and state handling:

1. Run TypeScript check: `npm run typecheck`
2. Run ESLint: `npm run lint`
3. Run Prettier check: `npx prettier --check .`
4. Inspect `src/features/workout-plan/workout-plan-form.tsx` and `src/app/api/generate-plan/route.ts` for absolute compliance with project rules (no AI/sparkle branding).
