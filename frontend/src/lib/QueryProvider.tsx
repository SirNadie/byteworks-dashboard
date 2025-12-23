'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

export function QueryProvider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // Data is considered fresh for 30 seconds
                        staleTime: 30 * 1000,
                        // Cache data for 5 minutes
                        gcTime: 5 * 60 * 1000,
                        // Retry failed requests up to 2 times
                        retry: 2,
                        // Refetch on window focus (good for multi-tab)
                        refetchOnWindowFocus: true,
                        // Don't refetch on reconnect by default
                        refetchOnReconnect: 'always',
                    },
                    mutations: {
                        // Retry mutations once
                        retry: 1,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}
