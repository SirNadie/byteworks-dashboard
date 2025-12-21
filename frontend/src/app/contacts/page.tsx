'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api, Contact, ContactCreate, ContactUpdate } from '../../lib/apiClient';
import ContactForm from '@/components/contacts/ContactForm';
import { useToast, useConfirm } from '@/components/ui/Toast';

const PAGE_SIZE = 10;

export default function LeadsPage() {
    const [leads, setLeads] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    // Toast & Confirm hooks
    const toast = useToast();
    const confirm = useConfirm();

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Form State
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [formLoading, setFormLoading] = useState(false);

    // Quote creation loading state
    const [creatingQuoteForId, setCreatingQuoteForId] = useState<string | null>(null);

    // Debounce search input
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
            setCurrentPage(1); // Reset to page 1 on new search
        }, 300);

        return () => clearTimeout(timer);
    }, [search]);

    const fetchLeads = useCallback(async (searchTerm: string, page: number) => {
        setLoading(true);
        try {
            const params: Record<string, string> = {
                page: page.toString(),
                size: PAGE_SIZE.toString(),
                // Only show leads that don't have a quote yet (NEW and drafting)
                statuses: 'NEW,drafting',
            };
            if (searchTerm.trim()) {
                params.search = searchTerm.trim();
            }
            const response = await api.getContacts(params);
            setLeads(response.items);
            setTotalPages(response.pages);
            setTotalItems(response.total);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchLeads(debouncedSearch, currentPage);
    }, [debouncedSearch, currentPage, fetchLeads]);

    const router = useRouter();

    const handleCreateQuote = async (lead: Contact) => {
        setCreatingQuoteForId(lead.id);
        try {
            // Update lead status to 'drafting' 
            await api.updateContact(lead.id, { status: 'drafting' });
            // Navigate to quote creation page with lead ID
            router.push(`/quotes/new?leadId=${lead.id}`);
        } catch (error) {
            console.error('Failed to start quote creation', error);
            toast.error('Failed to start quote creation');
            setCreatingQuoteForId(null);
        }
    };

    const handleCreate = () => {
        setEditingContact(null);
        setIsFormOpen(true);
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            title: 'Delete Lead',
            message: 'Are you sure you want to delete this lead? This action cannot be undone.',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            type: 'danger'
        });
        if (!confirmed) return;

        try {
            await api.deleteContact(id);
            toast.success('Lead deleted successfully');
            fetchLeads(debouncedSearch, currentPage);
        } catch (error) {
            console.error('Failed to delete lead', error);
            toast.error('Failed to delete lead');
        }
    };

    const handleFormSubmit = async (data: ContactCreate | ContactUpdate) => {
        setFormLoading(true);
        try {
            if (editingContact) {
                await api.updateContact(editingContact.id, data);
            } else {
                await api.createContact(data as ContactCreate);
            }
            setIsFormOpen(false);
            toast.success(editingContact ? 'Lead updated successfully' : 'Lead created successfully');
            fetchLeads(debouncedSearch, currentPage);
        } catch (error) {
            console.error('Failed to save lead', error);
            toast.error('Failed to save lead');
        } finally {
            setFormLoading(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Leads</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Incoming contact requests and prospects.</p>
                </div>
                <button
                    onClick={handleCreate}
                    className="btn btn-primary flex items-center gap-2 shadow-lg shadow-brand/20"
                >
                    <span className="material-symbols-outlined">add</span>
                    Add Lead
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-md">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <span className="material-symbols-outlined font-light">search</span>
                    </span>
                    <input
                        type="text"
                        placeholder="Search by name, email, or company..."
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
                {search && (
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        {loading ? (
                            <span className="flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                                Searching...
                            </span>
                        ) : (
                            <span>Found {totalItems} result{totalItems !== 1 ? 's' : ''}</span>
                        )}
                    </div>
                )}
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {!loading && leads.length === 0 && (
                    <div className="bg-white dark:bg-card-dark rounded-xl shadow-sm border border-gray-200 dark:border-border-dark p-8 text-center">
                        <div className="flex flex-col items-center justify-center">
                            <div className="size-12 rounded-full bg-gray-100 dark:bg-border-dark flex items-center justify-center mb-3">
                                <span className="material-symbols-outlined text-gray-400">person_off</span>
                            </div>
                            <p className="font-medium text-gray-500 dark:text-gray-400">No leads found</p>
                            <p className="text-sm mt-1 text-gray-400">Try adjusting your search or add a new lead.</p>
                        </div>
                    </div>
                )}

                {loading ? (
                    // Mobile Loading Skeletons
                    Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="bg-white dark:bg-card-dark rounded-xl shadow-sm border border-gray-200 dark:border-border-dark p-4 animate-pulse">
                            <div className="flex items-start gap-3">
                                <div className="h-12 w-12 rounded-full bg-gray-200 dark:bg-border-dark flex-shrink-0"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-200 dark:bg-border-dark rounded w-3/4"></div>
                                    <div className="h-3 bg-gray-200 dark:bg-border-dark rounded w-full"></div>
                                    <div className="h-3 bg-gray-200 dark:bg-border-dark rounded w-1/2"></div>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    leads.map((lead) => (
                        <div key={lead.id} className="bg-white dark:bg-card-dark rounded-xl shadow-sm border border-gray-200 dark:border-border-dark p-4 transition-all active:scale-[0.99]">
                            {/* Header with avatar and name */}
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-brand to-brand-strong text-white flex items-center justify-center font-bold text-xl uppercase flex-shrink-0 shadow-sm">
                                        {lead.name.charAt(0)}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="text-base font-semibold text-gray-900 dark:text-white truncate">{lead.name}</div>
                                        {lead.company && (
                                            <div className="text-sm text-gray-500 dark:text-gray-400 truncate">{lead.company}</div>
                                        )}
                                    </div>
                                </div>
                                {/* Status Badge */}
                                <span className={`badge uppercase tracking-wider shadow-sm text-xs flex-shrink-0 ${lead.status === 'NEW' ? 'badge-new' :
                                    lead.status === 'drafting' ? 'badge-drafting' :
                                        lead.status === 'quoted' ? 'badge-quoted' :
                                            lead.status === 'QUALIFIED' ? 'badge-qualified' :
                                                lead.status === 'CONVERTED' ? 'badge-converted' :
                                                    lead.status === 'CONTACTED' ? 'badge-contacted' :
                                                        'badge-draft'
                                    }`}>
                                    {lead.status.toLowerCase()}
                                </span>
                            </div>

                            {/* Contact Info */}
                            <div className="mt-4 space-y-2">
                                <a href={`mailto:${lead.email}`} className="text-sm text-gray-700 dark:text-gray-200 flex items-center gap-2 font-medium">
                                    <span className="material-symbols-outlined text-[18px] opacity-70">mail</span>
                                    <span className="truncate">{lead.email}</span>
                                </a>
                                {lead.phone && (
                                    <a href={`tel:${lead.phone}`} className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-[18px] opacity-70">call</span>
                                        {lead.phone}
                                    </a>
                                )}
                            </div>

                            {/* Footer with source, date, and actions */}
                            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-border-dark flex items-center justify-between">
                                <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                                    <div className="flex items-center gap-1.5 capitalize">
                                        <div className={`size-2 rounded-full ${lead.source === 'linkedin' ? 'bg-[#0077b5]' :
                                            lead.source === 'web_form' ? 'bg-brand' :
                                                'bg-gray-400'
                                            }`}></div>
                                        {lead.source.replace('_', ' ')}
                                    </div>
                                    <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                                </div>

                                {/* Action Buttons - Always visible on mobile */}
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleCreateQuote(lead)}
                                        className={`p-2.5 rounded-lg transition-colors ${creatingQuoteForId === lead.id
                                            ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                            : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                                            }`}
                                        title="Create Quote"
                                        disabled={creatingQuoteForId !== null}
                                    >
                                        <span className={`material-symbols-outlined text-xl ${creatingQuoteForId === lead.id ? 'animate-spin' : ''}`}>
                                            {creatingQuoteForId === lead.id ? 'progress_activity' : 'request_quote'}
                                        </span>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(lead.id)}
                                        className="text-red-500 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 p-2.5 rounded-lg transition-colors"
                                        title="Delete"
                                    >
                                        <span className="material-symbols-outlined text-xl">delete</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block bg-white dark:bg-card-dark rounded-xl shadow-sm border border-gray-200 dark:border-border-dark overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-border-dark">
                        <thead className="bg-gray-50 dark:bg-border-dark/30">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Name
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Contact Info
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Source
                                </th>
                                <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Created
                                </th>
                                <th scope="col" className="relative px-6 py-4">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-border-dark bg-white dark:bg-card-dark">
                            {!loading && leads.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        <div className="flex flex-col items-center justify-center">
                                            <div className="size-12 rounded-full bg-gray-100 dark:bg-border-dark flex items-center justify-center mb-3">
                                                <span className="material-symbols-outlined text-gray-400">person_off</span>
                                            </div>
                                            <p className="font-medium">No leads found</p>
                                            <p className="text-sm mt-1">Try adjusting your search or add a new lead.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {loading ? (
                                // Loading Skeleton Rows
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 dark:bg-border-dark rounded w-32"></div></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 dark:bg-border-dark rounded w-48 mb-2"></div><div className="h-3 bg-gray-200 dark:bg-border-dark rounded w-24"></div></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="h-6 bg-gray-200 dark:bg-border-dark rounded-full w-20"></div></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 dark:bg-border-dark rounded w-24"></div></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="h-4 bg-gray-200 dark:bg-border-dark rounded w-24"></div></td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right"><div className="h-4 bg-gray-200 dark:bg-border-dark rounded w-8 ml-auto"></div></td>
                                    </tr>
                                ))
                            ) : (
                                leads.map((lead) => (
                                    <tr key={lead.id} className="group hover:bg-gray-50 dark:hover:bg-border-dark/40 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand to-brand-strong text-white flex items-center justify-center font-bold text-lg uppercase flex-shrink-0 shadow-sm">
                                                    {lead.name.charAt(0)}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{lead.name}</div>
                                                    {lead.company && (
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{lead.company}</div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <a href={`mailto:${lead.email}`} className="text-sm text-gray-700 dark:text-gray-200 hover:text-brand transition-colors flex items-center gap-1.5 font-medium">
                                                    <span className="material-symbols-outlined text-[16px] opacity-70">mail</span>
                                                    {lead.email}
                                                </a>
                                                {lead.phone && (
                                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[14px] opacity-70">call</span>
                                                        {lead.phone}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`badge uppercase tracking-wider shadow-sm ${lead.status === 'NEW' ? 'badge-new' :
                                                lead.status === 'drafting' ? 'badge-drafting' :
                                                    lead.status === 'quoted' ? 'badge-quoted' :
                                                        lead.status === 'QUALIFIED' ? 'badge-qualified' :
                                                            lead.status === 'CONVERTED' ? 'badge-converted' :
                                                                lead.status === 'CONTACTED' ? 'badge-contacted' :
                                                                    'badge-draft'
                                                }`}>
                                                {lead.status.toLowerCase()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 capitalize font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className={`size-2 rounded-full ${lead.source === 'linkedin' ? 'bg-[#0077b5]' :
                                                    lead.source === 'web_form' ? 'bg-brand' :
                                                        'bg-gray-400'
                                                    }`}></div>
                                                {lead.source.replace('_', ' ')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-medium">
                                            {new Date(lead.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                <button
                                                    onClick={() => handleCreateQuote(lead)}
                                                    className={`p-2 rounded-lg transition-colors ${creatingQuoteForId === lead.id
                                                        ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                                                        : 'text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                                                        }`}
                                                    title="Create Quote"
                                                    disabled={creatingQuoteForId !== null}
                                                >
                                                    <span className={`material-symbols-outlined text-xl ${creatingQuoteForId === lead.id ? 'animate-spin' : ''}`}>
                                                        {creatingQuoteForId === lead.id ? 'progress_activity' : 'request_quote'}
                                                    </span>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(lead.id)}
                                                    className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2 rounded-lg transition-colors"
                                                    title="Delete"
                                                >
                                                    <span className="material-symbols-outlined text-xl">delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-border-dark flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Showing <span className="font-medium text-gray-900 dark:text-white">{((currentPage - 1) * PAGE_SIZE) + 1}</span> to{' '}
                            <span className="font-medium text-gray-900 dark:text-white">{Math.min(currentPage * PAGE_SIZE, totalItems)}</span> of{' '}
                            <span className="font-medium text-gray-900 dark:text-white">{totalItems}</span> results
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-gray-300 dark:border-border-dark text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-border-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="Previous page"
                            >
                                <span className="material-symbols-outlined text-lg">chevron_left</span>
                            </button>

                            {/* Page Numbers */}
                            <div className="flex items-center gap-1">
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(page => {
                                        // Show first, last, current, and adjacent pages
                                        if (page === 1 || page === totalPages) return true;
                                        if (Math.abs(page - currentPage) <= 1) return true;
                                        return false;
                                    })
                                    .map((page, idx, arr) => (
                                        <span key={page} className="flex items-center">
                                            {idx > 0 && arr[idx - 1] !== page - 1 && (
                                                <span className="px-1 text-gray-400">...</span>
                                            )}
                                            <button
                                                onClick={() => setCurrentPage(page)}
                                                className={`min-w-[36px] h-9 rounded-lg text-sm font-medium transition-colors ${currentPage === page
                                                    ? 'bg-brand text-white shadow-sm'
                                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-border-dark'
                                                    }`}
                                            >
                                                {page}
                                            </button>
                                        </span>
                                    ))
                                }
                            </div>

                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg border border-gray-300 dark:border-border-dark text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-border-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                title="Next page"
                            >
                                <span className="material-symbols-outlined text-lg">chevron_right</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <ContactForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSubmit={handleFormSubmit}
                initialData={editingContact}
                isLoading={formLoading}
            />
        </div>
    );
}
