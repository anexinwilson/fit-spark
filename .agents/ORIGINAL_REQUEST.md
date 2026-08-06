# Original User Request

## 2026-08-04T18:10:27Z

<USER_REQUEST>

# Teamwork Project Prompt — Draft

A beginner-friendly fitness web app that helps new gym-goers understand gym machines, target specific body parts, and generate safe, healthy workout plans without being overwhelmed. The final product must be a premium, highly polished demo suitable for a developer portfolio.

Working directory: c:\Users\aen\Music\fit-spark
Integrity mode: development

## Requirements

### R1. Implement a Premium Fitness UI using Shadcn/Base UI

Deliver a modern, highly aesthetic web interface leveraging the existing Next.js App Router architecture. **CRITICAL:** You must exclusively use the existing `shadcn/Base UI` primitives. Do not install or use competing or overlapping UI frameworks (e.g., Material UI, Chakra, Bootstrap).

### R2. Part 1 Focus: Equipment Search and RAG Retrieval

For this first milestone, focus strictly on wiring up the Pinecone retrieval and building the "Equipment Search / Catalog" experience. Do not build the full workout player yet; we are doing this part by part.

### R3. Strict Branding and Code Constraints

The UI and codebase must not contain any AI-related terminology (e.g., "AI", "Smart", "Intelligent") or AI symbols (e.g., sparkles). The codebase must remain clean, modular, and use Prettier for formatting.

## Acceptance Criteria

### UI and UX Quality

- [ ] The application successfully retrieves equipment data from Pinecone.
- [ ] The equipment search UI looks premium and exclusively uses `shadcn/Base UI`.
- [ ] The rendered HTML contains no instances of the words "AI", "Smart", or sparkle emojis.

### Codebase Health

- [ ] `npm run lint` and `npx prettier --check .` pass with zero errors.
- [ ] `npm run typecheck` passes with zero errors.
      </USER_REQUEST>

## 2026-08-06T03:39:02Z

<USER_REQUEST>
# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Fix and polish the FitSpark workout plan generator's streaming UI. Ensure that the LangGraph operations and AI generation stream are properly displayed without breaking the existing codebase or causing infinite loops.

Working directory: c:\Users\aen\Music\fit-spark
Integrity mode: development

## Requirements

### R1. Completely Redesign Loading Sequence
The agents must completely redesign the loading sequence from scratch to beautifully visualize both the LangGraph node execution and the live AI token streaming, utilizing premium `shadcn/Base UI` aesthetics.

### R2. Robust Error Handling
Gracefully handle all API rate limits (e.g., HTTP 429) and errors. The UI must smoothly transition to an error state without infinite loading loops or raw unhandled exceptions bubbling up to the user.

## Verification Resources
To verify R2, the implementing agents should temporarily mock the `llm.invoke` call in `graph.ts` to throw a `RateLimitQuotaExhaustedError` and visually confirm the UI handles it cleanly before finalizing the implementation.

## Acceptance Criteria

### UI and UX Quality
- [ ] When generation starts, the user sees a premium `shadcn/Base UI` loading screen replacing the form.
- [ ] The current LangGraph node status (e.g. "Building your weekly schedule...") is displayed prominently.
- [ ] A terminal-style box displays the raw LLM token stream in real-time as the plan is generated.
- [ ] If an error occurs, the UI cleanly displays the error message without infinite spinners.

### Codebase Health
- [ ] The codebase must not contain AI-related branding (e.g., "AI", sparkles, "Powered by AI") per existing project rules.
- [ ] `npm run lint` and `npx prettier --check .` pass with zero errors.
</USER_REQUEST>

## 2026-08-06T18:07:46Z

<USER_REQUEST>
# Teamwork Project Prompt — Draft

> Status: Launched
> Goal: Fix Equipment Enforcement, API Fallbacks, and Enhance UI Streaming

Refine the FitSpark workout generation backend and loading UI. The goal is to optimize the LangGraph workflow, implement model fallbacks for rate limits, fix equipment constraints (so users don't get bodyweight exercises if they didn't select them), and remove the distracting terminal-style streaming from the loading UI.

Working directory: c:\Users\aen\Music\fit-spark
Integrity mode: development

## Requirements

### R1. Optimize LangGraph and Implement Model Fallbacks
The current LangGraph setup uses `gemini-flash-latest`. You must implement the LangChain `.withFallbacks()` method (or equivalent) in `graph.ts` so that if `gemini-flash-latest` encounters a rate limit (HTTP 429), it gracefully falls back to a different model (e.g., `gemini-1.5-flash-8b` or `gemini-1.5-pro`). Additionally, review the LangGraph nodes to see if any redundant LLM calls can be collapsed to make generation faster and use fewer tokens.

### R2. Fix Equipment Enforcement (No Unwanted Bodyweight) & Add Evals
The user reported receiving a purely bodyweight plan despite not selecting "Bodyweight" or "Cardio". Ensure that if the user doesn't explicitly select Bodyweight, the fallback logic doesn't forcefully inject it for the main workout. Fix any bugs where an empty equipment selection defaults to `["bodyweight"]` under the hood. **CRITICAL:** You must write and run LangSmith/LangChain evals (using the newly installed eval skills) to programmatically confirm that when only machines are selected, the generated plan strictly uses machines and does not hallucinate bodyweight exercises for the main workout.

### R3. Enhance Terminal Stream for Interactivity
The user requested that the "Live Token Stream Terminal" in `WorkoutPlanLoading` be updated to be more interactive and agentic. Instead of just streaming raw JSON tokens or basic logs, update the backend (`graph.ts` and `route.ts`) and the UI to stream rich, interactive updates detailing exactly what the agent is doing (e.g., "Agent checking RAG...", "Filtering 50 exercises from Pinecone...", "Building node...", "Evaluating safety..."). Make the UI terminal feel like a live, intelligent agent at work.

## Acceptance Criteria

### Codebase Health & Execution
- [ ] The `graph.ts` implementation includes explicit fallback models for the primary LLM to handle quota limits.
- [ ] If a user generates a plan with only "Machines", the resulting plan does not contain bodyweight exercises for the main workout.
- [ ] You have written and successfully run programmatic evals proving that equipment constraints are strictly followed.
- [ ] The `WorkoutPlanLoading` UI streams rich, interactive agentic logs (e.g., "Agent checking RAG...", etc.) instead of raw JSON.
- [ ] `npm run lint` and `npx prettier --check .` pass with zero errors.
</USER_REQUEST>

