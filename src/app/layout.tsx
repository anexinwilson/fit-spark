// https://mui.com/material-ui/integrations/nextjs/
// https://clerk.com/docs/quickstarts/nextjs

import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { Roboto } from "next/font/google";
import { ThemeProvider } from "@mui/material/styles";
import theme from "./theme";
import "./globals.css";
import NavBar from "@/components/navbar";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ReactQueryClientProvider } from "@/components/react-query-client-provider";

/**
 * Loads the Roboto font for the UI, with multiple weights.
 */
const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto",
});

/**
 * Loads Geist fonts for branding/typography.
 */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Root layout for the app. Sets up all global providers:
 * - Clerk (authentication)
 * - React Query
 * - MUI theming and styling
 * - NavBar and CSS baseline
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${roboto.variable} ${geistSans.variable} ${geistMono.variable}`}
      >
        <body className="antialiased">
          <ReactQueryClientProvider>
            <AppRouterCacheProvider options={{ enableCssLayer: true }}>
              <ThemeProvider theme={theme}>
                <NavBar />
                {children}
              </ThemeProvider>
            </AppRouterCacheProvider>
          </ReactQueryClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
