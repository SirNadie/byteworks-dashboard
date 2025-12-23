'use client';

import React from 'react';
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Legend,
    Tooltip,
} from 'recharts';

interface QuotePipelineChartProps {
    data: {
        draft: number;
        sent: number;
        accepted: number;
        rejected: number;
        expired: number;
    };
}

const COLORS = {
    draft: '#6B7280',     // Gray
    sent: '#3B82F6',      // Blue
    accepted: '#10B981',  // Green
    rejected: '#EF4444',  // Red
    expired: '#F97316',   // Orange
};

const LABELS = {
    draft: 'Draft',
    sent: 'Sent',
    accepted: 'Accepted',
    rejected: 'Rejected',
    expired: 'Expired',
};

export function QuotePipelineChart({ data }: QuotePipelineChartProps) {
    const chartData = Object.entries(data)
        .map(([key, value]) => ({
            name: LABELS[key as keyof typeof LABELS],
            value,
            color: COLORS[key as keyof typeof COLORS],
        }))
        .filter(item => item.value > 0);

    const total = chartData.reduce((sum, item) => sum + item.value, 0);

    if (total === 0) {
        return (
            <div className="flex items-center justify-center h-64 text-gray-400 dark:text-gray-500">
                <p>No quotes yet</p>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={280}>
            <PieChart>
                <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={(props) => {
                        const { name, percent } = props;
                        if (percent && percent > 0.05 && name) {
                            return `${name} ${Math.round(percent * 100)}%`;
                        }
                        return '';
                    }}
                    labelLine={false}
                >
                    {chartData.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={entry.color}
                            className="hover:opacity-80 transition-opacity cursor-pointer"
                        />
                    ))}
                </Pie>
                <Tooltip
                    content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                                    <p className="font-medium text-gray-900 dark:text-white">
                                        {data.name}
                                    </p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {data.value} quotes
                                    </p>
                                </div>
                            );
                        }
                        return null;
                    }}
                />
                <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value) => (
                        <span className="text-sm text-gray-600 dark:text-gray-400">{value}</span>
                    )}
                />
            </PieChart>
        </ResponsiveContainer>
    );
}
