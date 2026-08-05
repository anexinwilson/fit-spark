import { NextRequest, NextResponse } from "next/server";

import {
  type WorkoutPlanDraft,
  workoutPlanDraftSchema,
} from "@/features/workout-plan/schema";
import { getAuthenticatedUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const draft = await prisma.workoutPlanDraft.findUnique({
    where: { userId },
    select: { step: true, input: true, updatedAt: true },
  });

  return NextResponse.json({
    draft: draft
      ? {
          step: draft.step,
          input: draft.input,
          updatedAt: draft.updatedAt.toISOString(),
        }
      : null,
  });
}

export async function PUT(request: NextRequest) {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = workoutPlanDraftSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Planning draft is invalid" },
      { status: 400 },
    );
  }

  const draft = await saveDraft(userId, parsed.data);
  return NextResponse.json({ draft });
}

export async function DELETE() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.workoutPlanDraft.deleteMany({ where: { userId } });
  return new NextResponse(null, { status: 204 });
}

async function saveDraft(userId: string, draft: WorkoutPlanDraft) {
  const saved = await prisma.workoutPlanDraft.upsert({
    where: { userId },
    create: { userId, step: draft.step, input: draft.input },
    update: { step: draft.step, input: draft.input },
    select: { step: true, input: true, updatedAt: true },
  });

  return {
    step: saved.step,
    input: saved.input,
    updatedAt: saved.updatedAt.toISOString(),
  };
}
