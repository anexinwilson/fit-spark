# FitSpark developer notes

## Architecture

- Next.js App Router, TypeScript, React, Tailwind CSS, and shadcn/Base UI.
- Clerk authentication, Stripe subscriptions, Neon PostgreSQL, and Gemini
  Developer API.
- Terraform-managed Cloud Run, Cloud Build, Artifact Registry, Secret Manager,
  and the GCS image bucket.
- A pinned `yuhonas/free-exercise-db` snapshot is ingested by a Cloud Run Job.
  Pinecone stores searchable exercise records and GCS stores their images.
- The equipment page uses one curated 20-item catalog. Each item maps to a
  verified representative image from the pinned dataset through the GCS image
  mirror. It does not silently switch to another data source.

## Equipment API

`GET /api/equipment/search?q={query}&muscle={muscle}&level={level}&category={category}`

The route searches the canonical catalog and returns:

```ts
{
  success: boolean;
  results: EquipmentItem[];
  source: "catalog";
  count: number;
}
```

The server resolves each catalog image path against the required
`RAG_IMAGE_BUCKET` runtime configuration. Missing image mappings throw an
actionable error; there is no silent icon or alternate dataset path.

## RAG ingestion

Run the tests with `npm run rag:test`. Build the RAG image with
`cloudbuild.rag.yaml`, then execute the Terraform-managed Cloud Run Job
`fit-spark-rag-indexer`. Stable Pinecone IDs make normal reruns idempotent.
The pipeline currently indexes 873 records and mirrors 1,746 images.

## Tests

- Public Jest tests live in `__tests__/`.
- Playwright tests live in `e2e/`.
- The gitignored `tests/` directory is for disposable diagnostics only and is
  intentionally excluded from Jest's public test suite.

## Rules

- Keep one authoritative implementation for each concern.
- Do not add silent fallbacks or dual data sources.
- Keep secrets in the single runtime JSON Secret Manager value; do not commit
  credentials.
- Keep route handlers thin and put feature logic in `src/features/` modules.
