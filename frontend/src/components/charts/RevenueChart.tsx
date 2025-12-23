'use client';

import React from 'react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from 'recharts';

interface RevenueChartProps {
    data?: {
        month: string;
        revenue: number;
        invoices: number;
    }[];
}

// Demo data - will be replaced with real API data
const DEMO_DATA = [
    { month: 'Jul', revenue: 2400, invoices: 3 },
    { month: 'Aug', revenue: 3200, invoices: 4 },
    { month: 'Sep', revenue: 2800, invoices: 3 },
    { month: 'Oct', revenue: 4100, invoices: 5 },
    { month: 'Nov', revenue: 3600, invoices: 4 },
    { month: 'Dec', revenue: 4800, invoices: 6 },
];

export function RevenueChart({ data = DEMO_DATA }: RevenueChartProps) {
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
        }).format(value);

    return (
        <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="var(--color-border, #E5E7EB)"
                />
                <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    dy={10}
                />
                <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#6B7280', fontSize: 12 }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    dx={-10}
                />
                <Tooltip
                    content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                            return (
                                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                                    <p className="font-medium text-gray-900 dark:text-white mb-1">
                                        {label}
                                    </p>
                                    <p className="text-sm text-emerald-600 dark:text-emerald-400">
                                        Revenue: {formatCurrency(payload[0].value as number)}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {payload[0].payload.invoices} invoices paid
                                    </p>
                                </div>
                            );
                        }
                        return null;
                    }}
                />
                <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10B981"
                    strokeWidth={2}
                    fill="url(#revenueGradient)"
                    animationDuration={1000}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
