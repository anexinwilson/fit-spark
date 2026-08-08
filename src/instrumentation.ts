/**
 * Next.js instrumentation hook — runs once in the Node.js runtime when the
 * server starts, before any request is handled.
 *
 * We use it to unpack CLERK_ENCRYPTION_KEY from the single
 * FITSPARK_RUNTIME_CONFIG_JSON secret so Clerk's Node.js runtime can find it
 * via process.env without needing a separate Secret Manager entry.
 */
export async function register() {
  const raw = process.env.FITSPARK_RUNTIME_CONFIG_JSON?.trim();
  if (!raw) return;

  let config: Record<string, string>;
  try {
    config = JSON.parse(raw);
  } catch {
    return;
  }

  if (config.CLERK_ENCRYPTION_KEY) {
    process.env.CLERK_ENCRYPTION_KEY = config.CLERK_ENCRYPTION_KEY;
  }
}
