import { getAuthenticatedUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Retrieves the user's current subscription tier from their profile.
// Used to show the plan status on the frontend.
export const GET = async () => {
  try {
    // Retrieves the authenticated user.
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Selects only the subscription tier field from the profile.
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: {
        subscriptionTier: true,
        subscriptionActive: true,
        cancelAtPeriodEnd: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "No profile found" }, { status: 404 });
    }
    // Returns the subscription tier information.
    return NextResponse.json({ subscription: profile });
  } catch {
    // Handles errors during profile lookup.
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
};
