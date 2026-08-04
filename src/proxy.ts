import { clerkMiddleware } from "@clerk/nextjs/server";
import { requireRuntimeConfigValue } from "@/lib/runtime-config";

process.env.CLERK_ENCRYPTION_KEY = requireRuntimeConfigValue(
  "CLERK_ENCRYPTION_KEY",
);

export default clerkMiddleware(
  () => undefined,
  () => ({
    publishableKey: requireRuntimeConfigValue(
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
    ),
    secretKey: requireRuntimeConfigValue("CLERK_SECRET_KEY"),
  }),
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/__clerk/:path*",
    "/(api|trpc)(.*)",
  ],
};
