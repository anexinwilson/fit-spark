// https://enlear.academy/react-query-in-next-js-a-beginners-guide-to-efficient-data-fetching-3667e30a795d
// https://supabase.com/blog/react-query-nextjs-app-router-cache-helpers

'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export const ReactQueryClientProvider = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient()
  )
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}