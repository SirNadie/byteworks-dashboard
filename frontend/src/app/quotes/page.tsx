'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { api, Quote } from '../../lib/apiClient';

// Currency symbols
const CURRENCIES: Record<string, string> = {
    USD: '$',
    TTD: 'TT$',
};

// Status badge colors
const STATUS_STYLES: Record<string, string> = {
    draft: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    accepted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    expired: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

// Status display names (draft shows as "pending" since it's not really a draft)
const STATUS_DISPLAY: Record<string, string> = {
    draft: 'pending',
    sent: 'sent',
    accepted: 'accepted',
    rejected: 'rejected',
    expired: 'expired',
};

// Get display status - considers expired drafts
const getDisplayStatus = (status: string, validUntil: string) => {
    const isExpiredQuote = new Date(validUntil) < new Date();
    if (isExpiredQuote && status === 'draft') {
        return 'expired';
    }
    return STATUS_DISPLAY[status] || status;
};

export default function QuotesPage() {
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchQuotes = async () => {
            try {
                const response = await api.getQuotes();
                setQuotes(response.items);
            } catch (err) {
                console.error('Failed to fetch quotes', err);
                setError('Failed to load quotes');
            } finally {
                setLoading(false);
            }
        };
        fetchQuotes();
    }, []);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const isExpired = (validUntil: string) => {
        return new Date(validUntil) < new Date();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-4xl text-brand animate-spin">progress_activity</span>
                    <p className="text-gray-500 dark:text-gray-400">Loading quotes...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3 text-red-500">
                    <span className="material-symbols-outlined text-4xl">error</span>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white">
                        Quotes
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Manage your quotations and estimates
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {quotes.length} quote{quotes.length !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            {/* Quotes List */}
            {quotes.length === 0 ? (
                <div className="bg-white dark:bg-card-dark rounded-xl shadow-sm border border-gray-200 dark:border-border-dark p-12 text-center">
                    <span className="material-symbols-outlined text-6xl text-gray-300 dark:text-gray-600 mb-4">
                        description
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        No quotes yet
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">
                        Create your first quote from the Leads page
                    </p>
                    <Link
                        href="/contacts"
                        className="inline-flex items-center gap-2 bg-brand text-white px-6 py-2.5 rounded-lg font-medium hover:bg-brand-dark transition-colors"
                    >
                        <span className="material-symbols-outlined text-sm">arrow_back</span>
                        Go to Leads
                    </Link>
                </div>
            ) : (
                <>
                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                        {quotes.map((quote) => (
                            <div key={quote.id} className="bg-white dark:bg-card-dark rounded-xl shadow-sm border border-gray-200 dark:border-border-dark p-4 transition-all active:scale-[0.99]">
                                {/* Header with quote number and status */}
                                <div className="flex items-start justify-between gap-3 mb-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center flex-shrink-0">
                                            <span className="material-symbols-outlined text-brand">description</span>
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-semibold text-gray-900 dark:text-white">{quote.quote_number}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {quote.items.length} item{quote.items.length !== 1 ? 's' : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize flex-shrink-0 ${STATUS_STYLES[getDisplayStatus(quote.status, quote.valid_until)] || STATUS_STYLES.pending}`}>
                                        {getDisplayStatus(quote.status, quote.valid_until)}
                                    </span>
                                </div>

                                {/* Client Info */}
                                <div className="space-y-1 mb-3">
                                    <p className="font-medium text-gray-900 dark:text-white truncate">{quote.client_name}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{quote.client_email}</p>
                                </div>

                                {/* Amount */}
                                <div className="mb-4">
                                    <p className="text-2xl font-bold text-brand">
                                        {CURRENCIES[quote.currency] || '$'}{quote.total.toFixed(2)}
                                        <span className="text-xs font-normal text-gray-400 ml-1">{quote.currency}</span>
                                    </p>
                                </div>

                                {/* Footer with dates and actions */}
                                <div className="pt-3 border-t border-gray-100 dark:border-border-dark flex items-center justify-between">
                                    <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                        <div className="flex items-center gap-1">
                                            <span>Created:</span>
                                            <span className="text-gray-700 dark:text-gray-300">{formatDate(quote.created_at)}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span>Valid:</span>
                                            <span className={isExpired(quote.valid_until) ? 'text-red-500 font-medium' : 'text-gray-700 dark:text-gray-300'}>
                                                {formatDate(quote.valid_until)}
                                                {isExpired(quote.valid_until) && ' (Expired)'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Action Buttons - Always visible on mobile */}
                                    <div className="flex items-center gap-1">
                                        <Link
                                            href={`/quotes/${quote.id}`}
                                            className="p-2.5 rounded-lg bg-brand/10 text-brand hover:bg-brand/20 transition-colors"
                                            title="View Quote"
                                        >
                                            <span className="material-symbols-outlined text-xl">visibility</span>
                                        </Link>
                                        <button
                                            className="p-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                            title="Send Quote"
                                        >
                                            <span className="material-symbols-outlined text-xl">send</span>
                                        </button>
                                        <button
                                            className="p-2.5 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-500 hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors"
                                            title="Download PDF"
                                        >
                                            <span className="material-symbols-outlined text-xl">download</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden md:block bg-white dark:bg-card-dark rounded-xl shadow-sm border border-gray-200 dark:border-border-dark overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-border-dark/50">
                                <tr>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Quote
                                    </th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Client
                                    </th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Amount
                                    </th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Valid Until
                                    </th>
                                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Created
                                    </th>
                                    <th className="text-right px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-border-dark">
                                {quotes.map((quote) => (
                                    <tr key={quote.id} className="group hover:bg-gray-50 dark:hover:bg-border-dark/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-brand">description</span>
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-gray-900 dark:text-white">
                                                        {quote.quote_number}
                                                    </p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                                        {quote.items.length} item{quote.items.length !== 1 ? 's' : ''}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white">
                                                    {quote.client_name}
                                                </p>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {quote.client_email}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div>
                                                <p className="font-semibold text-gray-900 dark:text-white">
                                                    {CURRENCIES[quote.currency] || '$'}{quote.total.toFixed(2)}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {quote.currency}
                                                </p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[getDisplayStatus(quote.status, quote.valid_until)] || STATUS_STYLES.pending}`}>
                                                {getDisplayStatus(quote.status, quote.valid_until)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className={`text-sm ${isExpired(quote.valid_until) ? 'text-red-500' : 'text-gray-900 dark:text-white'}`}>
                                                {formatDate(quote.valid_until)}
                                            </p>
                                            {isExpired(quote.valid_until) && (
                                                <p className="text-xs text-red-500">Expired</p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-gray-900 dark:text-white">
                                                {formatDate(quote.created_at)}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                <Link
                                                    href={`/quotes/${quote.id}`}
                                                    className="p-2 text-gray-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors"
                                                    title="View Quote"
                                                >
                                                    <span className="material-symbols-outlined text-sm">visibility</span>
                                                </Link>
                                                <button
                                                    className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                    title="Send Quote"
                                                >
                                                    <span className="material-symbols-outlined text-sm">send</span>
                                                </button>
                                                <button
                                                    className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                                    title="Download PDF"
                                                >
                                                    <span className="material-symbols-outlined text-sm">download</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}
