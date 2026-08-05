import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

export default async function AuthContinuationPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-up");
  }

  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: { subscriptionActive: true },
  });

  if (!profile) {
    redirect("/create-profile");
  }

  redirect(profile.subscriptionActive ? "/today" : "/subscribe");
}
