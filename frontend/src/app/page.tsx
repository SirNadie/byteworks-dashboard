'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, DashboardData } from '../lib/apiClient';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const dashboardData = await api.getDashboard();
        setData(dashboardData);
        setError(null);
        setIsOnline(true);
      } catch (err) {
        setError('Failed to load dashboard data');
        setIsOnline(false);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();

    // Retry connection every 10 seconds if offline
    const interval = setInterval(() => {
      if (!isOnline) {
        fetchDashboard();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [isOnline]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Skeleton Loading
  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div>
          <div className="h-9 bg-gray-200 dark:bg-border-dark rounded w-40 mb-2"></div>
          <div className="h-5 bg-gray-200 dark:bg-border-dark rounded w-72"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-card-dark p-6 rounded-2xl border border-gray-100 dark:border-border-dark">
              <div className="h-12 w-12 bg-gray-200 dark:bg-border-dark rounded-xl mb-4"></div>
              <div className="h-7 bg-gray-200 dark:bg-border-dark rounded w-24 mb-2"></div>
              <div className="h-4 bg-gray-200 dark:bg-border-dark rounded w-20"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-card-dark p-6 rounded-2xl border border-gray-100 dark:border-border-dark h-64"></div>
          <div className="bg-white dark:bg-card-dark p-6 rounded-2xl border border-gray-100 dark:border-border-dark h-64"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Connection Banner */}
      {!isOnline && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
          <span className="material-symbols-outlined text-red-500 animate-pulse">wifi_off</span>
          <div>
            <p className="font-medium text-red-700 dark:text-red-400">Connection lost</p>
            <p className="text-sm text-red-600 dark:text-red-300">Retrying connection...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header>
        <h1 className="text-3xl font-display font-bold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2">
          Overview of your agency performance
        </p>
      </header>

      {/* KPI Stats */}
      {data && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                label: 'Outstanding',
                value: formatCurrency(data.kpis.outstanding_invoices),
                icon: 'payments',
                color: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30',
                change: data.kpis.outstanding_change,
              },
              {
                label: 'Pending Quotes',
                value: data.kpis.pending_quotes.toString(),
                icon: 'description',
                color: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
                change: data.kpis.pending_quotes_change,
              },
              {
                label: 'New Leads',
                value: data.kpis.new_contacts.toString(),
                icon: 'group_add',
                color: 'text-green-500 bg-green-100 dark:bg-green-900/30',
                change: data.kpis.new_contacts_change,
                subtitle: 'this week',
              },
              {
                label: 'Quote Acceptance',
                value: `${data.quote_stats.acceptance_rate}%`,
                icon: 'trending_up',
                color: 'text-purple-500 bg-purple-100 dark:bg-purple-900/30',
              },
            ].map((stat, i) => (
              <div key={i} className="bg-white dark:bg-card-dark p-6 rounded-2xl border border-gray-100 dark:border-border-dark shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${stat.color}`}>
                    <span className="material-symbols-outlined">{stat.icon}</span>
                  </div>
                  {stat.change !== undefined && stat.change !== 0 && (
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${stat.change > 0 ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {stat.change > 0 ? '+' : ''}{stat.change.toFixed(1)}%
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {stat.label}
                  {stat.subtitle && <span className="text-gray-400"> {stat.subtitle}</span>}
                </p>
              </div>
            ))}
          </div>

          {/* Two Column Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Leads */}
            <div className="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-border-dark shadow-sm">
              <div className="p-6 border-b border-gray-100 dark:border-border-dark flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-brand">person_add</span>
                  Recent Leads
                </h2>
                <Link href="/contacts" className="text-sm text-brand hover:text-brand-strong font-medium">
                  View all →
                </Link>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-border-dark">
                {data.recent_contacts.length === 0 ? (
                  <div className="p-8 text-center">
                    <span className="material-symbols-outlined text-4xl text-gray-300 dark:text-gray-600 mb-2">inbox</span>
                    <p className="text-gray-500 dark:text-gray-400">No recent leads</p>
                    <Link href="/contacts" className="mt-3 inline-flex items-center gap-1 text-brand hover:text-brand-strong text-sm font-medium">
                      <span className="material-symbols-outlined text-sm">add</span>
                      Add your first lead
                    </Link>
                  </div>
                ) : (
                  data.recent_contacts.map((contact) => (
                    <div key={contact.id} className="p-4 hover:bg-gray-50 dark:hover:bg-border-dark/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand to-brand-strong text-white flex items-center justify-center font-bold uppercase">
                          {contact.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{contact.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{contact.email}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs text-gray-400">{formatDate(contact.created_at)}</span>
                          <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{contact.source.replace('_', ' ')}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Overdue Invoices */}
            <div className="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-border-dark shadow-sm">
              <div className="p-6 border-b border-gray-100 dark:border-border-dark flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-red-500">warning</span>
                  Overdue Invoices
                </h2>
                <Link href="/invoices?status=overdue" className="text-sm text-brand hover:text-brand-strong font-medium">
                  View all →
                </Link>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-border-dark">
                {data.overdue_invoices.length === 0 ? (
                  <div className="p-8 text-center">
                    <span className="material-symbols-outlined text-4xl text-green-400 mb-2">check_circle</span>
                    <p className="text-gray-500 dark:text-gray-400">No overdue invoices!</p>
                    <p className="text-sm text-gray-400 mt-1">All payments are on track</p>
                  </div>
                ) : (
                  data.overdue_invoices.map((invoice) => (
                    <div key={invoice.id} className="p-4 hover:bg-gray-50 dark:hover:bg-border-dark/40 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{invoice.invoice_number}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{invoice.contact_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(invoice.total)}</p>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            {invoice.days_overdue}d overdue
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Quote Stats */}
          <div className="bg-white dark:bg-card-dark rounded-2xl border border-gray-100 dark:border-border-dark shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-brand">analytics</span>
              Quote Pipeline
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { label: 'Draft', value: data.quote_stats.draft, color: 'bg-gray-500' },
                { label: 'Sent', value: data.quote_stats.sent, color: 'bg-blue-500' },
                { label: 'Accepted', value: data.quote_stats.accepted, color: 'bg-green-500' },
                { label: 'Rejected', value: data.quote_stats.rejected, color: 'bg-red-500' },
                { label: 'Expired', value: data.quote_stats.expired, color: 'bg-orange-500' },
              ].map((stat, i) => (
                <div key={i} className="text-center p-4 bg-gray-50 dark:bg-border-dark/30 rounded-xl">
                  <div className={`inline-flex items-center justify-center w-3 h-3 rounded-full ${stat.color} mb-2`}></div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Error State */}
      {error && !data && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-4xl text-red-400 mb-2">error</span>
          <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
