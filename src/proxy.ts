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
    // Official Clerk-recommended matcher: run on all pages except static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Always run for Clerk proxy routes
    "/__clerk/(.*)",
  ],
};
