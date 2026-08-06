import type { Metadata } from "next";
import { Dumbbell } from "lucide-react";

import { EquipmentCatalog } from "@/components/equipment/equipment-catalog";

export const metadata: Metadata = {
  title: "Equipment Catalog | FitSpark",
  description:
    "Explore fitness equipment, gym machines, target muscle groups, and proper execution guides.",
};

export default function EquipmentPage() {
  return (
    <main className="min-h-screen bg-slate-50/50 py-10 dark:bg-slate-950/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 text-center sm:text-left">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-950/80 dark:text-blue-300">
            <Dumbbell className="size-3.5" aria-hidden="true" />
            <span>Interactive Gym Equipment Guide</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl dark:text-slate-100">
            Equipment Search &amp; Catalog
          </h1>
          <p className="mt-2.5 max-w-3xl text-base text-slate-600 dark:text-slate-400">
            Browse gym machines and free weights, filter by target muscle groups
            and experience level, and view step-by-step form instructions.
          </p>
        </div>
        <EquipmentCatalog />
      </div>
    </main>
  );
}
