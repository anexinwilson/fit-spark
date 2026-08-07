import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist } from "next/font/google";

import NavBar from "@/components/navbar";
import { ReactQueryClientProvider } from "@/components/react-query-client-provider";
import { Toaster } from "@/components/ui/sonner";
import { requireRuntimeConfigValue } from "@/lib/runtime-config";
import { clerkAppearance } from "@/lib/clerk-theme";
import { dark } from "@clerk/themes";

import "./globals.css";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FitSpark | Always know what to do next",
  description:
    "A beginner-friendly workout coach that turns your goals, schedule, and available equipment into a clear plan.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geist.variable} dark`} suppressHydrationWarning>
      <head>
        {/* Pre-connect to Clerk CDN so JS bundle downloads start earlier */}
        <link rel="preconnect" href="https://magnetic-lizard-97.clerk.accounts.dev" />
        <link rel="dns-prefetch" href="https://magnetic-lizard-97.clerk.accounts.dev" />
        <link rel="preconnect" href="https://accounts.dev" />
      </head>
      <body
        className="bg-background text-foreground min-h-screen font-sans antialiased"
        suppressHydrationWarning
      >
        <ClerkProvider
          appearance={{
            elements: {
              headerTitle: "text-2xl sm:text-3xl font-bold",
              headerSubtitle: "text-base sm:text-lg",
            }
          } as any}
          publishableKey={requireRuntimeConfigValue(
            "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
          )}
          signInForceRedirectUrl="/today"
          signUpForceRedirectUrl="/today"
        >
          <ReactQueryClientProvider>
            <a
              href="#main-content"
              className="bg-background text-foreground sr-only z-50 rounded-md px-4 py-2 focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
            >
              Skip to main content
            </a>
            <NavBar />
            <main id="main-content">{children}</main>
            <Toaster position="top-right" richColors />
          </ReactQueryClientProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
