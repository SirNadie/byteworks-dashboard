'use client';

import { useEffect, useState } from 'react';

export default function DashboardPage() {
  // Basic state for rapid migration demo
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Welcome to your new Next.js Dashboard.
        </p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Revenue', value: '$45,231.89', icon: 'payments', color: 'text-green-500' },
          { label: 'Active Projects', value: '12', icon: 'rocket_launch', color: 'text-blue-500' },
          { label: 'Pending Quotes', value: '5', icon: 'description', color: 'text-orange-500' },
          { label: 'New Leads', value: '+3 this week', icon: 'group_add', color: 'text-purple-500' },
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-card-dark p-6 rounded-2xl border border-gray-100 dark:border-border-dark shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-gray-50 dark:bg-border-dark ${stat.color}`}>
                <span className="material-symbols-outlined">{stat.icon}</span>
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</h3>
            <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="p-8 bg-brand/5 dark:bg-brand/10 rounded-2xl border border-brand/10 dark:border-brand/20">
        <h3 className="text-xl font-bold text-brand-strong dark:text-brand mb-2">Migration Successful! 🚀</h3>
        <p className="text-gray-700 dark:text-gray-300">
          Your frontend is now running on <strong>Next.js 15</strong> with <strong>TypeScript</strong> and <strong>TailwindCSS</strong>.
        </p>
        <div className="mt-4 flex gap-4">
          <button className="px-4 py-2 bg-brand hover:bg-brand-strong text-white rounded-lg font-medium transition-colors">
            Explore Components
          </button>
          <button className="px-4 py-2 bg-white dark:bg-card-dark border border-gray-200 dark:border-border-dark hover:bg-gray-50 dark:hover:bg-border-dark text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors">
            View Source
          </button>
        </div>
      </div>
    </div>
  );
}
