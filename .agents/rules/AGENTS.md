# FitSpark Global Rules

1. **Workspace Hygiene**: Keep the main codebase clean and organized. Place all disposable diagnostics under `tests/` and reusable notes or junk files under `scratch/`. Do not clutter the root directory.
2. **Architecture & Standards**: Keep route handlers thin. Put validation and domain logic in feature modules. Maintain modular and easily understandable code.
3. **Version Control**: Do NOT run `git push` without explicit user permission. Always present a list of proposed git commit messages for user approval BEFORE making any commits.
4. **No AI Branding**: Do NOT use AI symbols (e.g., sparkles ✨, robot emojis) or AI-related terminology (e.g., "AI Coach", "Smart Generation", "Powered by AI") in the user interface or codebase.
5. **Code Formatting**: Use **Prettier** for all code formatting to ensure proper indentation and readability.
6. **UI Framework**: Exclusively use `shadcn/Base UI`. Do not install or use competing/overlapping UI frameworks.
7. **API Quotas and Resilience**: Always implement `.withFallbacks()` for Gemini API calls in long-running processes (like LangGraph) to gracefully handle HTTP 429 Rate Limits (e.g., fallback from `gemini-1.5-flash-latest` to `gemini-1.5-flash-8b` or `gemini-1.5-pro`).
8. **Strict User Constraints**: Never silently override a user's explicit equipment or exercise constraint. If a user does not select 'Bodyweight', the system must not generate a Bodyweight-heavy plan.
