CREATE TABLE "WorkoutPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "plan" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkoutPlan_userId_key" ON "WorkoutPlan"("userId");
CREATE INDEX "WorkoutPlan_userId_idx" ON "WorkoutPlan"("userId");
