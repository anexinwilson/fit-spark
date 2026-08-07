import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { getRuntimeConfig } from "../runtime-config";

/**
 * LLM configuration for the workout generation pipeline.
 */

const getGeminiKey = () => {
  try {
    return getRuntimeConfig().GEMINI_API_KEY;
  } catch (e) {
    return "dummy-key-for-build";
  }
};

const makeModel = (model: string) =>
  new ChatGoogleGenerativeAI({ model, temperature: 0.4, apiKey: getGeminiKey(), maxRetries: 0 });

export const llm = makeModel("gemini-3.6-flash").withFallbacks({
  fallbacks: [makeModel("gemini-3.5-flash"), makeModel("gemini-3.0-flash")],
});

export const getPineconeConfig = () => {
  try {
    const config = getRuntimeConfig();
    return {
      host: config.PINECONE_INDEX_HOST,
      namespace: config.PINECONE_NAMESPACE,
      apiKey: config.PINECONE_API_KEY,
    };
  } catch (e) {
    return { host: "dummy-host", namespace: "exercises-v1", apiKey: "dummy-key" };
  }
};
