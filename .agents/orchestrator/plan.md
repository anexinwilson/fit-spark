# Plan — FitSpark Optimization & Interactive Stream

## Milestones
- **Survey**: Map codebase, graph setup, loading components, route handlers, and eval capabilities.
- **M1: LangGraph Optimization & Fallback Models (R1)**: Add model fallback via `.withFallbacks()` in `graph.ts`, collapse redundant LLM calls across nodes.
- **M2: Equipment Enforcement & Programmatic Evals (R2)**: Fix empty equipment defaults, eliminate unwanted bodyweight exercises for non-bodyweight selections, write and execute LangSmith/LangChain programmatic evals.
- **M3: Interactive Agentic Loading Stream (R3)**: Update backend (`graph.ts`, `route.ts`) and frontend (`WorkoutPlanLoading`) to stream rich, interactive status logs.
- **M4: E2E Verification & Health Check**: Run linter, Prettier formatting check, typecheck, and ensure global rule compliance.
