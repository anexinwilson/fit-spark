import { auth, createClerkClient } from "@clerk/nextjs/server";
import { requireRuntimeConfigValue } from "@/lib/runtime-config";

export async function getAuthenticatedUserId() {
  const { userId } = await auth();
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
