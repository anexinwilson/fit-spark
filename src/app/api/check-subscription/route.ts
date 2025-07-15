import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

// Checks if a user has an active subscription based on their userId.
// Expects userId as a query parameter. Returns { subscriptionActive }.
export const GET = async (request: NextRequest) => {
  try {
    // Extracts userId from the request's query parameters.
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    // Responds with an error if no userId is provided.
    if (!userId) {
      return NextResponse.json({ error: "Missing User Id" }, { status: 500 });
    }

    // Retrieves only the subscriptionActive field from the user's profile.
    const profile = await prisma?.profile.findUnique({
      where: { userId },
      select: { subscriptionActive: true },
    });

    // Returns the subscription status for the user.
    return NextResponse.json({
      subscriptionActive: profile?.subscriptionActive,
    });
  } catch (error: any) {
    // Handles unexpected errors.
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
};
