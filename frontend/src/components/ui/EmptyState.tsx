'use client';

import React from 'react';
import Link from 'next/link';

interface EmptyStateProps {
    icon?: string;
    title: string;
    description?: string;
    actionLabel?: string;
    actionHref?: string;
    onAction?: () => void;
    variant?: 'default' | 'success' | 'warning' | 'error';
}

const variantStyles = {
    default: {
        iconBg: 'bg-gray-100 dark:bg-gray-800',
        iconColor: 'text-gray-400 dark:text-gray-500',
    },
    success: {
        iconBg: 'bg-green-100 dark:bg-green-900/30',
        iconColor: 'text-green-500 dark:text-green-400',
    },
    warning: {
        iconBg: 'bg-amber-100 dark:bg-amber-900/30',
        iconColor: 'text-amber-500 dark:text-amber-400',
    },
    error: {
        iconBg: 'bg-red-100 dark:bg-red-900/30',
        iconColor: 'text-red-500 dark:text-red-400',
    },
};

/**
 * Empty state component for when there's no data to display.
 * Shows an icon, title, description, and optional action button.
 */
export function EmptyState({
    icon = 'inbox',
    title,
    description,
    actionLabel,
    actionHref,
    onAction,
    variant = 'default',
}: EmptyStateProps) {
    const styles = variantStyles[variant];

    return (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className={`w-16 h-16 rounded-full ${styles.iconBg} flex items-center justify-center mb-4`}>
                <span className={`material-symbols-outlined text-3xl ${styles.iconColor}`}>
                    {icon}
                </span>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {title}
            </h3>

            {description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">
                    {description}
                </p>
            )}

            {(actionLabel && actionHref) && (
                <Link
                    href={actionHref}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-strong text-white rounded-lg font-medium text-sm transition-colors"
                >
                    <span className="material-symbols-outlined text-lg">add</span>
                    {actionLabel}
                </Link>
            )}

            {(actionLabel && onAction && !actionHref) && (
                <button
                    onClick={onAction}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-brand hover:bg-brand-strong text-white rounded-lg font-medium text-sm transition-colors"
                >
                    <span className="material-symbols-outlined text-lg">add</span>
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

/**
 * Empty state specifically for tables/lists with no data
 */
export function NoDataState({
    entityName = 'items',
    actionLabel,
    actionHref,
}: {
    entityName?: string;
    actionLabel?: string;
    actionHref?: string;
}) {
    return (
        <EmptyState
            icon="folder_open"
            title={`No ${entityName} yet`}
            description={`Get started by creating your first ${entityName.slice(0, -1)}.`}
            actionLabel={actionLabel}
            actionHref={actionHref}
        />
    );
}

/**
 * Empty state for search/filter with no results
 */
export function NoResultsState({
    searchTerm,
    onClear,
}: {
    searchTerm?: string;
    onClear?: () => void;
}) {
    return (
        <EmptyState
            icon="search_off"
            title="No results found"
            description={searchTerm ? `No results for "${searchTerm}". Try a different search term.` : 'Try adjusting your filters.'}
            actionLabel={onClear ? 'Clear filters' : undefined}
            onAction={onClear}
        />
    );
}

/**
 * Success empty state (e.g., all tasks completed)
 */
export function SuccessState({
    title = 'All done!',
    description,
}: {
    title?: string;
    description?: string;
}) {
    return (
        <EmptyState
            icon="check_circle"
            title={title}
            description={description}
            variant="success"
        />
    );
}

/**
 * Error empty state with retry action
 */
export function ErrorState({
    title = 'Something went wrong',
    description = 'Failed to load data. Please try again.',
    onRetry,
}: {
    title?: string;
    description?: string;
    onRetry?: () => void;
}) {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl text-red-500 dark:text-red-400">
                    error
                </span>
            </div>

            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {title}
            </h3>

            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mb-4">
                {description}
            </p>

            {onRetry && (
                <button
                    onClick={onRetry}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded-lg font-medium text-sm transition-colors"
                >
                    <span className="material-symbols-outlined text-lg">refresh</span>
                    Try again
                </button>
            )}
        </div>
    );
}
