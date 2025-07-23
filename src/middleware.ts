import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

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

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const { pathname, origin, searchParams } = req.nextUrl;

  /* always allow the status‑check API */
  if (pathname === "/api/check-subscription") return NextResponse.next();

  /* unauthenticated user on a private page to /sign‑up */
  if (!isPublicRoute(req) && !userId)
    return NextResponse.redirect(new URL("/sign-up", origin));

  /* signed‑in user tries /sign‑up again to /workoutplan */
  if (isSignUpRoute(req) && userId)
    return NextResponse.redirect(new URL("/workoutplan", origin));

  /* subscription guard for /workoutplan */
  if (isWorkoutPlanRoute(req) && userId) {
    /* 1 · first load right after Stripe */
    if (searchParams.has("session_id")) {
      /* give replicas time to sync; let React mount */
      return NextResponse.next();
    }

    /* 2. subsequent navigations – call the API inside the same container */
    try {
      const apiUrl = new URL(
        `/api/check-subscription?userId=${userId}`,
        req.url // builds an absolute same‑origin URL
      );

      const res = await fetch(apiUrl.toString(), {
        headers: { cookie: req.headers.get("cookie") ?? "" },
        cache: "no-store",
      });

      if (!res.ok) return NextResponse.redirect(new URL("/subscribe", origin));

      const { subscriptionActive } = (await res.json()) as {
        subscriptionActive: boolean;
      };

      if (!subscriptionActive)
        return NextResponse.redirect(new URL("/subscribe", origin));
    } catch {
      /* any JSON / network error to safe fallback */
      return NextResponse.redirect(new URL("/subscribe", origin));
    }
  }

  /* everything else can continue */
  return NextResponse.next();
});

/*matcher*/
export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
