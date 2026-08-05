import "cross-fetch/polyfill";

process.env.FITSPARK_RUNTIME_CONFIG_JSON = JSON.stringify({
  CLERK_SECRET_KEY: "test-clerk-secret",
  CLERK_ENCRYPTION_KEY: "test-clerk-encryption-key",
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_clerk",
  DATABASE_URL: "postgresql://test:test@localhost:5432/test",
  GEMINI_API_KEY: "test-gemini-key",
  GEMINI_MODEL: "gemini-flash-latest",
  STRIPE_SECRET_KEY: "sk_test_stripe",
  STRIPE_WEBHOOK_SECRET: "whsec_test",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_stripe",
  STRIPE_PRICE_WEEKLY: "price_week",
  STRIPE_PRICE_MONTHLY: "price_month",
  STRIPE_PRICE_YEARLY: "price_year",
  NEXT_PUBLIC_BASE_URL: "http://test.local",
  PINECONE_API_KEY: "test-pinecone-key",
  PINECONE_INDEX_NAME: "fitspark-exercises-index",
  PINECONE_INDEX_HOST: "https://test-index.pinecone.io",
  PINECONE_NAMESPACE: "exercises-v1",
  RAG_IMAGE_BUCKET: "fitspark-test-rag-images",
});

if (!("json" in Response)) {
  Object.defineProperty(Response, "json", {
    configurable: true,
    value: (data: unknown, init?: ResponseInit) =>
      new Response(JSON.stringify(data), {
        headers: { "content-type": "application/json" },
        ...init,
      }),
  });
}

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
