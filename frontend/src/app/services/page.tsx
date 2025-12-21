'use client';

import { useState, useEffect } from 'react';
import { api, Service, ServiceCreate, ServiceUpdate } from '@/lib/apiClient';
import { useToast, useConfirm } from '@/components/ui/Toast';

const CATEGORIES = [
    { value: 'web_development', label: 'Web Development' },
    { value: 'design', label: 'Design' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'consulting', label: 'Consulting' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'other', label: 'Other' },
];

const CURRENCIES = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'TTD', symbol: 'TT$', name: 'Trinidad & Tobago Dollar' },
];

export default function ServicesPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const toast = useToast();
    const confirm = useConfirm();
    const [formData, setFormData] = useState<ServiceCreate>({
        name: '',
        description: '',
        default_price: 0,
        currency: 'USD',
        category: 'other',
        is_active: true,
    });
    const [savingForm, setSavingForm] = useState(false);

    const fetchServices = async () => {
        try {
            const response = await api.getServices(false); // Get all including inactive
            setServices(response.items);
        } catch (error) {
            console.error('Error fetching services:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchServices();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingForm(true);
        try {
            if (editingService) {
                await api.updateService(editingService.id, formData as ServiceUpdate);
            } else {
                await api.createService(formData);
            }
            setShowModal(false);
            resetForm();
            toast.success(editingService ? 'Service updated successfully' : 'Service created successfully');
            fetchServices();
        } catch (error) {
            console.error('Error saving service:', error);
            toast.error('Failed to save service');
        } finally {
            setSavingForm(false);
        }
    };

    const handleEdit = (service: Service) => {
        setEditingService(service);
        setFormData({
            name: service.name,
            description: service.description || '',
            default_price: service.default_price,
            currency: service.currency,
            category: service.category,
            is_active: service.is_active,
        });
        setShowModal(true);
    };

    const handleDelete = async (id: string) => {
        const confirmed = await confirm({
            title: 'Delete Service',
            message: 'Are you sure you want to delete this service? This action cannot be undone.',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            type: 'danger'
        });
        if (!confirmed) return;

        // Optimistic UI: Remove from list immediately
        const previousServices = [...services];
        setServices(prev => prev.filter(s => s.id !== id));
        toast.success('Service deleted');

        try {
            await api.deleteService(id);
            // Success - already removed from UI
        } catch (error) {
            // Rollback on error
            console.error('Error deleting service:', error);
            setServices(previousServices);
            toast.error('Failed to delete service. Restored.');
        }
    };

    const resetForm = () => {
        setEditingService(null);
        setFormData({
            name: '',
            description: '',
            default_price: 0,
            currency: 'USD',
            category: 'other',
            is_active: true,
        });
    };

    const openNewModal = () => {
        resetForm();
        setShowModal(true);
    };

    const getCurrencySymbol = (code: string) => {
        return CURRENCIES.find(c => c.code === code)?.symbol || '$';
    };

    const getCategoryLabel = (value: string) => {
        return CATEGORIES.find(c => c.value === value)?.label || value;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Service Catalog</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage your services and pricing</p>
                </div>
                <button
                    onClick={openNewModal}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand text-white font-medium hover:bg-brand-strong transition-colors"
                >
                    <span className="material-symbols-outlined text-xl">add</span>
                    Add Service
                </button>
            </div>

            {/* Services Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    // Skeleton loading
                    [...Array(6)].map((_, i) => (
                        <div key={i} className="bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-border-dark p-5 animate-pulse">
                            <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mt-4"></div>
                        </div>
                    ))
                ) : services.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                        <span className="material-symbols-outlined text-5xl text-gray-300 dark:text-gray-600">inventory_2</span>
                        <p className="mt-2 text-gray-500 dark:text-gray-400">No services yet. Add your first service!</p>
                    </div>
                ) : (
                    services.map((service) => (
                        <div
                            key={service.id}
                            className={`bg-white dark:bg-card-dark rounded-xl border border-gray-200 dark:border-border-dark p-5 hover:shadow-md transition-all duration-300 animate-in fade-in ${!service.is_active ? 'opacity-60' : ''}`}
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                    <h3 className="font-semibold text-gray-900 dark:text-white">{service.name}</h3>
                                    <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                        {getCategoryLabel(service.category)}
                                    </span>
                                </div>
                                {!service.is_active && (
                                    <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">
                                        Inactive
                                    </span>
                                )}
                            </div>
                            {service.description && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                                    {service.description}
                                </p>
                            )}
                            <div className="flex items-end justify-between mt-4 pt-4 border-t border-gray-100 dark:border-border-dark">
                                <p className="text-xl font-bold text-brand">
                                    {getCurrencySymbol(service.currency)}{service.default_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                                    <span className="text-xs font-normal text-gray-400 ml-1">{service.currency}</span>
                                </p>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => handleEdit(service)}
                                        className="p-2 text-gray-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-colors"
                                        title="Edit"
                                    >
                                        <span className="material-symbols-outlined text-xl">edit</span>
                                    </button>
                                    <button
                                        onClick={() => handleDelete(service.id)}
                                        className="p-2 rounded-lg transition-colors text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
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

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
                    <div className="relative bg-white dark:bg-card-dark rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            {editingService ? 'Edit Service' : 'New Service'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-card-dark text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:border-brand"
                                    placeholder="e.g. Website Development"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                                <textarea
                                    rows={2}
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-card-dark text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:border-brand"
                                    placeholder="Brief description of the service"
                                />
                            </div>

                            {/* Price & Currency */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Default Price *</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                            {getCurrencySymbol(formData.currency || 'USD')}
                                        </span>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            step="0.01"
                                            value={formData.default_price}
                                            onChange={(e) => setFormData({ ...formData, default_price: parseFloat(e.target.value) || 0 })}
                                            className="w-full rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-card-dark text-gray-900 dark:text-white pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:border-brand"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Currency</label>
                                    <select
                                        value={formData.currency}
                                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                        className="w-full rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-card-dark text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:border-brand"
                                    >
                                        {CURRENCIES.map((c) => (
                                            <option key={c.code} value={c.code}>{c.code} - {c.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-card-dark text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:border-brand"
                                >
                                    {CATEGORIES.map((c) => (
                                        <option key={c.value} value={c.value}>{c.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Active Toggle */}
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand"
                                />
                                <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
                                    Active (visible in service catalog)
                                </label>
                            </div>

                            {/* Buttons */}
                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={savingForm}
                                    className="px-4 py-2 text-sm font-medium text-white bg-brand hover:bg-brand-strong rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {savingForm && (
                                        <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                                    )}
                                    {editingService ? 'Save Changes' : 'Create Service'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
