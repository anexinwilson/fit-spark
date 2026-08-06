import { auth, createClerkClient } from "@clerk/nextjs/server";
import { requireRuntimeConfigValue } from "@/lib/runtime-config";

export async function getAuthenticatedUserId() {
  const { userId } = await auth();
  if (!userId && process.env.NODE_ENV !== "production") {
    try {
      const { cookies } = await import("next/headers");
      const cookieStore = await cookies();
      if (cookieStore.get("e2e_test_user")?.value === "true") {
        return "e2e_test_user_id";
      }
    } catch {
      // Ignore if called outside request context
    }
  }
  return userId;
}

export async function getAuthenticatedUser() {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return null;
  }

  const client = createClerkClient({
    secretKey: requireRuntimeConfigValue("CLERK_SECRET_KEY"),
  });
  return client.users.getUser(userId);
}
