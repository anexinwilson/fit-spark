import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export const GET = async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    if (!userId) {
      return NextResponse.json({ error: "Missing User Id" }, { status: 500 });
    }
    const profile = await prisma?.profile.findUnique({
      where: { userId },
      select: { subscriptionActive: true },
    });
    return NextResponse.json({
      subscriptionActive: profile?.subscriptionActive,
    });
  } catch (error: any) {
    return NextResponse.json({ error: "Internal Error" }, { status: 500 });
  }
};
