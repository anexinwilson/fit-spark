import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // 'current' or 'history'

    if (type !== "current" && type !== "history") {
      return NextResponse.json({ error: "Invalid type parameter" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      if (type === "history") {
        // Nuclear option: Delete EVERYTHING
        await tx.workoutSession.deleteMany({
          where: { userId },
        });
        await tx.workoutPlan.deleteMany({
          where: { userId },
        });
        await tx.workoutPlanDraft.deleteMany({
          where: { userId },
        });
      } else if (type === "current") {
        // Discard current plan: Delete Blueprint and Uncompleted Sessions
        await tx.workoutPlan.deleteMany({
          where: { userId },
        });
        await tx.workoutPlanDraft.deleteMany({
          where: { userId },
        });
        await tx.workoutSession.deleteMany({
          where: { 
            userId,
            completedAt: null // Only delete uncompleted sessions!
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[CLEAR_PLANS]", error);
    return NextResponse.json(
      { error: "Failed to erase data." },
      { status: 500 },
    );
  }
}
