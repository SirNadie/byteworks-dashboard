'use client';

import React from 'react';

interface SkeletonProps {
    className?: string;
}

/**
 * Base skeleton component with shimmer animation
 */
export function Skeleton({ className = '' }: SkeletonProps) {
    return (
        <div
            className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`}
        />
    );
}

/**
 * Skeleton for card layouts
 */
export function SkeletonCard({ className = '' }: SkeletonProps) {
    return (
        <div className={`bg-white dark:bg-card-dark p-6 rounded-2xl border border-gray-100 dark:border-border-dark ${className}`}>
            <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-7 w-24 mb-2" />
            <Skeleton className="h-4 w-20" />
        </div>
    );
}

/**
 * Skeleton for table rows
 */
export function SkeletonTableRow({ columns = 5 }: { columns?: number }) {
    return (
        <tr className="border-b border-gray-100 dark:border-border-dark">
            {[...Array(columns)].map((_, i) => (
                <td key={i} className="px-4 py-4">
                    <Skeleton className={`h-4 ${i === 0 ? 'w-32' : i === columns - 1 ? 'w-20' : 'w-24'}`} />
                </td>
            ))}
        </tr>
    );
}

/**
 * Skeleton for table with header and rows
 */
export function SkeletonTable({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
    return (
        <div className="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-border-dark overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-border-dark/50">
                        <tr>
                            {[...Array(columns)].map((_, i) => (
                                <th key={i} className="px-4 py-3 text-left">
                                    <Skeleton className="h-4 w-20" />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {[...Array(rows)].map((_, i) => (
                            <SkeletonTableRow key={i} columns={columns} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

/**
 * Skeleton for list items
 */
export function SkeletonListItem() {
    return (
        <div className="p-4 flex items-center gap-3 border-b border-gray-100 dark:border-border-dark last:border-0">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-4 w-16" />
        </div>
    );
}

/**
 * Skeleton for list container
 */
export function SkeletonList({ items = 5 }: { items?: number }) {
    return (
        <div className="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-border-dark">
            {[...Array(items)].map((_, i) => (
                <SkeletonListItem key={i} />
            ))}
        </div>
    );
}

/**
 * Skeleton for page header
 */
export function SkeletonHeader() {
    return (
        <div className="flex items-center justify-between mb-6">
            <div>
                <Skeleton className="h-8 w-40 mb-2" />
                <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
    );
}

/**
 * Full page skeleton with header and table
 */
export function SkeletonPage({ tableRows = 5, tableColumns = 5 }: { tableRows?: number; tableColumns?: number }) {
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <SkeletonHeader />
            <SkeletonTable rows={tableRows} columns={tableColumns} />
        </div>
    );
}

/**
 * Dashboard skeleton
 */
export function SkeletonDashboard() {
    return (
        <div className="space-y-8 animate-pulse">
            <div>
                <Skeleton className="h-9 w-40 mb-2" />
                <Skeleton className="h-5 w-72" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                    <SkeletonCard key={i} />
                ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SkeletonList items={5} />
                <SkeletonList items={5} />
            </div>
        </div>
    );
}
