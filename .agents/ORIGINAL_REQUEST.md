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
