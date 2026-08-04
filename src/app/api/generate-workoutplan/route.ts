import { NextRequest, NextResponse } from "next/server";

import { createWorkoutPlan } from "@/features/workout-plan/server/generate-workout-plan";
import { workoutPlanSchema } from "@/features/workout-plan/schema";
import { getAuthenticatedUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GeminiApiError } from "@/lib/ai/gemini";

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: { subscriptionActive: true },
    });
    if (!profile?.subscriptionActive) {
      return NextResponse.json(
        { error: "An active subscription is required" },
        { status: 403 },
      );
    }

    const input = workoutPlanSchema.safeParse(await request.json());
    if (!input.success) {
      return NextResponse.json(
        { error: "Workout preferences are invalid" },
        { status: 400 },
      );
    }

    const workoutPlan = await createWorkoutPlan(input.data);
    return NextResponse.json({ workoutPlan });
  } catch (error: unknown) {
    console.error("Workout plan generation failed", error);

    if (error instanceof GeminiApiError) {
      return NextResponse.json(
        { error: "Workout plan generation is temporarily unavailable." },
        { status: error.status ?? 502 },
      );
    }

    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
}
