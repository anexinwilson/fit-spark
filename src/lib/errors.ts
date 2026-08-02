/** Returns a safe message for values caught from third-party APIs. */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}
