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
