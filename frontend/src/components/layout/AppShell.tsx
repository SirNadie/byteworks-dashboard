'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { api } from '@/lib/api';

export default function AppShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const isLoginPage = pathname === '/login';

    useEffect(() => {
        const checkAuth = () => {
            const token = api.getToken();

            if (!token && !isLoginPage) {
                router.replace('/login');
                // Do NOT set isLoading(false) here. Keep spinning until redirect happens.
                return;
            }

            if (token && isLoginPage) {
                router.replace('/');
                // Do NOT set isLoading(false) here. Keep spinning until redirect happens.
                return;
            }

            // Only stop loading if we are on the correct page and allowed to be there
            setIsLoading(false);
        };

        // Execute immediately
        checkAuth();
    }, [pathname, isLoginPage, router]);

    // Prevent flashing of protected content
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-background-dark">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
            </div>
        );
    }

    if (isLoginPage) {
        return <>{children}</>;
    }

    return (
        <div className="flex min-h-screen bg-background-light dark:bg-background-dark">
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 inset-x-0 z-40 bg-white/80 dark:bg-card-dark/80 backdrop-blur-md border-b border-gray-200 dark:border-border-dark px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="p-2 -ml-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-border-dark rounded-lg"
                    >
                        <span className="material-symbols-outlined">menu</span>
                    </button>
                    <span className="font-display font-bold text-lg text-gray-900 dark:text-white">ByteWorks</span>
                </div>
            </div>

            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <main className="flex-1 w-full lg:ml-64 p-4 lg:p-8 mt-16 lg:mt-0 transition-all duration-300">
                {children}
            </main>
        </div>
    );
}
