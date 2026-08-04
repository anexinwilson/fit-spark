import { getAuthenticatedUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Checks the authenticated user's active subscription.
export const GET = async () => {
  try {
    const userId = await getAuthenticatedUserId();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Retrieves only the subscriptionActive field from the user's profile.
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { subscriptionActive: true },
    });

    // Returns the subscription status for the user.
    return NextResponse.json({
      subscriptionActive: profile?.subscriptionActive,
    });
  } catch {
    // Handles unexpected errors.
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
};
