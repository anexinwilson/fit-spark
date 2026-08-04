import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { WorkoutPlanForm } from "@/features/workout-plan/workout-plan-form";
import { prisma } from "@/lib/prisma";

export default async function WorkoutPlanPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-up");

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { subscriptionActive: true },
  });
  if (!profile) redirect("/create-profile");
  if (!profile.subscriptionActive) redirect("/subscribe");

  return (
    <section className="min-h-[calc(100svh-4rem)] bg-slate-50 py-10 sm:py-14">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mb-8 max-w-2xl">
          <p className="text-sm font-semibold tracking-wider text-blue-700 uppercase">
            Your workout guide
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Let’s make your next gym visit clear.
          </h1>
          <p className="text-muted-foreground mt-3 text-lg leading-8">
            Answer a few plain-language questions. We will build a structured
            sequence around what you can realistically do.
          </p>
        </div>
        <WorkoutPlanForm />
      </div>
    </section>
  );
}
