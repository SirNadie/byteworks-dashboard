'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api, Contact } from '../../lib/apiClient';
import { useToast } from '@/components/ui/Toast';

const PAGE_SIZE = 10;

export default function ClientsPage() {
    const [clients, setClients] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const toast = useToast();

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setCurrentPage(1);
        }, 300);

        return () => clearTimeout(timer);
    }, [search]);

    const fetchClients = useCallback(async (searchTerm: string, page: number) => {
        setLoading(true);
        try {
            const params: Record<string, string> = {
                page: page.toString(),
                size: PAGE_SIZE.toString(),
                // Only show converted contacts (clients)
                status: 'CONVERTED',
            };
            if (searchTerm.trim()) {
                params.search = searchTerm.trim();
            }
            const response = await api.getContacts(params);
            setClients(response.items);
            setTotalPages(response.pages);
            setTotalItems(response.total);
        } catch (error) {
            console.error('Failed to fetch clients', error);
            toast.error('Failed to load clients');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchClients(debouncedSearch, currentPage);
    }, [debouncedSearch, currentPage, fetchClients]);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Clients</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Converted leads who accepted quotes.</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <span className="material-symbols-outlined text-sm mr-1.5">verified</span>
                        {totalItems} Client{totalItems !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            {/* Search */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-md">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <span className="material-symbols-outlined font-light">search</span>
                    </span>
                    <input
                        type="text"
                        placeholder="Search clients..."
                        className="pl-10 pr-10 block w-full rounded-xl border border-gray-300 dark:border-border-dark bg-white dark:bg-card-dark text-gray-900 dark:text-white placeholder:text-gray-400 focus:ring-2 focus:ring-brand focus:border-brand sm:text-sm py-2.5 shadow-sm transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                            title="Clear search"
                        >
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Empty State */}
            {!loading && clients.length === 0 && (
                <div className="bg-white dark:bg-card-dark rounded-xl shadow-sm border border-gray-200 dark:border-border-dark p-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                        <div className="size-16 rounded-full bg-gray-100 dark:bg-border-dark flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-3xl text-gray-400">group</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No clients yet</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                            Clients appear here when leads accept quotes and convert into paying customers.
                        </p>
                        <Link
                            href="/contacts"
                            className="mt-4 inline-flex items-center gap-2 text-brand hover:text-brand-strong font-medium"
                        >
                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                            View Leads
                        </Link>
                    </div>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="bg-white dark:bg-card-dark rounded-xl shadow-sm border border-gray-200 dark:border-border-dark p-5 animate-pulse">
                            <div className="flex items-start gap-4">
                                <div className="h-14 w-14 rounded-full bg-gray-200 dark:bg-border-dark flex-shrink-0"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-5 bg-gray-200 dark:bg-border-dark rounded w-3/4"></div>
                                    <div className="h-4 bg-gray-200 dark:bg-border-dark rounded w-1/2"></div>
                                </div>
                            </div>
                            <div className="mt-4 space-y-2">
                                <div className="h-4 bg-gray-200 dark:bg-border-dark rounded w-full"></div>
                                <div className="h-4 bg-gray-200 dark:bg-border-dark rounded w-2/3"></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Client Cards */}
            {!loading && clients.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {clients.map((client) => (
                        <div
                            key={client.id}
                            className="bg-white dark:bg-card-dark rounded-xl shadow-sm border border-gray-200 dark:border-border-dark p-5 hover:shadow-md hover:border-brand/30 transition-all group"
                        >
                            {/* Header */}
                            <div className="flex items-start gap-4">
                                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white flex items-center justify-center font-bold text-xl uppercase flex-shrink-0 shadow-md">
                                    {client.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                        {client.name}
                                    </h3>
                                    {client.company && (
                                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                            {client.company}
                                        </p>
                                    )}
                                </div>
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                    <span className="material-symbols-outlined text-xs mr-0.5">verified</span>
                                    Client
                                </span>
                            </div>

                            {/* Contact Info */}
                            <div className="mt-4 space-y-2">
                                <a
                                    href={`mailto:${client.email}`}
                                    className="text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2 hover:text-brand transition-colors"
                                >
                                    <span className="material-symbols-outlined text-[18px] text-gray-400">mail</span>
                                    <span className="truncate">{client.email}</span>
                                </a>
                                {client.phone && (
                                    <a
                                        href={`tel:${client.phone}`}
                                        className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2 hover:text-brand transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-[18px] text-gray-400">call</span>
                                        {client.phone}
                                    </a>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-border-dark flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                    <span className="material-symbols-outlined text-sm">calendar_today</span>
                                    Client since {formatDate(client.updated_at)}
                                </div>
                                <Link
                                    href={`/invoices?client=${client.id}`}
                                    className="text-sm text-brand hover:text-brand-strong font-medium flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                                >
                                    View Invoices
                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-gray-300 dark:border-border-dark text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-border-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg">chevron_left</span>
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-300 px-3">
                        Page {currentPage} of {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border border-gray-300 dark:border-border-dark text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-border-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg">chevron_right</span>
                    </button>
                </div>
            )}
        </div>
    );
}
