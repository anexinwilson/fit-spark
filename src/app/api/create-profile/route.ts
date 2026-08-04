import { getAuthenticatedUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// Creates a user profile if it does not already exist.
// Only runs if the user is authenticated and has no existing profile.
export const POST = async () => {
  try {
    // Retrieves the current authenticated user's information from Clerk.
    const clerkUser = await getAuthenticatedUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Extracts the user's email address from Clerk data.
    const email = clerkUser?.emailAddresses[0].emailAddress;
    if (!email) {
      return NextResponse.json(
        { error: "User does not have an email address" },
        { status: 404 },
      );
    }

    // Checks if a profile already exists for this user.
    const existingProfile = await prisma.profile.findUnique({
      where: { userId: clerkUser.id },
    });

    // If the profile already exists, no further action is needed.
    if (existingProfile) {
      return NextResponse.json({ message: "Profile already exists" });
    }

    // Creates a new profile record for the user.
    await prisma.profile.create({
      data: {
        userId: clerkUser.id,
        email,
        subscriptionTier: null,
        stripeSubscriptionId: null,
        subscriptionActive: false,
      },
    });

    // Confirms successful creation of the profile.
    return NextResponse.json(
      { message: "Profile created successfully" },
      { status: 201 },
    );
  } catch {
    // Handles unexpected errors.
    return NextResponse.json({ error: "internal error." }, { status: 500 });
  }
};
