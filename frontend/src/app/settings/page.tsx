'use client';

import { useState, useEffect } from 'react';
import { api, User } from '@/lib/apiClient';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [theme, setTheme] = useState<'light' | 'dark' | null>(null); // Start null to avoid mismatch

    useEffect(() => {
        // Load user
        const fetchUser = async () => {
            try {
                const userData = await api.getCurrentUser();
                setUser(userData);
            } catch (error) {
                console.error("Failed to load user settings", error);
            }
        };
        fetchUser();

        // Check current theme explicitly from classList which is the source of truth
        if (document.documentElement.classList.contains('dark')) {
            setTheme('dark');
        } else {
            setTheme('light');
        }
    }, []);

    const toggleTheme = () => {
        if (!theme) return;

        const html = document.documentElement;
        const newTheme = theme === 'light' ? 'dark' : 'light';

        if (newTheme === 'dark') {
            html.classList.add('dark');
        } else {
            html.classList.remove('dark');
        }

        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
    };

    // ... inside return ...
    // Update button text to handle null state
    // {theme ? (theme === 'dark' ? 'Switch to Light' : 'Switch to Dark') : 'Loading...'}

    // handleLogout removed as it's handled in Sidebar

    if (!user) {
        return <div className="p-8 text-center text-gray-500">Loading settings...</div>;
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <header>
                <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white">Settings</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Manage your preferences and account</p>
            </header>

            {/* Appearance Section */}
            <section className="bg-white dark:bg-card-dark rounded-2xl border border-gray-200 dark:border-border-dark p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-brand">palette</span>
                    Appearance
                </h2>

                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-border-dark/30 rounded-xl">
                    <div>
                        <p className="font-medium text-gray-900 dark:text-white">Theme Preference</p>
                        <p className="text-sm text-gray-500">Switch between light and dark mode</p>
                    </div>
                    <button
                        onClick={toggleTheme}
                        disabled={!theme}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-border-dark border border-gray-200 dark:border-border-dark rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors shadow-sm disabled:opacity-50"
                    >
                        <span className="material-symbols-outlined text-brand">
                            {theme === 'light' ? 'dark_mode' : 'light_mode'}
                        </span>
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            {!theme ? 'Loading...' : (theme === 'dark' ? 'Switch to Light' : 'Switch to Dark')}
                        </span>
                    </button>
                </div>
            </section>

            {/* Account Section */}
            <section className="bg-white dark:bg-card-dark rounded-2xl border border-gray-200 dark:border-border-dark p-6 shadow-sm">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <span className="material-symbols-outlined text-brand">person</span>
                    Account Info
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
                        <div className="p-3 bg-gray-50 dark:bg-border-dark/30 rounded-lg text-gray-900 dark:text-white font-medium">
                            {user.name || 'Not set'}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Email Address</label>
                        <div className="p-3 bg-gray-50 dark:bg-border-dark/30 rounded-lg text-gray-900 dark:text-white font-medium">
                            {user.email}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Role</label>
                        <div className="p-3 bg-gray-50 dark:bg-border-dark/30 rounded-lg text-gray-900 dark:text-white font-medium flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">verified_user</span>
                            {user.role || 'User'}
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">User ID</label>
                        <div className="p-3 bg-gray-50 dark:bg-border-dark/30 rounded-lg text-gray-500 font-mono text-sm">
                            #{user.id}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
