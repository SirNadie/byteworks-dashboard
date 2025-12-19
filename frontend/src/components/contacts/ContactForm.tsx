'use client';

import { useState, useEffect } from 'react';
import { Contact, ContactCreate, ContactUpdate } from '@/lib/api';

interface ContactFormProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (data: ContactCreate | ContactUpdate) => Promise<void>;
    initialData?: Contact | null;
    isLoading?: boolean;
}

export default function ContactForm({ isOpen, onClose, onSubmit, initialData, isLoading = false }: ContactFormProps) {
    const [formData, setFormData] = useState<ContactCreate>({
        name: '',
        email: '',
        phone: '',
        company: '',
        source: 'web_form',
        status: 'new',
        notes: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name,
                email: initialData.email,
                phone: initialData.phone || '',
                company: initialData.company || '',
                source: initialData.source,
                status: initialData.status,
                notes: initialData.notes || ''
            });
        } else {
            setFormData({
                name: '',
                email: '',
                phone: '',
                company: '',
                source: 'web_form',
                status: 'new',
                notes: ''
            });
        }
    }, [initialData, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="absolute inset-y-0 right-0 max-w-md w-full flex">
                <div className="w-full h-full bg-white dark:bg-card-dark shadow-xl transform transition-transform animate-in slide-in-from-right duration-300 flex flex-col">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-border-dark flex items-center justify-between">
                        <h2 className="text-xl font-display font-bold text-gray-900 dark:text-white">
                            {initialData ? 'Edit Contact' : 'New Contact'}
                        </h2>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {/* Form */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <form id="contact-form" onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Full Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    required
                                    className="block w-full rounded-lg border-gray-300 dark:border-border-dark bg-white dark:bg-card-dark text-gray-900 dark:text-white focus:ring-brand focus:border-brand sm:text-sm py-2"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Email Address <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    required
                                    className="block w-full rounded-lg border-gray-300 dark:border-border-dark bg-white dark:bg-card-dark text-gray-900 dark:text-white focus:ring-brand focus:border-brand sm:text-sm py-2"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Phone Number
                                    </label>
                                    <input
                                        type="tel"
                                        id="phone"
                                        className="block w-full rounded-lg border-gray-300 dark:border-border-dark bg-white dark:bg-card-dark text-gray-900 dark:text-white focus:ring-brand focus:border-brand sm:text-sm py-2"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Company
                                    </label>
                                    <input
                                        type="text"
                                        id="company"
                                        className="block w-full rounded-lg border-gray-300 dark:border-border-dark bg-white dark:bg-card-dark text-gray-900 dark:text-white focus:ring-brand focus:border-brand sm:text-sm py-2"
                                        value={formData.company}
                                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="source" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Source
                                    </label>
                                    <select
                                        id="source"
                                        className="block w-full rounded-lg border-gray-300 dark:border-border-dark bg-white dark:bg-card-dark text-gray-900 dark:text-white focus:ring-brand focus:border-brand sm:text-sm py-2"
                                        value={formData.source}
                                        onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                                    >
                                        <option value="web_form">Web Form</option>
                                        <option value="referral">Referral</option>
                                        <option value="linkedin">LinkedIn</option>
                                        <option value="email">Email</option>
                                        <option value="phone">Phone</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Status
                                    </label>
                                    <select
                                        id="status"
                                        className="block w-full rounded-lg border-gray-300 dark:border-border-dark bg-white dark:bg-card-dark text-gray-900 dark:text-white focus:ring-brand focus:border-brand sm:text-sm py-2"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                    >
                                        <option value="new">New</option>
                                        <option value="contacted">Contacted</option>
                                        <option value="qualified">Qualified</option>
                                        <option value="converted">Converted</option>
                                        <option value="lost">Lost</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Notes
                                </label>
                                <textarea
                                    id="notes"
                                    rows={4}
                                    className="block w-full rounded-lg border-gray-300 dark:border-border-dark bg-white dark:bg-card-dark text-gray-900 dark:text-white focus:ring-brand focus:border-brand sm:text-sm py-2"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>
                        </form>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-gray-200 dark:border-border-dark bg-gray-50 dark:bg-card-dark flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-border-dark rounded-lg transition-colors"
                            disabled={isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="contact-form"
                            disabled={isLoading}
                            className="btn btn-primary flex items-center gap-2"
                        >
                            {isLoading && (
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            )}
                            {initialData ? 'Update Contact' : 'Create Contact'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
