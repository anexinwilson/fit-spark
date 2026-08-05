# Pinecone & RAG Data Pipeline Survey Report

## 1. Observation

Direct observations from inspecting the codebase at `c:\Users\aen\Music\fit-spark`:

1. **Pinecone SDK & Dependencies**:
   - `package.json` lines 22–44: The official `@pinecone-database/pinecone` npm SDK is **not** listed under `dependencies` or `devDependencies`.
   - Direct HTTP fetch is used for Pinecone REST API operations:
     - Header `Api-Key`: Pinecone API Key
     - Header `X-Pinecone-Api-Version`: `"2026-04"`
     - Upsert endpoint: `${PINECONE_INDEX_HOST}/records/namespaces/${PINECONE_NAMESPACE}/upsert` (`Content-Type: application/x-ndjson`)
     - Search endpoint: `${PINECONE_INDEX_HOST}/records/namespaces/${PINECONE_NAMESPACE}/search` (`Content-Type: application/json`)

2. **Configuration & Environment Variables**:
   - `src/lib/runtime-config.ts` lines 17–20: Validates 4 required Pinecone configuration keys via Zod schema inside `FITSPARK_RUNTIME_CONFIG_JSON`:
     - `PINECONE_API_KEY` (string, min 1)
     - `PINECONE_INDEX_NAME` (string, min 1)
     - `PINECONE_INDEX_HOST` (URL format)
     - `PINECONE_NAMESPACE` (string, min 1)
   - `.env.local` line 1: Contains live dev configuration:
     - `PINECONE_API_KEY`: `"pcsk_5bstji_TLAMqX99QkBGZVwsrcSHYQP9V7Q9GBCRoijhhUb4D34wv68s4CiFnKdvUFkXJU9"`
     - `PINECONE_INDEX_NAME`: `"fitspark-exercises-index"`
     - `PINECONE_INDEX_HOST`: `"https://fitspark-exercises-index-loqpgbx.svc.aped-4627-b74a.pinecone.io"`
     - `PINECONE_NAMESPACE`: `"exercises-v1"`
   - `jest.setup.ts` lines 17–20: Configures mock/test values for Jest unit test environment.

3. **Embedding Models / Vector Generation Setup**:
   - `scripts/rag/ingest-exercises.mjs` lines 294–300 & `tests/rag-gemini-smoke.mjs` lines 19–22: No external embedding SDK (OpenAI, HuggingFace, etc.) is configured or used.
   - Pinecone Integrated Inference / Integrated Embedding is utilized. Search queries supply a text string in the query payload (`{ query: { inputs: { text: "<query_string>" }, top_k: N }, fields: [...] }`), and Pinecone handles text-to-vector embedding internally.

4. **Equipment & Exercise Data Schema, Seed Scripts, & Metadata**:
   - Ingestion Script: `scripts/rag/ingest-exercises.mjs` (run via `npm run rag:ingest`, unit tested via `npm run rag:test`).
   - Data Source: `https://raw.githubusercontent.com/yuhonas/free-exercise-db/b0eed061e1c832b3ed815fbaa4b45b3cdc14df49/dist/exercises.json` (800+ exercise records).
   - Image Bucket & Mirroring: Images are mirrored to Google Cloud Storage bucket (`FITSPARK_RAG_IMAGE_BUCKET` = `fitspark-504419-fit-spark-rag-images`). If bucket environment variable is omitted in dev, raw GitHub URLs (`IMAGE_BASE_URL`) serve as fallback.
   - Metadata Record Structure (`normalizeExercises` function, `scripts/rag/ingest-exercises.mjs` lines 77–141):
     - `_id`: String formatted as `exercise:<id>` (e.g., `exercise:assisted-pull-up`)
     - `text`: Structured text combining Exercise Name, Level, Category, Equipment Type/Name/Aliases, Primary/Secondary Muscles, and step-by-step instructions.
     - `name`: Exercise display name (string)
     - `source_id`: Raw ID from source database
     - `level`: Difficulty level (`beginner`, `intermediate`, `expert`, `unspecified`)
     - `category`: Workout category (`strength`, `cardio`, `stretching`, etc.)
     - `equipment` / `equipment_type`: Normalized equipment key (`machine`, `dumbbell`, `barbell`, `cable`, `body weight`, `kettlebells`, `bands`, `e-z curl bar`, `exercise ball`, `foam roll`, `medicine ball`, `other`)
     - `equipment_name`: Human-readable equipment name (`Ab Crunch Machine`, `Dumbbell`, `Barbell`, `Cable machine`, `Bodyweight`, etc.)
     - `equipment_aliases`: Array of search alias strings (e.g., `["ab crunch machine", "gym machine", "exercise machine", "ab crunch"]`)
     - `primary_muscles`: Comma-separated target muscles (string)
     - `secondary_muscles`: Comma-separated supporting muscles (string)
     - `source`: `"yuhonas/free-exercise-db"`
     - `source_url`: URL of original exercise JSON database
     - `source_image_urls` & `image_urls`: String arrays containing image URLs (GCS bucket or GitHub raw URLs)

5. **Server Actions / API Routes for Vector Search**:
   - `find_by_name` and `grep_search` across `src/`: Currently, **no** API routes or Server Actions exist in `src/app/api/` or `src/features/` to expose vector search or equipment catalog queries to the frontend client.
   - Existing API routes in `src/app/api/`: `check-subscription`, `checkout`, `create-profile`, `generate-workoutplan`, `profile/...`, `webhook`.

6. **Fallback Logic / Mock Data Strategy**:
   - Currently, if Pinecone credentials are missing or API requests fail, `parseRuntimeConfig` throws an Error or `fetch` throws a network/HTTP exception.
   - There is no mock equipment dataset or fallback search handler in `src/` to serve exercise catalog requests if Pinecone is unreachable.

7. **Smoke Test Execution Results**:
   - `npm run typecheck`: Passed with zero errors (code exit 0).
   - `npm run lint`: Passed with zero errors (code exit 0).
   - `npm run rag:test`: Passed all 3 test cases (`node --test scripts/rag/ingest-exercises.test.mjs`).
   - `node tests/rag-gemini-smoke.mjs`: Successfully executed against live Pinecone index (`fitspark-exercises-index`), retrieved 3 matches, and synthesized an answer via Gemini (`gemini-flash-latest`).

---

## 2. Logic Chain

1. **SDK Choice & API Interaction**:
   - Direct HTTP fetch is chosen over `@pinecone-database/pinecone` SDK because Pinecone 2026-04 Integrated Inference APIs allow direct NDJSON upserts and JSON search queries without heavy SDK dependencies.
   - Evidence: `scripts/rag/ingest-exercises.mjs` uses `fetch` to POST to `/records/namespaces/{namespace}/upsert` and `/records/namespaces/{namespace}/search`.

2. **Embedding Workflow**:
   - Pinecone serverless index performs text embedding automatically on fields provided under `inputs: { text: "..." }`. No separate embedding model invocation or key is required.
   - Evidence: `tests/rag-gemini-smoke.mjs` sends `{ query: { inputs: { text: "beginner ab crunch machine" }, top_k: 3 } }` directly to Pinecone search endpoint, returning top-k matching exercise records with similarity scores.

3. **Current Equipment Retrieval Gap**:
   - `src/features/workout-plan/server/generate-workout-plan.ts` uses Gemini to generate workout plans but does not currently query Pinecone vector search.
   - There are no existing server actions or API endpoints for the Equipment Search / Catalog UI (Milestone 1 requirement R2).

4. **Required Equipment Search Implementation Plan**:
   - Need a server feature module (e.g. `src/features/equipment/`) with a server action or route handler (e.g. `src/app/api/equipment/search/route.ts`).
   - Must implement Pinecone vector search REST query targeting `${PINECONE_INDEX_HOST}/records/namespaces/${PINECONE_NAMESPACE}/search`.
   - Must include fallback logic: if Pinecone credentials are missing, invalid, or API requests fail, fall back gracefully to local keyword filtering over a fallback exercise set.

---

## 3. Caveats

- **Network Dependency**: Live Pinecone searches require internet access and active Pinecone service (`PINECONE_INDEX_HOST`). In offline or restricted network environments, queries will fail unless local fallback data is provided.
- **Image URL Hosting**: In production, images rely on Google Cloud Storage bucket (`FITSPARK_RAG_IMAGE_BUCKET`). In local development without GCS bucket credentials, image URLs fall back to GitHub raw URLs.
- **Pinecone API Version**: Pinecone REST endpoints specify `X-Pinecone-Api-Version: 2026-04`. Any changes to Pinecone API specs should be verified against this version.

---

## 4. Conclusion

The Pinecone & RAG data pipeline in `fit-spark` is fully configured at the infrastructure and ingestion levels, utilizing Pinecone Integrated Inference over direct REST API (v2026-04). Seed data is normalized from `free-exercise-db` (800+ exercises) with rich metadata (equipment names, equipment type, aliases, primary/secondary muscles, difficulty level, GCS mirrored images).

However, the application layer in `src/` currently lacks:

1. Server actions or API route handlers for Equipment Search & RAG retrieval.
2. Graceful fallback logic/mock data strategy when Pinecone credentials are missing or API calls fail.

Implementing a dedicated `src/features/equipment/` module with Pinecone vector retrieval and a local mock fallback will satisfy all Milestone 1 RAG equipment search requirements.

---

## 5. Verification Method

Independent commands to verify Pinecone & RAG pipeline state:

1. **TypeScript Typecheck**:
   ```bash
   npm run typecheck
   ```
2. **ESLint Check**:
   ```bash
   npm run lint
   ```
3. **RAG Unit Test**:
   ```bash
   npm run rag:test
   ```
4. **Pinecone & Gemini RAG Integration Smoke Test**:
   ```bash
   node tests/rag-gemini-smoke.mjs
   ```
5. **Inspect Files**:
   - `scripts/rag/ingest-exercises.mjs`
   - `src/lib/runtime-config.ts`
   - `tests/rag-gemini-smoke.mjs`
   - `.env.local`
