# E2E Test Infra: fit-spark

## Test Philosophy

- Opaque-box, requirement-driven. No dependency on internal implementation design.
- Methodology: Category-Partition + Boundary Value Analysis + Pairwise + Real-World Workload Testing.

## Feature Inventory

| #   | Feature                                      | Source (requirement)                  | Tier 1 | Tier 2 | Tier 3 |
| --- | -------------------------------------------- | ------------------------------------- | :----: | :----: | :----: |
| 1   | Equipment RAG Retrieval                      | ORIGINAL_REQUEST §R2                  |   5    |   5    |   ✓    |
| 2   | Premium Equipment Search UI                  | ORIGINAL_REQUEST §R1, §R2             |   5    |   5    |   ✓    |
| 3   | AI Branding Compliance (Zero AI terms/icons) | ORIGINAL_REQUEST §R3                  |   5    |   5    |   ✓    |
| 4   | Codebase & Route Health                      | ORIGINAL_REQUEST §Acceptance Criteria |   5    |   5    |   ✓    |

## Test Architecture

- **Test Runner**: `@playwright/test` (`npm run test:e2e`)
- **Invocation**: `npx playwright test`
- **Environment**: Local Next.js dev server via `scripts/start-local.mjs` (port 3000)

## Real-World Application Scenarios (Tier 4)

| #   | Scenario                                                                                                                                                                                              | Features Exercised                             | Complexity |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ---------- |
| 1   | User searches for gym machines by query & target muscle (e.g. "leg press", "lat pulldown"), filters by difficulty, views details modal with instructions, and navigates seamlessly                    | Equipment Search, RAG Retrieval, UI Primitives | Medium     |
| 2   | Automated auditor checks all public page routes (`/`, `/equipment`, `/subscribe`, `/workoutplan`, `/sign-in`, `/sign-up`) for forbidden AI words ("AI", "Smart", "Intelligent") or Sparkles icon SVGs | AI Branding Compliance, UI Audit               | Medium     |

## Coverage Thresholds

- Tier 1: ≥5 per feature (20 test cases)
- Tier 2: ≥5 per feature (20 boundary & edge cases)
- Tier 3: Pairwise coverage of feature interactions (5 combination cases)
- Tier 4: ≥5 realistic application scenarios (5 E2E browser flows)
