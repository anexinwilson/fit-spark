import type { Metadata } from "next";
import { Dumbbell } from "lucide-react";

import { EquipmentCatalog } from "@/features/equipment/equipment-catalog";

export const metadata: Metadata = {
  title: "Explore Equipment | FitSpark",
  description:
    "Choose the equipment available to you and learn how each item is used.",
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-ambient-aurora bg-background pt-32 pb-16 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[100px] pointer-events-none opacity-50" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="mb-8 text-center sm:text-left">
          <h1 className="text-3xl font-black italic tracking-tighter text-foreground sm:text-4xl animate-in fade-in slide-in-from-bottom-6 duration-1000">
            Choose equipments you recognize
          </h1>
        </div>
        <EquipmentCatalog isPlanning={params.returnTo === "workoutplan"} />
      </div>
    </main>
  );
}
