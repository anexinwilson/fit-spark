import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

/**
 * LLM configuration for the workout generation pipeline.
 *
 * Model chain (in order of preference):
 *   1. gemini-3.6-flash  — primary, fastest, highest quality
 *   2. gemini-3.5-flash  — fallback if primary hits rate limit
 *   3. gemini-3.0-flash  — final fallback, different quota bucket
 *
 * .withFallbacks() means LangGraph automatically switches on 429/500
 * without any manual retry logic in the nodes.
 */

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set in environment variables");
}

const makeModel = (model: string) =>
  new ChatGoogleGenerativeAI({ model, temperature: 0.4, apiKey, maxRetries: 0 });

export const llm = makeModel("gemini-3.6-flash").withFallbacks({
  fallbacks: [makeModel("gemini-3.5-flash"), makeModel("gemini-3.0-flash")],
});

export const getPineconeConfig = () => {
  const host = process.env.PINECONE_INDEX_HOST ?? "";
  const apiKey = process.env.PINECONE_API_KEY ?? "";
  const namespace = process.env.PINECONE_NAMESPACE ?? "exercises-v1";
  if (!host || !apiKey) {
    throw new Error("PINECONE_INDEX_HOST and PINECONE_API_KEY must be set");
  }
  return { host, namespace, apiKey };
};
