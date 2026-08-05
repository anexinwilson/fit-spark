CREATE TABLE "WorkoutPlanDraft" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "step" INTEGER NOT NULL DEFAULT 0,
    "input" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutPlanDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkoutPlanDraft_userId_key" ON "WorkoutPlanDraft"("userId");
CREATE INDEX "WorkoutPlanDraft_userId_idx" ON "WorkoutPlanDraft"("userId");
