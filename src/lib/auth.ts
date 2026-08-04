import { auth, clerkClient } from "@clerk/nextjs/server";

export async function getAuthenticatedUserId() {
  const { userId } = await auth();
  return userId;
}

export async function getAuthenticatedUser() {
  const userId = await getAuthenticatedUserId();

  if (!userId) {
    return null;
  }

  const client = await clerkClient();
  return client.users.getUser(userId);
}
