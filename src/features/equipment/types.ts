export interface EquipmentItem {
  id: string;
  name: string;
  category: string;
  level: string;
  equipment_type: string;
  equipment_name: string;
  equipment_aliases: string[];
  primary_muscles: string[];
  secondary_muscles: string[];
  image_urls: string[];
  instructions?: string[];
}

export interface EquipmentSearchQuery {
  q?: string;
  muscle?: string;
  level?: string;
  category?: string;
  limit?: number;
}

export interface EquipmentSearchResponse {
  success: boolean;
  results: EquipmentItem[];
  source: "catalog";

  count: number;
}
