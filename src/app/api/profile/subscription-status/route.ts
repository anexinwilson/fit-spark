import { prisma } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Retrieves the user's current subscription tier from their profile.
// Used to show the plan status on the frontend.
export const GET = async () => {
  try {
    // Retrieves the authenticated user.
    const clerkUser = await currentUser();
    if (!clerkUser?.id) {
      return NextResponse.json({ error: "Unauthorized" });
    }

    // Selects only the subscription tier field from the profile.
    const profile = await prisma.profile.findUnique({
      where: { userId: clerkUser.id },
      select: { subscriptionTier: true },
    });

    if (!profile) {
      return NextResponse.json({ error: "No profile found" });
    }
    // Returns the subscription tier information.
    return NextResponse.json({ subscription: profile });
  } catch (error: any) {
    // Handles errors during profile lookup.
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
};
