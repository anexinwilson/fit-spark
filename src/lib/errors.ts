/** Returns a safe message for values caught from third-party APIs. */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export class RateLimitQuotaExhaustedError extends Error {
  status: number = 429;

  constructor(
    message: string = "API Quota Exceeded. You have hit the daily request limit.",
  ) {
    super(message);
    this.name = "RateLimitQuotaExhaustedError";
  }
}

