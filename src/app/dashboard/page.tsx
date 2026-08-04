import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-up");

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: {
      subscriptionActive: true,
      experienceLevel: true,
    },
  });

  if (!profile) redirect("/create-profile");
  if (!profile.subscriptionActive) redirect("/subscribe");

  // Type-safe Prisma fetch for recent workouts (Phase 2 schema)
  const recentWorkouts = await prisma.workoutSession.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
    include: {
      exercises: true,
    },
  });

  return (
    <section className="min-h-[calc(100svh-4rem)] bg-slate-50 py-10 sm:py-14">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mb-8">
          <p className="text-sm font-semibold tracking-wider text-blue-700 uppercase">
            Dashboard
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
            Welcome back. Let&apos;s get to work.
          </h1>
          <p className="text-muted-foreground mt-3 text-lg leading-8">
            Experience Level:{" "}
            <span className="font-medium text-slate-900 capitalize">
              {profile.experienceLevel}
            </span>
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Quick Actions Card */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Quick Actions</h2>
            <div className="mt-4 flex flex-col gap-3">
              <Link
                href="/workoutplan"
                className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow hover:bg-slate-900/90"
              >
                Start New Workout
              </Link>
              <Link
                href="/equipment"
                className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-slate-100"
              >
                Browse Equipment Catalog
              </Link>
            </div>
          </div>

          {/* Recent History Card */}
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Recent History</h2>
            {recentWorkouts.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                You haven&apos;t logged any workouts yet. Time to hit the gym!
              </p>
            ) : (
              <ul className="mt-4 space-y-4">
                {recentWorkouts.map((workout) => (
                  <li
                    key={workout.id}
                    className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">{workout.name}</p>
                      <p className="text-xs text-slate-500">
                        {workout.createdAt.toLocaleDateString()} •{" "}
                        {workout.exercises.length} exercises
                      </p>
                    </div>
                    <span className="text-sm font-medium text-blue-600">
                      View
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
