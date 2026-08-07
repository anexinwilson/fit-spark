/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import Image from "next/image";
import {
  Activity,
  Check,
  Dumbbell,
  HandMetal,
  Info,
  Loader2,
  PersonStanding,
  Plus,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { EquipmentItem } from "@/lib/equipment/types";

interface EquipmentCardProps {
  item: EquipmentItem;
  isOwned?: boolean;
  isToggling?: boolean;
  priority?: boolean;
  onViewDetails: (item: EquipmentItem) => void;
  onToggleOwnership?: (item: EquipmentItem) => void;
}

export function EquipmentCard({
  item,
  isOwned = false,
  isToggling = false,
  priority = false,
  onViewDetails,
  onToggleOwnership,
}: EquipmentCardProps) {
  // Dynamic gradient and icon based on equipment category
  const getCategoryStyles = () => {
    const category = item.category?.toLowerCase() || "";
    if (category.includes("chest") || category.includes("arms"))
      return {
        bg: "from-blue-500 to-cyan-400",
        icon: <Dumbbell className="size-10 text-white/90" />,
      };
    if (category.includes("back") || category.includes("shoulders"))
      return {
        bg: "from-indigo-500 to-purple-400",
        icon: <Activity className="size-10 text-white/90" />,
      };
    if (category.includes("legs"))
      return {
        bg: "from-emerald-500 to-teal-400",
        icon: <PersonStanding className="size-10 text-white/90" />,
      };
    if (category.includes("core"))
      return {
        bg: "from-orange-500 to-red-400",
        icon: <HandMetal className="size-10 text-white/90" />,
      };
    return {
      bg: "from-slate-600 to-slate-400",
      icon: <Dumbbell className="size-10 text-white/90" />,
    };
  };

  const style = getCategoryStyles();

  const [imageError, setImageError] = React.useState(false);
  const hasImage = item.image_urls.length > 0 && !imageError;

  return (
    <Card className="group flex h-full flex-col overflow-hidden border-slate-200/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800">
      {/* Aesthetic Image/Icon Header */}
      <div className="relative h-48 w-full overflow-hidden bg-muted flex items-center justify-center">
        {hasImage ? (
          <Image
            src={item.image_urls[0]}
            alt={item.name}
            fill
            unoptimized
            sizes="(max-width: 768px) 100vw, 33vw"
            priority={priority}
            loading={priority ? 'eager' : 'lazy'}
            className="object-contain transition-transform duration-300 group-hover:scale-[1.02]"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-red-950/80 p-6 text-center text-sm font-medium text-red-100">
            Equipment image failed to load.
          </div>
        )}
      </div>

      <CardHeader className="flex-1 pt-4 pb-2">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-1.5">
          <Badge
            variant="default"
            className="bg-slate-900 text-slate-50 capitalize dark:bg-slate-100 dark:text-slate-900"
          >
            {item.category}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {item.level}
          </Badge>
        </div>
        <CardTitle className="text-foreground text-lg font-extrabold tracking-tight transition-colors group-hover:text-blue-600">
          {item.name}
        </CardTitle>
        <p className="text-muted-foreground line-clamp-1 text-xs font-semibold tracking-wider uppercase">
          {item.equipment_name || item.equipment_type || "Gym Machine"}
        </p>
      </CardHeader>

      <CardContent className="space-y-3 pb-4">
        <div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {item.primary_muscles.slice(0, 3).map((muscle) => (
              <Badge
                key={muscle}
                variant="secondary"
                className="bg-blue-50 text-[10px] text-blue-700 capitalize hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300"
              >
                {muscle}
              </Badge>
            ))}
            {item.primary_muscles.length > 3 && (
              <Badge variant="outline" className="text-[10px]">
                +{item.primary_muscles.length - 3}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="mt-auto flex flex-col gap-2 pt-0">
        {onToggleOwnership && (
          <Button
            variant={isOwned ? "default" : "outline"}
            disabled={isToggling}
            className={`w-full gap-2 transition-all ${isOwned ? "bg-emerald-600 text-white hover:bg-emerald-700" : "border-slate-300 hover:bg-slate-50"}`}
            onClick={() => onToggleOwnership(item)}
          >
            {isToggling ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isOwned ? (
              <Check className="size-4" />
            ) : (
              <Plus className="size-4" />
            )}
            {isToggling ? "Saving..." : isOwned ? "In My Gym" : "Add to My Gym"}
          </Button>
        )}
        <Button
          variant="ghost"
          className="w-full gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
          onClick={() => onViewDetails(item)}
        >
          <Info className="size-4" />
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}
