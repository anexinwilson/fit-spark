import { requireServerEnvironment } from "@/lib/server-env";

const GEMINI_API_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";

interface GeminiPart {
  text?: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
    finishReason?: string;
  }>;
  error?: {
    message?: string;
  };
}

export class GeminiApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "GeminiApiError";
  }
}

/**
 * Generates a JSON response with the Gemini Developer API (Google AI Studio).
 * This adapter deliberately contains all provider-specific HTTP details so API
 * routes do not depend on a vendor SDK.
 */
export async function generateGeminiJson(prompt: string): Promise<string> {
  const apiKey = requireServerEnvironment("GEMINI_API_KEY");
  const model = requireServerEnvironment("GEMINI_MODEL");

  const response = await fetch(
    `${GEMINI_API_BASE_URL}/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          // Gemini reasoning tokens count against this limit. Keep enough room
          // for both the model's reasoning and the complete workout JSON.
          maxOutputTokens: 4096,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );

  const body = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    throw new GeminiApiError(
      body.error?.message ?? "Gemini request failed.",
      response.status,
    );
  }

  const candidate = body.candidates?.[0];

  if (candidate?.finishReason === "MAX_TOKENS") {
    throw new GeminiApiError(
      "Gemini reached its output limit before returning a complete JSON response.",
      502,
    );
  }

  const content = candidate?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!content) {
    throw new GeminiApiError("Gemini returned an empty response.");
  }

  return content;
}
