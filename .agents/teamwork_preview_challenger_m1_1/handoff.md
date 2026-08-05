VERDICT: REQUEST_CHANGES

# Handoff Report — Equipment RAG Backend Adversarial Challenge

## Observation

1. **Limit Bounds Handling (Negative Limit)**:
   - Command: `npx jest --testMatch "<rootDir>/tests/**/*.test.ts"`
   - Execution of `searchEquipment({ limit: -5 })` returns 11 items (`count: 11`) out of a 16-item fallback dataset (`src/features/equipment/search-equipment.ts:93, 194`).
   - Line reference (`src/features/equipment/search-equipment.ts:93, 194`):
     `const finalResults = filtered.slice(0, limit);`
     `return filtered.slice(0, limit);`
   - In JavaScript, `Array.prototype.slice(0, -5)` extracts items from index 0 up to `length - 5`. Passing `limit: -5` does not clamp to `0` or return an empty set / error; instead it returns 11 items.

2. **Limit Bounds Handling (`limit=0` via API route)**:
   - Command: `GET /api/equipment/search?limit=0`
   - Line reference (`src/app/api/equipment/search/route.ts:12-13`):
     ```ts
     const parsedLimit = limitParam ? Number.parseInt(limitParam, 10) : undefined;
     const limit = parsedLimit && !Number.isNaN(parsedLimit) ? parsedLimit : undefined;
     ```
   - When `limitParam = "0"`, `parsedLimit` is `0`. In JavaScript, `0 && true` evaluates to `0` (falsy), causing `limit` to become `undefined`.
   - `searchEquipment` receives `{ limit: undefined }` and applies default `limit = 10`. Requesting `?limit=0` returns 10 items instead of 0.

3. **Pinecone 0-Hit Fallback Masking**:
   - Line reference (`src/features/equipment/search-equipment.ts:60`):
     `if (Array.isArray(rawHits) && rawHits.length > 0)`
   - When Pinecone API responds HTTP 200 OK with `hits: []` (0 vector matches), `searchEquipment` bypasses returning `source: "pinecone"` with `results: []` and instead executes `searchFallbackEquipment`, returning fallback items with `source: "fallback"`.

4. **Category & Level Exact Match vs Muscle Partial Substring Match**:
   - Line reference (`src/features/equipment/search-equipment.ts:124-149`):
     - `muscle` filter uses `.includes(searchMuscle)` (partial match, e.g. `muscle=chest` matches `"pectoralis major"`).
     - `category` filter uses `item.category.toLowerCase() === searchCategory` (exact match).
     - `level` filter uses `item.level.toLowerCase() === searchLevel` (exact match).
   - Passing `category=leg` (singular) returns 0 results (`count: 0`), whereas `category=Legs` returns matching items.

5. **Passing Resilience Tests**:
   - Empty queries (`""`), whitespace (`"   "`), SQL injection strings (`' OR '1'='1`), XSS payloads (`<script>alert(1)</script>`), special characters (`!@#$%^&*()`), and Unicode/emoji strings (`🏋️‍♂️ Dumbbell 哑铃`) are safely handled without throwing or crashing.
   - Pinecone API HTTP 500, 403, 404, network connection timeouts, and malformed JSON errors gracefully fall back to local dataset with `source: "fallback"` and `success: true`.

## Logic Chain

1. `limit: -5` bug:
   - `route.ts` parses `"-5"` to `-5`. `-5 && !isNaN(-5)` evaluates to `-5` (truthy).
   - `searchEquipment({ limit: -5 })` runs `filtered.slice(0, -5)`.
   - In JS array semantics, `.slice(0, -5)` returns all items except the last 5 (16 - 5 = 11).
   - Conclusion: Negative limit values slice from the end of the array rather than validating or clamping inputs to `>= 0`.

2. `limit: 0` bug:
   - `route.ts` parses `"0"` to `0`. `0 && !isNaN(0)` evaluates to `0`.
   - In JavaScript `Boolean(0)` is `false`, so `limit` becomes `undefined`.
   - Function default parameter `limit = 10` is triggered in `searchEquipment`.
   - Conclusion: An explicit client request for 0 results returns 10 items instead of 0.

3. Pinecone empty hits handling:
   - `searchEquipment` evaluates `rawHits.length > 0`.
   - If Pinecone vector index returns 0 hits, execution falls through to fallback dataset.
   - Conclusion: Successful 0-match vector searches are obscured and replaced by fallback results.

## Caveats

- Pinecone API key was mocked via Jest unit test suite (`tests/equipment-rag-adversarial.test.ts`); live Pinecone endpoint integration was tested against fetch mocks simulating HTTP 200, 403, 404, 500, and ETIMEDOUT network failures.
- No modifications were made to implementation code per review-only constraints.

## Conclusion

The Milestone 1 Equipment RAG Backend handles edge-case search query strings, injection strings, and Pinecone network/API failures safely. However, input validation for limit parameters (`limit=0` resetting to 10; `limit=-5` returning 11 items via `Array.prototype.slice`) and 0-hit Pinecone fallback behavior require correction before approval.

**Key Actionable Changes Required**:
1. Fix `route.ts` limit parsing: check `parsedLimit !== undefined && !Number.isNaN(parsedLimit)` and clamp `Math.max(0, parsedLimit)` or sanitize `limit >= 0`.
2. Fix `search-equipment.ts` limit slicing: sanitize/clamp `Math.max(0, limit)` so negative limits do not slice from array tail.
3. Fix Pinecone empty hits behavior: when Pinecone returns HTTP 200 OK with `hits: []`, return `{ success: true, results: [], source: "pinecone", count: 0 }`.

## Verification Method

1. Run the adversarial stress test suite created under `tests/`:
   `npx jest --testMatch "<rootDir>/tests/**/*.test.ts"`
2. Verify all test cases pass and confirm bug assertions for `limit=0` and `limit=-5`.
