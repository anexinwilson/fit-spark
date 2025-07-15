import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

/**
 * List of all public (non-authenticated) routes.
 */
const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-up(.*)",
  "/subscribe(.*)",
  "/api/webhook(.*)",
  "/webhook(.*)",
  "/api/check-subscription(.*)",
]);

const isSignUpRoute = createRouteMatcher(["/sign-up(.*)"]);
const isWorkoutPlanRoute = createRouteMatcher(["/workoutplan(.*)"]);

/**
 * Middleware for protecting private routes with Clerk authentication.
 * - Redirects to sign-up if not signed in and route is not public.
 * - Redirects authenticated users away from sign-up to their dashboard.
 * - Checks subscription status before allowing access to /workoutplan.
 */
export default clerkMiddleware(async (auth, req) => {
  const userAuth = await auth();
  const { userId } = userAuth;
  const { pathname, origin } = req.nextUrl;

  if (pathname === "/api/check-subscription") {
    // Always allow this API endpoint.
    return NextResponse.next();
  }

  if (!isPublicRoute(req) && !userId) {
    // Redirects unauthenticated users to sign-up page.
    return NextResponse.redirect(new URL("/sign-up", origin));
  }

  if (isSignUpRoute(req) && userId) {
    // Prevents authenticated users from seeing the sign-up page again.
    return NextResponse.redirect(new URL("/workoutplan", origin));
  }

  if (isWorkoutPlanRoute(req) && userId) {
    // Before accessing workoutplan, checks if the user has an active subscription.
    try {
      const response = await fetch(
        `${origin}/api/check-subscription?userId=${userId}`
      );
      const data = await response.json();

      if (!data.subscriptionActive) {
        // If no active subscription, redirect to subscribe page.
        return NextResponse.redirect(new URL("/subscribe", origin));
      }
    } catch (error: any) {
      // On API error, still redirect to subscribe.
      return NextResponse.redirect(new URL("/subscribe", origin));
    }
  }

  // Allow access if none of the above conditions apply.
  return NextResponse.next();
});

/**
 * Next.js matcher config: ensures middleware runs for API routes and app pages,
 * skipping static files or Next internals.
 */
export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
