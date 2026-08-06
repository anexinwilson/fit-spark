/* eslint-disable @next/next/no-img-element */
"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { EquipmentItem } from "@/lib/equipment/types";

interface EquipmentDetailsDialogProps {
  equipment: EquipmentItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EquipmentDetailsDialog({
  equipment,
  open,
  onOpenChange,
}: EquipmentDetailsDialogProps) {
  if (!equipment) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <EquipmentDetailsContent
        key={equipment.id}
        equipment={equipment}
        onOpenChange={onOpenChange}
      />
    </Dialog>
  );
}

function EquipmentDetailsContent({
  equipment,
  onOpenChange,
}: {
  equipment: EquipmentItem;
  onOpenChange: (open: boolean) => void;
}) {
  const [imageError, setImageError] = React.useState(false);

  const hasImage = equipment.image_urls.length > 0 && !imageError;

  return (
    <DialogContent className="max-w-2xl">
      {hasImage ? (
        <div className="bg-muted relative h-64 w-full overflow-hidden rounded-lg">
          <img
            src={equipment.image_urls[0]}
            alt={equipment.name}
            className="h-full w-full object-cover"
            onError={() => setImageError(true)}
          />
        </div>
      ) : (
        <div className="flex h-48 w-full items-center justify-center rounded-lg bg-red-950/80 p-6 text-center text-sm font-medium text-red-100">
          Equipment image failed to load.
        </div>
      )}

      <DialogHeader className="gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="default" className="capitalize">
            {equipment.category}
          </Badge>
          <Badge variant="outline" className="capitalize">
            {equipment.level} level
          </Badge>
          <Badge variant="secondary" className="capitalize">
            {equipment.equipment_type}
          </Badge>
        </div>
        <DialogTitle className="text-foreground text-2xl font-bold">
          {equipment.name}
        </DialogTitle>
        <DialogDescription className="text-muted-foreground text-sm font-medium">
          Machine / Equipment: {equipment.equipment_name}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        {equipment.equipment_aliases &&
          equipment.equipment_aliases.length > 0 && (
            <div>
              <h4 className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wider uppercase">
                Also Known As
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {equipment.equipment_aliases.map((alias) => (
                  <Badge
                    key={alias}
                    variant="ghost"
                    className="bg-muted/70 text-xs"
                  >
                    {alias}
                  </Badge>
                ))}
              </div>
            </div>
          )}

        <div>
          <h4 className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wider uppercase">
            Primary Muscle Groups
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {equipment.primary_muscles.map((muscle) => (
              <Badge key={muscle} variant="default" className="capitalize">
                {muscle}
              </Badge>
            ))}
          </div>
        </div>

        {equipment.secondary_muscles &&
          equipment.secondary_muscles.length > 0 && (
            <div>
              <h4 className="text-muted-foreground mb-1.5 text-xs font-semibold tracking-wider uppercase">
                Secondary Muscle Groups
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {equipment.secondary_muscles.map((muscle) => (
                  <Badge key={muscle} variant="outline" className="capitalize">
                    {muscle}
                  </Badge>
                ))}
              </div>
            </div>
          )}

        {equipment.instructions && equipment.instructions.length > 0 && (
          <div>
            <h4 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wider uppercase">
              Execution Instructions
            </h4>
            <ol className="text-foreground/90 list-decimal space-y-2 pl-5 text-sm">
              {equipment.instructions.map((step, idx) => (
                <li key={idx} className="leading-relaxed">
                  {step}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Close
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
