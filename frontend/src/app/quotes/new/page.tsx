'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { api, Contact } from '../../../lib/apiClient';

// Company info - TODO: Move to config/env
const COMPANY_INFO = {
    name: 'ByteWorks Agency',
    tagline: 'Digital Solutions',
    email: 'macrodriguez2512@gmail.com',
    phone: '+1 (868) 775-9858',
    website: 'byteworksagency.com',
};

// Supported currencies
const CURRENCIES = {
    USD: { symbol: '$', name: 'US Dollar' },
    TTD: { symbol: 'TT$', name: 'Trinidad Dollar' },
};

type CurrencyCode = keyof typeof CURRENCIES;

interface QuoteItem {
    description: string;
    quantity: number;
    unitPrice: number;
}

export default function NewQuotePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const leadId = searchParams.get('leadId');

    const [lead, setLead] = useState<Contact | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Client info (editable copy of lead data)
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientCompany, setClientCompany] = useState('');

    // Quote form state
    const [quoteNumber] = useState(() => `QT-${Date.now().toString().slice(-6)}`);
    const [currency, setCurrency] = useState<CurrencyCode>('USD');
    const [items, setItems] = useState<QuoteItem[]>([
        { description: '', quantity: 1, unitPrice: 0 }
    ]);
    const [notes, setNotes] = useState('');
    const [validUntil, setValidUntil] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() + 15); // 15 days validity
        return date.toISOString().split('T')[0];
    });

    useEffect(() => {
        const fetchLead = async () => {
            if (!leadId) {
                router.push('/contacts');
                return;
            }

            try {
                const response = await api.getContacts({ search: '' });
                const foundLead = response.items.find(c => c.id === leadId);
                if (foundLead) {
                    setLead(foundLead);
                    // Initialize editable fields with lead data
                    setClientName(foundLead.name);
                    setClientEmail(foundLead.email);
                    setClientPhone(foundLead.phone || '');
                    setClientCompany(foundLead.company || '');
                } else {
                    alert('Lead not found');
                    router.push('/contacts');
                }
            } catch (error) {
                console.error('Failed to fetch lead', error);
                router.push('/contacts');
            } finally {
                setLoading(false);
            }
        };

        fetchLead();
    }, [leadId, router]);

    const addItem = () => {
        setItems([...items, { description: '', quantity: 1, unitPrice: 0 }]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const updateItem = (index: number, field: keyof QuoteItem, value: string | number) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const taxRate = 0; // 0% tax for now
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    const handleCancel = async () => {
        if (lead) {
            try {
                await api.updateContact(lead.id, { status: 'NEW' });
            } catch (error) {
                console.error('Failed to revert lead status', error);
            }
        }
        router.push('/contacts');
    };

    const handleSave = async () => {
        if (!lead) return;

        const validItems = items.filter(item => item.description.trim() && item.unitPrice > 0);
        if (validItems.length === 0) {
            alert('Please add at least one item with a description and price');
            return;
        }

        setSaving(true);
        try {
            await api.updateContact(lead.id, { status: 'quoted' });
            alert('Quote created successfully!');
            router.push('/quotes');
        } catch (error) {
            console.error('Failed to save quote', error);
            alert('Failed to save quote');
        } finally {
            setSaving(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-4xl text-brand animate-spin">progress_activity</span>
                    <p className="text-gray-500 dark:text-gray-400">Loading lead information...</p>
                </div>
            </div>
        );
    }

    if (!lead) {
        return null;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Create Quote</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Creating quote for <span className="font-medium text-gray-900 dark:text-white">{clientName || lead.name}</span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleCancel}
                        className="btn btn-secondary"
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="btn btn-primary flex items-center gap-2"
                        disabled={saving}
                    >
                        {saving ? (
                            <>
                                <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                                Saving...
                            </>
                        ) : (
                            <>
                                <span className="material-symbols-outlined">save</span>
                                Save Quote
                            </>
                        )}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Left Column - Form */}
                <div className="space-y-6">
                    {/* Quote Settings */}
                    <div className="bg-white dark:bg-card-dark rounded-xl shadow-sm border border-gray-200 dark:border-border-dark p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-brand">settings</span>
                            Quote Settings
                        </h2>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Quote Number</label>
                                <input
                                    type="text"
                                    value={quoteNumber}
                                    readOnly
                                    className="w-full rounded-lg border border-gray-300 dark:border-border-dark bg-gray-50 dark:bg-border-dark text-gray-900 dark:text-white px-3 py-2 text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Currency</label>
                                <select
                                    value={currency}
                                    onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                                    className="w-full rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-card-dark text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:border-brand"
                                >
                                    {Object.entries(CURRENCIES).map(([code, { name }]) => (
                                        <option key={code} value={code}>{code} - {name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Valid Until</label>
                                <input
                                    type="date"
                                    value={validUntil}
                                    onChange={(e) => setValidUntil(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-card-dark text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:border-brand"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Client Information (Editable) */}
                    <div className="bg-white dark:bg-card-dark rounded-xl shadow-sm border border-gray-200 dark:border-border-dark p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-brand">person</span>
                            Client Information
                            <span className="text-xs text-gray-400 font-normal ml-2">(editable)</span>
                        </h2>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Name *</label>
                                <input
                                    type="text"
                                    value={clientName}
                                    onChange={(e) => setClientName(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-card-dark text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:border-brand"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Email *</label>
                                <input
                                    type="email"
                                    value={clientEmail}
                                    onChange={(e) => setClientEmail(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-card-dark text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:border-brand"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Phone</label>
                                <input
                                    type="tel"
                                    value={clientPhone}
                                    onChange={(e) => setClientPhone(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-card-dark text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:border-brand"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Company</label>
                                <input
                                    type="text"
                                    value={clientCompany}
                                    onChange={(e) => setClientCompany(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-card-dark text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:border-brand"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Quote Items */}
                    <div className="bg-white dark:bg-card-dark rounded-xl shadow-sm border border-gray-200 dark:border-border-dark p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-brand">list_alt</span>
                            Quote Items
                        </h2>

                        <div className="space-y-4">
                            {items.map((item, index) => (
                                <div key={index} className="flex flex-col sm:flex-row gap-3 p-4 bg-gray-50 dark:bg-border-dark/30 rounded-lg">
                                    <div className="flex-1">
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
                                        <input
                                            type="text"
                                            value={item.description}
                                            onChange={(e) => updateItem(index, 'description', e.target.value)}
                                            placeholder="Service or product description"
                                            className="w-full rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-card-dark text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:border-brand"
                                        />
                                    </div>
                                    <div className="w-full sm:w-20">
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Qty</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                            className="w-full rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-card-dark text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:border-brand"
                                        />
                                    </div>
                                    <div className="w-full sm:w-28">
                                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Unit Price</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.unitPrice}
                                                onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                className="w-full rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-card-dark text-gray-900 dark:text-white pl-7 pr-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:border-brand"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-end">
                                        <button
                                            onClick={() => removeItem(index)}
                                            disabled={items.length === 1}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Remove item"
                                        >
                                            <span className="material-symbols-outlined">delete</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={addItem}
                            className="mt-4 flex items-center gap-2 text-brand hover:text-brand-strong font-medium text-sm transition-colors"
                        >
                            <span className="material-symbols-outlined">add</span>
                            Add Item
                        </button>
                    </div>

                    {/* Notes */}
                    <div className="bg-white dark:bg-card-dark rounded-xl shadow-sm border border-gray-200 dark:border-border-dark p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-brand">note</span>
                            Notes & Terms
                        </h2>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Payment terms, delivery notes, or other conditions..."
                            rows={4}
                            className="w-full rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-card-dark text-gray-900 dark:text-white px-4 py-3 text-sm focus:ring-2 focus:ring-brand focus:border-brand resize-none"
                        />
                    </div>
                </div>

                {/* Right Column - Live Preview */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-brand">preview</span>
                            Live Preview
                        </h2>
                        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-border-dark px-2 py-1 rounded-full">
                            Updates in real-time
                        </span>
                    </div>

                    {/* Quote Document Preview */}
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden sticky top-6">
                        {/* Document Content */}
                        <div className="p-8 space-y-6 text-gray-900" style={{ fontSize: '14px' }}>
                            {/* Header with Logo */}
                            <div className="flex justify-between items-start border-b border-gray-200 pb-6">
                                <div className="flex items-center gap-4">
                                    <div className="relative w-12 h-12">
                                        <Image
                                            src="/logo.png"
                                            alt="Company Logo"
                                            width={48}
                                            height={48}
                                            className="object-contain"
                                        />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900">{COMPANY_INFO.name}</h3>
                                        <p className="text-sm text-gray-500">{COMPANY_INFO.tagline}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="inline-block bg-brand/10 text-brand px-4 py-2 rounded-lg">
                                        <p className="text-2xl font-bold">QUOTE</p>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-2">{quoteNumber}</p>
                                </div>
                            </div>

                            {/* Company & Client Info */}
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">From</p>
                                    <p className="font-semibold">{COMPANY_INFO.name}</p>
                                    <p className="text-sm text-gray-600">{COMPANY_INFO.email}</p>
                                    <p className="text-sm text-gray-600">{COMPANY_INFO.phone}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">To</p>
                                    <p className="font-semibold">{clientName || 'Client Name'}</p>
                                    {clientCompany && <p className="text-sm text-gray-600">{clientCompany}</p>}
                                    <p className="text-sm text-gray-600">{clientEmail || 'client@email.com'}</p>
                                    {clientPhone && <p className="text-sm text-gray-600">{clientPhone}</p>}
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="flex gap-8 text-sm">
                                <div>
                                    <span className="text-gray-500">Issue Date:</span>
                                    <span className="ml-2 font-medium">{formatDate(new Date().toISOString())}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">Valid Until:</span>
                                    <span className="ml-2 font-medium">{formatDate(validUntil)}</span>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="text-left px-4 py-3 font-semibold text-gray-600">Description</th>
                                            <th className="text-center px-4 py-3 font-semibold text-gray-600 w-16">Qty</th>
                                            <th className="text-right px-4 py-3 font-semibold text-gray-600 w-24">Price</th>
                                            <th className="text-right px-4 py-3 font-semibold text-gray-600 w-24">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {items.filter(item => item.description.trim()).length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">
                                                    Add items to see them here...
                                                </td>
                                            </tr>
                                        ) : (
                                            items.filter(item => item.description.trim()).map((item, index) => (
                                                <tr key={index}>
                                                    <td className="px-4 py-3">{item.description}</td>
                                                    <td className="px-4 py-3 text-center">{item.quantity}</td>
                                                    <td className="px-4 py-3 text-right">{CURRENCIES[currency].symbol}{item.unitPrice.toFixed(2)}</td>
                                                    <td className="px-4 py-3 text-right font-medium">{CURRENCIES[currency].symbol}{(item.quantity * item.unitPrice).toFixed(2)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Totals */}
                            <div className="flex justify-end">
                                <div className="w-64 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Subtotal</span>
                                        <span className="font-medium">{CURRENCIES[currency].symbol}{subtotal.toFixed(2)}</span>
                                    </div>
                                    {taxRate > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">Tax ({(taxRate * 100).toFixed(0)}%)</span>
                                            <span className="font-medium">{CURRENCIES[currency].symbol}{tax.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between pt-2 border-t border-gray-200">
                                        <span className="font-bold text-lg">Total ({currency})</span>
                                        <span className="font-bold text-lg text-brand">{CURRENCIES[currency].symbol}{total.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Notes */}
                            {notes && (
                                <div className="border-t border-gray-200 pt-4">
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes & Terms</p>
                                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{notes}</p>
                                </div>
                            )}

                            {/* Footer */}
                            <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
                                <p>Thank you for your business!</p>
                                <p className="mt-1">{COMPANY_INFO.website}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

