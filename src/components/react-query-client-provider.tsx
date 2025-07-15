// https://enlear.academy/react-query-in-next-js-a-beginners-guide-to-efficient-data-fetching-3667e30a795d
// https://supabase.com/blog/react-query-nextjs-app-router-cache-helpers

'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

/**
 * Provides a singleton React Query client to the application.
 * Wraps children components so they can use React Query for data fetching/caching.
 */
export const ReactQueryClientProvider = ({ children }: { children: React.ReactNode }) => {
  // Ensures a single QueryClient instance is used for the lifetime of the app.
  const [queryClient] = useState(
    () =>
      new QueryClient()
  )
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
