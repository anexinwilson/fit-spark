"use client";

import * as React from "react";
import { Dumbbell, RotateCcw, Search, SlidersHorizontal } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getUserEquipment,
  toggleEquipment,
} from "@/actions/equipment";
import { EquipmentCard } from "@/components/equipment/equipment-card";
import { EquipmentDetailsDialog } from "@/components/equipment/equipment-details-dialog";
import type { EquipmentItem, EquipmentSearchResponse } from "@/lib/equipment/types";

const MUSCLE_OPTIONS = [
  { value: "all", label: "All Muscle Groups" },
  { value: "chest", label: "Chest" },
  { value: "back", label: "Back" },
  { value: "legs", label: "Legs" },
  { value: "shoulders", label: "Shoulders" },
  { value: "arms", label: "Arms" },
  { value: "core", label: "Core" },
];

const CATEGORY_OPTIONS = [
  { value: "all", label: "All Types" },
  { value: "Free Weights", label: "Free Weights" },
  { value: "Machines", label: "Machines" },
  { value: "Cables", label: "Cables" },
  { value: "Cardio", label: "Cardio" },
  { value: "Bodyweight", label: "Bodyweight" },
];

const LEVEL_OPTIONS = [
  { value: "all", label: "All Levels" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
];

export function EquipmentCatalog({
  isPlanning = false,
}: {
  isPlanning?: boolean;
}) {
  const [query, setQuery] = React.useState("");
  const [muscle, setMuscle] = React.useState("all");
  const [category, setCategory] = React.useState("all");
  const [level, setLevel] = React.useState("all");
  const [view, setView] = React.useState<"all" | "mine">("all");

  const [results, setResults] = React.useState<EquipmentItem[]>([]);
  const [count, setCount] = React.useState<number>(0);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  // Owned equipment set (persisted to DB)
  const [ownedIds, setOwnedIds] = React.useState<Set<string>>(new Set());
  const [togglingId, setTogglingId] = React.useState<string | null>(null);

  const [selectedEquipment, setSelectedEquipment] =
    React.useState<EquipmentItem | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);

  // Load user's current gym inventory on mount
  React.useEffect(() => {
    getUserEquipment()
      .then((aliases) => setOwnedIds(new Set(aliases)))
      .catch(() =>
        setLoadError(
          "We could not load your equipment. Refresh and try again.",
        ),
      );
  }, []);

  const fetchEquipment = React.useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (muscle !== "all") params.set("muscle", muscle);
      if (category !== "all") params.set("category", category);
      if (level !== "all") params.set("level", level);
      params.set("limit", "100");

      const res = await fetch(`/api/equipment/search?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch equipment data");
      const data: EquipmentSearchResponse = await res.json();
      setResults(data.results);
      setCount(data.count);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "We could not load equipment. Refresh and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [query, muscle, category, level]);

  React.useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  const handleResetFilters = () => {
    setQuery("");
    setMuscle("all");
    setCategory("all");
    setLevel("all");
  };

  const hasActiveFilters =
    query.trim() !== "" ||
    muscle !== "all" ||
    category !== "all" ||
    level !== "all";

  const visibleResults =
    view === "mine"
      ? results.filter((item) => ownedIds.has(item.equipment_type))
      : results;

  const handleViewDetails = (item: EquipmentItem) => {
    setSelectedEquipment(item);
    setIsDetailsOpen(true);
  };

  const handleToggleOwnership = async (item: EquipmentItem) => {
    setTogglingId(item.id);
    try {
      const { owned } = await toggleEquipment(item.id, item.equipment_type);
      setOwnedIds((prev) => {
        const next = new Set(prev);
        if (owned) {
          next.add(item.equipment_type);
        } else {
          next.delete(item.equipment_type);
        }
        return next;
      });
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "We could not update your equipment. Try again.",
      );
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {loadError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300"
        >
          {loadError}
        </div>
      )}
      {isPlanning && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3 text-sm dark:border-blue-900 dark:bg-blue-950/30">
          <div>
            <p className="font-semibold text-blue-900 dark:text-blue-100">
              Planning in progress
            </p>
            <p className="text-blue-800/80 dark:text-blue-200/80">
              Select the equipment you can use, then continue to health and
              safety.
            </p>
          </div>
          <span className="shrink-0 font-semibold text-blue-700 dark:text-blue-300">
            {ownedIds.size} selected
          </span>
        </div>
      )}

      {/* Search & Filter Section */}
      <div className="bg-card rounded-2xl border p-4 shadow-xs sm:p-6">
        <div className="space-y-4">
          <div className="relative">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-5 -translate-y-1/2" />
            <Input
              type="search"
              placeholder="Search equipment, muscle group, or category..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-12 border-blue-200/80 pr-4 pl-10 text-base focus-visible:ring-blue-500/30 dark:border-blue-900"
            />
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-muted-foreground flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase">
                <SlidersHorizontal className="size-3.5" />
                <span>Filters:</span>
              </div>

              <select
                aria-label="Filter by muscle group"
                value={muscle}
                onChange={(e) => setMuscle(e.target.value)}
                className="border-input bg-background text-foreground h-9 rounded-lg border px-3 text-xs focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
              >
                {MUSCLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="border-input bg-background text-foreground h-9 rounded-lg border px-3 text-xs focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <select
                aria-label="Filter by difficulty level"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="border-input bg-background text-foreground h-9 rounded-lg border px-3 text-xs focus:ring-2 focus:ring-blue-500/30 focus:outline-none"
              >
                {LEVEL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="text-muted-foreground hover:text-foreground h-9 gap-1.5 text-xs"
              >
                <RotateCcw className="size-3.5" />
                Reset Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Results Meta Header */}
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Equipment view"
      >
        <Button
          role="tab"
          aria-selected={view === "all"}
          variant={view === "all" ? "default" : "outline"}
          onClick={() => setView("all")}
        >
          View all equipment
        </Button>
        <Button
          role="tab"
          aria-selected={view === "mine"}
          variant={view === "mine" ? "default" : "outline"}
          onClick={() => setView("mine")}
        >
          My equipment ({ownedIds.size})
        </Button>
      </div>

      <div className="flex items-center justify-between px-1">
        <Badge variant="outline" className="px-3 py-1 text-sm font-semibold">
          {view === "mine" ? visibleResults.length : count}{" "}
          {(view === "mine" ? visibleResults.length : count) === 1
            ? "Item"
            : "Items"}
        </Badge>
        {ownedIds.size > 0 && (
          <span className="text-muted-foreground text-sm">
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {ownedIds.size}
            </span>{" "}
            in your gym
          </span>
        )}
      </div>

      {/* Equipment Grid or Loading Skeleton or Empty State */}
      <div 
        className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
        style={{ overflowAnchor: 'none', contain: 'layout' }}
      >
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="flex h-[380px] flex-col overflow-hidden">
              <Skeleton className="h-48 w-full" />
              <CardHeader className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-1">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-16" />
                </div>
              </CardContent>
              <CardFooter className="mt-auto flex flex-col gap-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-9 w-full" />
              </CardFooter>
            </Card>
          ))
        ) : visibleResults.length > 0 ? (
          visibleResults.map((item, index) => (
            <EquipmentCard
              key={item.id}
              item={item}
              isOwned={ownedIds.has(item.equipment_type)}
              isToggling={togglingId === item.id}
              onViewDetails={handleViewDetails}
              onToggleOwnership={handleToggleOwnership}
              priority={index < 6}
            />
          ))
        ) : (
          <Card className="col-span-full flex flex-col items-center justify-center p-12 text-center">
            <div className="bg-muted mb-4 flex size-16 items-center justify-center rounded-full">
              <Dumbbell className="text-muted-foreground size-8" />
            </div>
            <CardTitle className="text-foreground text-xl font-semibold">
              {view === "mine"
                ? "You have not added equipment yet"
                : "No equipment matches your search"}
            </CardTitle>
            <Button
              variant="outline"
              onClick={handleResetFilters}
              className="mt-6 gap-2"
            >
              <RotateCcw className="size-4" />
              Reset All Filters
            </Button>
          </Card>
        )}
      </div>

      <EquipmentDetailsDialog
        equipment={selectedEquipment}
        open={isDetailsOpen}
        onOpenChange={setIsDetailsOpen}
      />

      {isPlanning && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-3 sm:px-6 sm:pb-5">
          <div className="pointer-events-auto mx-auto flex max-w-7xl items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-white/95 p-3 shadow-2xl shadow-blue-950/20 backdrop-blur sm:px-5 dark:border-blue-900 dark:bg-slate-950/95">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                Planning your workout
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                {ownedIds.size === 0
                  ? "Select the equipment you can use."
                  : `${ownedIds.size} item${ownedIds.size === 1 ? "" : "s"} selected`}
              </p>
            </div>
            <Button
              type="button"
              className="shrink-0 gap-2 bg-blue-600 hover:bg-blue-700"
              disabled={ownedIds.size === 0}
              onClick={() => window.location.assign("/workoutplan?step=2")}
            >
              Continue planning
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
