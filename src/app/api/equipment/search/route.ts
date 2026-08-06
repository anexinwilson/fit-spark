import { type NextRequest, NextResponse } from "next/server";
import { searchEquipment } from "@/lib/equipment/search-equipment";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const q = searchParams.get("q") ?? undefined;
  const muscle = searchParams.get("muscle") ?? undefined;
  const level = searchParams.get("level") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const rawLimit = searchParams.get("limit");
  const limit = rawLimit === null ? 100 : Number(rawLimit);
  if (!Number.isInteger(limit) || limit < 1 || limit > 250) {
    return NextResponse.json(
      { success: false, error: "limit must be an integer between 1 and 250." },
      { status: 400 },
    );
  }

  const result = await searchEquipment({
    q,
    muscle,
    level,
    category,
    limit,
  });

  return NextResponse.json(result, { status: 200 });
}
