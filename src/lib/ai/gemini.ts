const GEMINI_API_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_GEMINI_MODEL = "gemini-flash-latest";

interface GeminiPart {
  text?: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
  error?: {
    message?: string;
  };
}

export class GeminiApiError extends Error {
  constructor(message: string, readonly status?: number) {
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
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL;

  if (!apiKey) {
    throw new GeminiApiError("GEMINI_API_KEY is not configured.");
  }

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
          maxOutputTokens: 1500,
          responseMimeType: "application/json",
        },
      }),
      signal: AbortSignal.timeout(30_000),
    }
  );

  const body = (await response.json()) as GeminiResponse;

  if (!response.ok) {
    throw new GeminiApiError(
      body.error?.message ?? "Gemini request failed.",
      response.status
    );
  }

  const content = body.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("")
    .trim();

  if (!content) {
    throw new GeminiApiError("Gemini returned an empty response.");
  }

  return content;
}
