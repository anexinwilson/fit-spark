import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist } from "next/font/google";

import NavBar from "@/components/navbar";
import { ReactQueryClientProvider } from "@/components/react-query-client-provider";
import { Toaster } from "@/components/ui/sonner";
import { requireRuntimeConfigValue } from "@/lib/runtime-config";

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

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={geist.variable}>
      <body className="bg-background text-foreground min-h-screen font-sans antialiased">
        <ClerkProvider
          publishableKey={requireRuntimeConfigValue(
            "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
          )}
          signInUrl="/sign-in"
          signUpUrl="/sign-up"
          signUpForceRedirectUrl="/create-profile"
          signInForceRedirectUrl="/auth/continue"
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
