'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api, Invoice, InvoiceListResponse } from '../../lib/apiClient';
import { useToast, useConfirm } from '@/components/ui/Toast';

const PAGE_SIZE = 10;


// Status styles
const STATUS_STYLES: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export default function InvoicesPage() {
    const searchParams = useSearchParams();
    const clientFilter = searchParams.get('client');

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [clientName, setClientName] = useState<string | null>(null);

    const toast = useToast();
    const confirm = useConfirm();

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Action loading states
    const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

    // Payment method modal state
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<string>('Transfer');

    const fetchInvoices = useCallback(async (page: number, status: string) => {
        setLoading(true);
        try {
            const params: Record<string, string> = {
                page: page.toString(),
                size: PAGE_SIZE.toString(),
            };
            if (status !== 'all') {
                params.status = status;
            }
            if (clientFilter) {
                params.contact_id = clientFilter;
            }
            const response: InvoiceListResponse = await api.getInvoices(params);
            setInvoices(response.items);
            setTotalPages(response.pages);
            setTotalItems(response.total);

            // Get client name from first invoice if filtering by client
            if (clientFilter && response.items.length > 0 && response.items[0].contact) {
                setClientName(response.items[0].contact.name);
            }
        } catch (error) {
            console.error('Failed to fetch invoices', error);
            toast.error('Failed to load invoices');
        } finally {
            setLoading(false);
        }
    }, [toast, clientFilter]);

    useEffect(() => {
        fetchInvoices(currentPage, statusFilter);
    }, [currentPage, statusFilter, fetchInvoices]);

    const handleStatusFilter = (status: string) => {
        setStatusFilter(status);
        setCurrentPage(1);
    };

    // Open the payment modal
    const handleMarkPaidClick = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setPaymentMethod('Transfer'); // Default
        setShowPaymentModal(true);
    };

    // Confirm and process payment
    const handleConfirmPayment = async () => {
        if (!selectedInvoice) return;

        setShowPaymentModal(false);
        setMarkingPaidId(selectedInvoice.id);

        try {
            // Call API with selected payment method
            const response = await api.markInvoicePaid(selectedInvoice.id, paymentMethod);
            const paymentDate = new Date().toISOString();

            // Show success with next invoice info
            if (response.next_invoice) {
                toast.success(
                    `✅ Payment confirmed! Next invoice ${response.next_invoice.invoice_number} created (due: ${new Date(response.next_invoice.due_date).toLocaleDateString()})`,
                );
            } else {
                toast.success(`Invoice ${selectedInvoice.invoice_number} marked as paid!`);
            }

            fetchInvoices(currentPage, statusFilter);
        } catch (error) {
            console.error('Failed to mark invoice as paid', error);
            toast.error('Failed to mark as paid');
        } finally {
            setMarkingPaidId(null);
            setSelectedInvoice(null);
        }
    };

    const handleDelete = async (invoice: Invoice) => {
        const confirmed = await confirm({
            title: 'Delete Invoice',
            message: `Are you sure you want to delete invoice ${invoice.invoice_number}? This action cannot be undone.`,
            confirmText: 'Delete',
            cancelText: 'Cancel',
            type: 'danger'
        });
        if (!confirmed) return;

        // Optimistic UI: Remove immediately
        const previousInvoices = [...invoices];
        setInvoices(prev => prev.filter(i => i.id !== invoice.id));
        toast.success('Invoice deleted');

        try {
            await api.deleteInvoice(invoice.id);
        } catch (error) {
            // Rollback on error
            console.error('Failed to delete invoice', error);
            setInvoices(previousInvoices);
            toast.error('Failed to delete invoice. Restored.');
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const isOverdue = (dueDate: string, status: string) => {
        return status === 'pending' && new Date(dueDate) < new Date();
    };

    // View Invoice PDF (Backend Link)
    const viewInvoicePDF = (invoice: Invoice) => {
        const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
        const url = `${API_BASE}/public/invoice/${invoice.id}/pdf`;
        window.open(url, '_blank');
    };

    // Calculate stats
    const pendingCount = invoices.filter(i => i.status === 'pending').length;
    const paidCount = invoices.filter(i => i.status === 'paid').length;
    const totalPending = invoices.filter(i => i.status === 'pending').reduce((sum, i) => sum + i.total, 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
                        Invoices
                        {clientName && (
                            <span className="text-brand"> - {clientName}</span>
                        )}
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {clientFilter
                            ? `Showing invoices for ${clientName || 'this client'}`
                            : 'Manage client billing and payments.'
                        }
                    </p>
                </div>
                {clientFilter && (
                    <Link
                        href="/invoices"
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-border-dark text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        <span className="material-symbols-outlined text-sm">close</span>
                        Clear filter
                    </Link>
                )}
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-card-dark rounded-xl shadow-sm border border-gray-200 dark:border-border-dark p-4">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">pending</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingCount}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-card-dark rounded-xl shadow-sm border border-gray-200 dark:border-border-dark p-4">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <span className="material-symbols-outlined text-green-600 dark:text-green-400">check_circle</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{paidCount}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Paid</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-card-dark rounded-xl shadow-sm border border-gray-200 dark:border-border-dark p-4">
                    <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-brand/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-brand">payments</span>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalPending)}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Outstanding</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Tabs - Horizontal scroll on mobile */}
            <div className="-mx-4 sm:mx-0 px-4 sm:px-0 overflow-x-auto scrollbar-hide">
                <div className="flex gap-2 border-b border-gray-200 dark:border-border-dark pb-4 min-w-max">
                    {['all', 'pending', 'paid', 'overdue', 'cancelled'].map((status) => (
                        <button
                            key={status}
                            onClick={() => handleStatusFilter(status)}
                            className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${statusFilter === status
                                ? 'bg-brand text-white shadow-sm'
                                : 'bg-gray-100 dark:bg-border-dark text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                }`}
                        >
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Empty State */}
            {!loading && invoices.length === 0 && (
                <div className="bg-white dark:bg-card-dark rounded-xl shadow-sm border border-gray-200 dark:border-border-dark p-12 text-center">
                    <div className="flex flex-col items-center justify-center">
                        <div className="size-16 rounded-full bg-gray-100 dark:bg-border-dark flex items-center justify-center mb-4">
                            <span className="material-symbols-outlined text-3xl text-gray-400">receipt_long</span>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No invoices yet</h3>
                        <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                            Invoices are created automatically when you convert quotes.
                        </p>
                        <Link
                            href="/quotes"
                            className="mt-4 inline-flex items-center gap-2 text-brand hover:text-brand-strong font-medium"
                        >
                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                            View Quotes
                        </Link>
                    </div>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className="bg-white dark:bg-card-dark rounded-xl shadow-sm border border-gray-200 dark:border-border-dark overflow-hidden">
                    <div className="divide-y divide-gray-200 dark:divide-border-dark">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="p-6 animate-pulse">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-2">
                                        <div className="h-5 bg-gray-200 dark:bg-border-dark rounded w-32"></div>
                                        <div className="h-4 bg-gray-200 dark:bg-border-dark rounded w-48"></div>
                                    </div>
                                    <div className="h-6 bg-gray-200 dark:bg-border-dark rounded w-20"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Invoice List */}
            {!loading && invoices.length > 0 && (
                <div className="bg-white dark:bg-card-dark rounded-xl shadow-sm border border-gray-200 dark:border-border-dark overflow-hidden">
                    <div className="divide-y divide-gray-200 dark:divide-border-dark">
                        {invoices.map((invoice) => (
                            <div
                                key={invoice.id}
                                className="p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-border-dark/40 transition-colors group"
                            >
                                {/* Mobile Layout */}
                                <div className="sm:hidden space-y-3">
                                    {/* Header: Invoice Number + Status */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                                                {invoice.invoice_number}
                                            </h3>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${isOverdue(invoice.due_date, invoice.status)
                                                ? STATUS_STYLES.overdue
                                                : STATUS_STYLES[invoice.status] || STATUS_STYLES.pending
                                                }`}>
                                                {isOverdue(invoice.due_date, invoice.status) ? 'Overdue' : invoice.status}
                                            </span>
                                        </div>
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                                            {formatCurrency(invoice.total)}
                                        </p>
                                    </div>

                                    {/* Client Info */}
                                    {invoice.contact && (
                                        <div className="text-sm">
                                            <p className="font-medium text-gray-900 dark:text-white">{invoice.contact.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {invoice.contact.email}
                                                {invoice.contact.phone && ` • ${invoice.contact.phone}`}
                                            </p>
                                        </div>
                                    )}

                                    {/* Dates */}
                                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
                                        <span className="flex items-center gap-1">
                                            <span className="material-symbols-outlined text-xs">calendar_today</span>
                                            Due: {formatDate(invoice.due_date)}
                                        </span>
                                        {invoice.paid_at && (
                                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                <span className="material-symbols-outlined text-xs">check_circle</span>
                                                Paid: {formatDate(invoice.paid_at)}
                                            </span>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-border-dark">
                                        {invoice.status === 'pending' && (
                                            <button
                                                onClick={() => handleMarkPaidClick(invoice)}
                                                disabled={markingPaidId === invoice.id}
                                                className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                                            >
                                                {markingPaidId === invoice.id ? (
                                                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                                                ) : (
                                                    <span className="material-symbols-outlined text-sm">check</span>
                                                )}
                                                Mark Paid
                                            </button>
                                        )}
                                        <button
                                            onClick={() => viewInvoicePDF(invoice)}
                                            className="flex-1 px-3 py-2 bg-brand hover:bg-brand-strong text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1"
                                        >
                                            <span className="material-symbols-outlined text-sm">visibility</span>
                                            View Invoice
                                        </button>
                                        <button
                                            onClick={() => handleDelete(invoice)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <span className="material-symbols-outlined text-xl">delete</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Desktop Layout */}
                                <div className="hidden sm:flex sm:items-center justify-between gap-4">
                                    {/* Invoice Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                {invoice.invoice_number}
                                            </h3>
                                            {invoice.contact && (
                                                <span className="text-gray-500 dark:text-gray-400">•</span>
                                            )}
                                            {invoice.contact && (
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    {invoice.contact.name}
                                                </span>
                                            )}
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${isOverdue(invoice.due_date, invoice.status)
                                                ? STATUS_STYLES.overdue
                                                : STATUS_STYLES[invoice.status] || STATUS_STYLES.pending
                                                }`}>
                                                {isOverdue(invoice.due_date, invoice.status) ? 'Overdue' : invoice.status}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                            {invoice.contact && (
                                                <span className="flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">mail</span>
                                                    {invoice.contact.email}
                                                </span>
                                            )}
                                            {invoice.contact?.phone && (
                                                <span className="flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">phone</span>
                                                    {invoice.contact.phone}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <span className="material-symbols-outlined text-sm">calendar_today</span>
                                                Due: {formatDate(invoice.due_date)}
                                            </span>
                                            {invoice.paid_at && (
                                                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                                                    <span className="material-symbols-outlined text-sm">check_circle</span>
                                                    Paid: {formatDate(invoice.paid_at)}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Amount */}
                                    <div className="text-right">
                                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                                            {formatCurrency(invoice.total)}
                                        </p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
                                            {invoice.items.length} item{invoice.items.length !== 1 ? 's' : ''}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {invoice.status === 'pending' && (
                                            <button
                                                onClick={() => handleMarkPaidClick(invoice)}
                                                disabled={markingPaidId === invoice.id}
                                                className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                                            >
                                                {markingPaidId === invoice.id ? (
                                                    <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                                                ) : (
                                                    <span className="material-symbols-outlined text-sm">check</span>
                                                )}
                                                Mark Paid
                                            </button>
                                        )}
                                        <button
                                            onClick={() => viewInvoicePDF(invoice)}
                                            className="px-3 py-1.5 bg-brand hover:bg-brand-strong text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1"
                                            title="View Invoice"
                                        >
                                            <span className="material-symbols-outlined text-sm">visibility</span>
                                            View
                                        </button>
                                        <button
                                            onClick={() => handleDelete(invoice)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <span className="material-symbols-outlined text-xl">delete</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-border-dark flex items-center justify-between gap-4">
                            <p className="hidden sm:block text-sm text-gray-500 dark:text-gray-400">
                                Showing <span className="font-medium text-gray-900 dark:text-white">{((currentPage - 1) * PAGE_SIZE) + 1}</span> to{' '}
                                <span className="font-medium text-gray-900 dark:text-white">{Math.min(currentPage * PAGE_SIZE, totalItems)}</span> of{' '}
                                <span className="font-medium text-gray-900 dark:text-white">{totalItems}</span> invoices
                            </p>
                            <p className="sm:hidden text-sm text-gray-500 dark:text-gray-400">
                                {totalItems} invoices
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg border border-gray-300 dark:border-border-dark text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-border-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <span className="material-symbols-outlined text-lg">chevron_left</span>
                                </button>
                                <span className="text-sm text-gray-600 dark:text-gray-300 px-1 sm:px-2 min-w-[80px] text-center">
                                    {currentPage} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg border border-gray-300 dark:border-border-dark text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-border-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <span className="material-symbols-outlined text-lg">chevron_right</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Payment Method Modal */}
            {showPaymentModal && selectedInvoice && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-card-dark rounded-2xl shadow-2xl border border-gray-200 dark:border-border-dark w-full max-w-md animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-200 dark:border-border-dark">
                            <div className="flex items-center gap-3">
                                <div className="size-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-2xl text-green-600 dark:text-green-400">payments</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Confirm Payment
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {selectedInvoice.invoice_number}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
                            {/* Invoice Amount */}
                            <div className="bg-gray-50 dark:bg-border-dark rounded-xl p-4 text-center">
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Amount to Pay</p>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                                    {formatCurrency(selectedInvoice.total)}
                                </p>
                            </div>

                            {/* Payment Method Select */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Payment Method
                                </label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full px-4 py-3 bg-white dark:bg-border-dark border border-gray-300 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                                >
                                    <option value="Transfer">Transfer</option>
                                    <option value="Cash">Cash</option>
                                </select>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t border-gray-200 dark:border-border-dark flex gap-3">
                            <button
                                onClick={() => {
                                    setShowPaymentModal(false);
                                    setSelectedInvoice(null);
                                }}
                                className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-border-dark text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmPayment}
                                className="flex-1 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-lg">check</span>
                                Confirm Payment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
