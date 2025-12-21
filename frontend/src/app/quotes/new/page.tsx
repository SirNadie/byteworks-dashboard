'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { api, Contact, Service, ServiceCreate, QuoteCreate as QuoteCreateType } from '../../../lib/apiClient';
import { useToast } from '@/components/ui/Toast';

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

// Service categories (must match backend enum)
const SERVICE_CATEGORIES = [
    { value: 'web_development', label: 'Web Development' },
    { value: 'design', label: 'Design' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'consulting', label: 'Consulting' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'other', label: 'Other' },
];

// Standard Terms & Conditions (always shown on quotes)
const STANDARD_TERMS = {
    en: [
        'Payment of the first month is required to start the service.',
        'This quote is valid for the period specified above.',
        'Services are billed on a monthly or yearly basis unless otherwise specified.',
        'Prices are subject to change with 30 days prior notice.',
        'Cancellation requires 15 days written notice before the next billing cycle.',
        'Late payments beyond 5 days may result in temporary service suspension.',
        'You retain ownership of your content (text, images, customer data). ByteWorks retains rights to the platform code and architecture.',
        'Acceptance of this quote constitutes agreement to ByteWorks Agency\'s full Terms & Conditions available at byteworksagency.com/terms.',
        'ByteWorks Agency\'s total liability is limited to the amount paid for services in the current billing period.',
    ],
    es: [
        'Se requiere el pago del primer mes para iniciar el servicio.',
        'Esta cotización es válida por el período especificado arriba.',
        'Los servicios se facturan mensual o anualmente a menos que se especifique lo contrario.',
        'Los precios están sujetos a cambios con 30 días de aviso previo.',
        'La cancelación requiere aviso por escrito con 15 días de anticipación al próximo ciclo de facturación.',
        'Los pagos atrasados más de 5 días pueden resultar en suspensión temporal del servicio.',
        'Conservas la propiedad de tu contenido (texto, imágenes, datos de clientes). ByteWorks retiene los derechos sobre el código y arquitectura de la plataforma.',
        'La aceptación de esta cotización constituye el acuerdo con los Términos y Condiciones completos de ByteWorks Agency disponibles en byteworksagency.com/terms.',
        'La responsabilidad total de ByteWorks Agency está limitada al monto pagado por servicios en el período de facturación actual.',
    ],
};

// Quote translations
type Language = 'en' | 'es';

const TRANSLATIONS = {
    en: {
        quote: 'QUOTE',
        from: 'From',
        to: 'To',
        issueDate: 'Issue Date',
        validUntil: 'Valid Until',
        description: 'Description',
        qty: 'Qty',
        price: 'Price',
        total: 'Total',
        subtotal: 'Subtotal',
        discount: 'Discount',
        tax: 'Tax',
        notes: 'Notes',
        termsAndConditions: 'Terms & Conditions',
        thankYou: 'Thank you for your business!',
        addItemsHint: 'Add items to see them here...',
    },
    es: {
        quote: 'COTIZACIÓN',
        from: 'De',
        to: 'Para',
        issueDate: 'Fecha de Emisión',
        validUntil: 'Válido Hasta',
        description: 'Descripción',
        qty: 'Cant',
        price: 'Precio',
        total: 'Total',
        subtotal: 'Subtotal',
        discount: 'Descuento',
        tax: 'Impuesto',
        notes: 'Notas',
        termsAndConditions: 'Términos y Condiciones',
        thankYou: '¡Gracias por su preferencia!',
        addItemsHint: 'Agregue items para verlos aquí...',
    },
};

type CurrencyCode = keyof typeof CURRENCIES;

interface QuoteItem {
    serviceId?: string;
    description: string;
    quantity: number;
    unitPrice: number;
}

// Draft data structure for localStorage
interface QuoteDraft {
    items: QuoteItem[];
    notes: string;
    currency: CurrencyCode;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    validUntil: string;
    quoteLang: Language;
    quoteNumber: string;
}

// Generate sequential quote number
const getNextQuoteNumber = (): string => {
    if (typeof window === 'undefined') return 'QT-001';
    const lastNumber = parseInt(localStorage.getItem('lastQuoteNumber') || '0', 10);
    const nextNumber = lastNumber + 1;
    localStorage.setItem('lastQuoteNumber', nextNumber.toString());
    return `QT-${nextNumber.toString().padStart(3, '0')}`;
};

// Get draft key for a lead
const getDraftKey = (leadId: string) => `quote_draft_${leadId}`;

export default function NewQuotePage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const leadId = searchParams.get('leadId');
    const toast = useToast();

    const [lead, setLead] = useState<Contact | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Client info (editable copy of lead data)
    const [clientName, setClientName] = useState('');
    const [clientEmail, setClientEmail] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [clientCompany, setClientCompany] = useState('');

    // Quote form state
    const [quoteNumber, setQuoteNumber] = useState('');
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

    // Discount state
    const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
    const [discountValue, setDiscountValue] = useState(0);

    // Language for quote
    const [quoteLang, setQuoteLang] = useState<Language>('en');
    const t = TRANSLATIONS[quoteLang];

    // Draft loaded flag to prevent overwriting on initial load
    const [draftLoaded, setDraftLoaded] = useState(false);

    // Services
    const [services, setServices] = useState<Service[]>([]);
    const [loadingServices, setLoadingServices] = useState(true);

    // Save Service Modal
    const [showSaveServiceModal, setShowSaveServiceModal] = useState(false);
    const [savingServiceIndex, setSavingServiceIndex] = useState<number | null>(null);
    const [newServiceName, setNewServiceName] = useState('');
    const [newServiceCategory, setNewServiceCategory] = useState('web_development');
    const [savingService, setSavingService] = useState(false);

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
                    toast.error('Lead not found');
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

    // Fetch services
    useEffect(() => {
        const fetchServices = async () => {
            try {
                const response = await api.getServices(true);
                setServices(response.items);
            } catch (error) {
                console.error('Failed to fetch services', error);
            } finally {
                setLoadingServices(false);
            }
        };
        fetchServices();
    }, []);

    // Load draft from localStorage on mount
    useEffect(() => {
        if (!leadId) return;

        const draftKey = getDraftKey(leadId);
        const savedDraft = localStorage.getItem(draftKey);

        if (savedDraft) {
            try {
                const draft: QuoteDraft = JSON.parse(savedDraft);
                setItems(draft.items);
                setNotes(draft.notes);
                setCurrency(draft.currency);
                setDiscountType(draft.discountType);
                setDiscountValue(draft.discountValue);
                setValidUntil(draft.validUntil);
                setQuoteLang(draft.quoteLang);
                setQuoteNumber(draft.quoteNumber);
            } catch (e) {
                console.error('Failed to parse draft', e);
                setQuoteNumber(getNextQuoteNumber());
            }
        } else {
            // No draft, generate new quote number
            setQuoteNumber(getNextQuoteNumber());
        }
        setDraftLoaded(true);
    }, [leadId]);

    // Auto-save draft to localStorage when form changes
    useEffect(() => {
        if (!leadId || !draftLoaded) return;

        const draft: QuoteDraft = {
            items,
            notes,
            currency,
            discountType,
            discountValue,
            validUntil,
            quoteLang,
            quoteNumber,
        };

        const draftKey = getDraftKey(leadId);
        localStorage.setItem(draftKey, JSON.stringify(draft));
    }, [leadId, items, notes, currency, discountType, discountValue, validUntil, quoteLang, quoteNumber, draftLoaded]);

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

    // Select a service from catalog
    const selectService = (index: number, serviceId: string) => {
        if (!serviceId) {
            const newItems = [...items];
            newItems[index] = { ...newItems[index], serviceId: undefined };
            setItems(newItems);
            return;
        }

        const service = services.find(s => s.id === serviceId);
        if (service) {
            const newItems = [...items];
            newItems[index] = {
                serviceId: service.id,
                description: service.description || service.name,
                quantity: newItems[index].quantity || 1,
                unitPrice: service.default_price,
            };
            setItems(newItems);
        }
    };

    // Open save service modal
    const openSaveServiceModal = (index: number) => {
        const item = items[index];
        setSavingServiceIndex(index);
        setNewServiceName(item.description.split(' - ')[0] || item.description);
        setNewServiceCategory('web_development');
        setShowSaveServiceModal(true);
    };

    // Save new service
    const handleSaveNewService = async () => {
        if (savingServiceIndex === null) return;

        const item = items[savingServiceIndex];
        if (!newServiceName.trim() || item.unitPrice <= 0) {
            toast.warning('Please enter a service name and ensure price is greater than 0');
            return;
        }

        setSavingService(true);
        try {
            const newService: ServiceCreate = {
                name: newServiceName.trim(),
                description: item.description,
                default_price: item.unitPrice,
                currency: currency,
                category: newServiceCategory || 'other',
                is_active: true,
            };

            const created = await api.createService(newService);
            setServices([...services, created]);

            const newItems = [...items];
            newItems[savingServiceIndex] = { ...newItems[savingServiceIndex], serviceId: created.id };
            setItems(newItems);

            setShowSaveServiceModal(false);
            setSavingServiceIndex(null);
            setNewServiceName('');
            toast.success('Service saved to catalog!');
        } catch (error) {
            console.error('Failed to save service', error);
            toast.error('Failed to save service');
        } finally {
            setSavingService(false);
        }
    };

    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    // Calculate discount
    const discountAmount = discountType === 'percentage'
        ? (subtotal * discountValue / 100)
        : discountValue;
    const afterDiscount = Math.max(0, subtotal - discountAmount);

    const taxRate = 0; // 0% tax for now
    const tax = afterDiscount * taxRate;
    const total = afterDiscount + tax;

    const handleCancel = () => {
        // Keep the lead in 'drafting' status so they can resume later
        router.push('/contacts');
    };

    const handleSave = async () => {
        if (!lead) return;

        const validItems = items.filter(item => item.description.trim() && item.unitPrice > 0);
        if (validItems.length === 0) {
            toast.warning('Please add at least one item with a description and price');
            return;
        }

        setSaving(true);
        try {
            // Create the quote in the backend
            const quoteData: QuoteCreateType = {
                quote_number: quoteNumber,
                client_name: clientName,
                client_email: clientEmail,
                client_phone: clientPhone || undefined,
                client_company: clientCompany || undefined,
                lead_id: lead.id,
                currency: currency,
                valid_until: validUntil,
                items: validItems.map((item, index) => ({
                    service_id: item.serviceId || undefined,
                    description: item.description,
                    quantity: item.quantity,
                    unit_price: item.unitPrice,
                    sort_order: index,
                })),
                discount: discountAmount,
                discount_type: discountType,
                discount_value: discountValue,
                tax: tax,
                language: quoteLang,
                notes: notes || undefined,
            };

            await api.createQuote(quoteData);

            // Clear the draft from localStorage since quote is saved
            if (leadId) {
                localStorage.removeItem(getDraftKey(leadId));
            }
            toast.success('Quote created successfully!');
            router.push('/quotes');
        } catch (error) {
            console.error('Failed to save quote', error);
            toast.error('Failed to save quote');
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
                                <div key={index} className="p-4 bg-gray-50 dark:bg-border-dark/30 rounded-lg space-y-3">
                                    {/* Service Selector Row */}
                                    <div className="flex items-center gap-3">
                                        <div className="flex-1">
                                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                                                Select from Catalog
                                            </label>
                                            <select
                                                value={item.serviceId || ''}
                                                onChange={(e) => selectService(index, e.target.value)}
                                                className="w-full rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-card-dark text-gray-900 dark:text-white px-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:border-brand"
                                                disabled={loadingServices}
                                            >
                                                <option value="">-- Custom Item --</option>
                                                {services.map((service) => (
                                                    <option key={service.id} value={service.id}>
                                                        {service.name} ({CURRENCIES[service.currency as CurrencyCode]?.symbol || '$'}{service.default_price.toFixed(2)})
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        {/* Save as Service Button */}
                                        {!item.serviceId && item.description.trim() && item.unitPrice > 0 && (
                                            <div className="flex items-end pt-5">
                                                <button
                                                    onClick={() => openSaveServiceModal(index)}
                                                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                                                    title="Save as Service"
                                                >
                                                    <span className="material-symbols-outlined">bookmark_add</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Item Details Row */}
                                    <div className="flex flex-col sm:flex-row gap-3">
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
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{CURRENCIES[currency].symbol}</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={item.unitPrice}
                                                    onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                    className="w-full rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-card-dark text-gray-900 dark:text-white pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:border-brand"
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

                                    {/* Line Total */}
                                    <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                                        Line Total: <span className="font-semibold text-gray-900 dark:text-white">{CURRENCIES[currency].symbol}{(item.quantity * item.unitPrice).toFixed(2)}</span>
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

                    {/* Discount */}
                    <div className="bg-white dark:bg-card-dark rounded-xl shadow-sm border border-gray-200 dark:border-border-dark p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-brand">sell</span>
                            Discount
                        </h2>
                        <div className="flex flex-col sm:flex-row gap-4">
                            {/* Discount Type Toggle */}
                            <div className="flex-shrink-0">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Type</label>
                                <div className="flex rounded-lg border border-gray-300 dark:border-border-dark overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => setDiscountType('percentage')}
                                        className={`px-4 py-2 text-sm font-medium transition-colors ${discountType === 'percentage'
                                            ? 'bg-brand text-white'
                                            : 'bg-white dark:bg-card-dark text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-border-dark'
                                            }`}
                                    >
                                        %
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setDiscountType('fixed')}
                                        className={`px-4 py-2 text-sm font-medium transition-colors border-l border-gray-300 dark:border-border-dark ${discountType === 'fixed'
                                            ? 'bg-brand text-white'
                                            : 'bg-white dark:bg-card-dark text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-border-dark'
                                            }`}
                                    >
                                        {CURRENCIES[currency].symbol}
                                    </button>
                                </div>
                            </div>

                            {/* Discount Value */}
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                                    {discountType === 'percentage' ? 'Percentage (%)' : `Amount (${currency})`}
                                </label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                                        {discountType === 'percentage' ? '%' : CURRENCIES[currency].symbol}
                                    </span>
                                    <input
                                        type="number"
                                        min="0"
                                        max={discountType === 'percentage' ? 100 : subtotal}
                                        step={discountType === 'percentage' ? 1 : 0.01}
                                        value={discountValue}
                                        onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                                        className="w-full rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-card-dark text-gray-900 dark:text-white pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-brand focus:border-brand"
                                    />
                                </div>
                            </div>

                            {/* Discount Preview */}
                            {discountValue > 0 && (
                                <div className="flex-shrink-0 flex items-end">
                                    <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-4 py-2 rounded-lg text-sm font-medium">
                                        -{CURRENCIES[currency].symbol}{discountAmount.toFixed(2)} off
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Notes & Terms */}
                    <div className="bg-white dark:bg-card-dark rounded-xl shadow-sm border border-gray-200 dark:border-border-dark p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <span className="material-symbols-outlined text-brand">note</span>
                            Notes & Terms
                        </h2>

                        {/* Custom Notes */}
                        <div className="mb-6">
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                                Custom Notes (Optional)
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add specific notes for this quote (payment arrangements, special conditions, etc.)..."
                                rows={3}
                                className="w-full rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-card-dark text-gray-900 dark:text-white px-4 py-3 text-sm focus:ring-2 focus:ring-brand focus:border-brand resize-none"
                            />
                        </div>

                        {/* Standard Terms */}
                        <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                <span className="material-symbols-outlined text-sm">verified</span>
                                Standard Terms (Always Included)
                            </label>
                            <div className="bg-gray-50 dark:bg-border-dark/30 rounded-lg p-4">
                                <ul className="space-y-2">
                                    {STANDARD_TERMS[quoteLang].map((term, index) => (
                                        <li key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-start gap-2">
                                            <span className="text-brand mt-0.5">•</span>
                                            <span>{term}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Live Preview */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <span className="material-symbols-outlined text-brand">preview</span>
                            Live Preview
                        </h2>
                        <div className="flex items-center gap-2">
                            {/* Language Toggle */}
                            <div className="flex rounded-lg border border-gray-300 dark:border-border-dark overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setQuoteLang('en')}
                                    className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${quoteLang === 'en'
                                        ? 'bg-brand text-white'
                                        : 'bg-white dark:bg-card-dark text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-border-dark'
                                        }`}
                                >
                                    <span className="text-sm">🇺🇸</span> EN
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setQuoteLang('es')}
                                    className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-gray-300 dark:border-border-dark flex items-center gap-1 ${quoteLang === 'es'
                                        ? 'bg-brand text-white'
                                        : 'bg-white dark:bg-card-dark text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-border-dark'
                                        }`}
                                >
                                    <span className="text-sm">🇪🇸</span> ES
                                </button>
                            </div>
                        </div>
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
                                        <p className="text-2xl font-bold">{t.quote}</p>
                                    </div>
                                    <p className="text-sm text-gray-500 mt-2">{quoteNumber}</p>
                                </div>
                            </div>

                            {/* Company & Client Info */}
                            <div className="grid grid-cols-2 gap-8">
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t.from}</p>
                                    <p className="font-semibold">{COMPANY_INFO.name}</p>
                                    <p className="text-sm text-gray-600">{COMPANY_INFO.email}</p>
                                    <p className="text-sm text-gray-600">{COMPANY_INFO.phone}</p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t.to}</p>
                                    <p className="font-semibold">{clientName || 'Client Name'}</p>
                                    {clientCompany && <p className="text-sm text-gray-600">{clientCompany}</p>}
                                    <p className="text-sm text-gray-600">{clientEmail || 'client@email.com'}</p>
                                    {clientPhone && <p className="text-sm text-gray-600">{clientPhone}</p>}
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="flex gap-8 text-sm">
                                <div>
                                    <span className="text-gray-500">{t.issueDate}:</span>
                                    <span className="ml-2 font-medium">{formatDate(new Date().toISOString())}</span>
                                </div>
                                <div>
                                    <span className="text-gray-500">{t.validUntil}:</span>
                                    <span className="ml-2 font-medium">{formatDate(validUntil)}</span>
                                </div>
                            </div>

                            {/* Items Table */}
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="text-left px-4 py-3 font-semibold text-gray-600">{t.description}</th>
                                            <th className="text-center px-4 py-3 font-semibold text-gray-600 w-16">{t.qty}</th>
                                            <th className="text-right px-4 py-3 font-semibold text-gray-600 w-24">{t.price}</th>
                                            <th className="text-right px-4 py-3 font-semibold text-gray-600 w-24">{t.total}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {items.filter(item => item.description.trim()).length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-8 text-center text-gray-400 italic">
                                                    {t.addItemsHint}
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
                                        <span className="text-gray-500">{t.subtotal}</span>
                                        <span className="font-medium">{CURRENCIES[currency].symbol}{subtotal.toFixed(2)}</span>
                                    </div>
                                    {discountValue > 0 && (
                                        <div className="flex justify-between text-sm text-green-600">
                                            <span>{t.discount} {discountType === 'percentage' ? `(${discountValue}%)` : ''}</span>
                                            <span className="font-medium">-{CURRENCIES[currency].symbol}{discountAmount.toFixed(2)}</span>
                                        </div>
                                    )}
                                    {taxRate > 0 && (
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-500">{t.tax} ({(taxRate * 100).toFixed(0)}%)</span>
                                            <span className="font-medium">{CURRENCIES[currency].symbol}{tax.toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between pt-2 border-t border-gray-200">
                                        <span className="font-bold text-lg">{t.total} ({currency})</span>
                                        <span className="font-bold text-lg text-brand">{CURRENCIES[currency].symbol}{total.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Notes & Terms */}
                            <div className="border-t border-gray-200 pt-4 space-y-4">
                                {/* Custom Notes */}
                                {notes && (
                                    <div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t.notes}</p>
                                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{notes}</p>
                                    </div>
                                )}

                                {/* Standard Terms */}
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t.termsAndConditions}</p>
                                    <ul className="text-xs text-gray-500 space-y-1">
                                        {STANDARD_TERMS[quoteLang].map((term, index) => (
                                            <li key={index} className="flex items-start gap-1.5">
                                                <span className="text-gray-400">•</span>
                                                <span>{term}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
                                <p>{t.thankYou}</p>
                                <p className="mt-1">{COMPANY_INFO.website}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Save Service Modal */}
            {showSaveServiceModal && savingServiceIndex !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-card-dark rounded-xl shadow-2xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-gray-200 dark:border-border-dark">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-brand">bookmark_add</span>
                                Save as Service
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Save this item to your service catalog for future quotes
                            </p>
                        </div>

                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Service Name *
                                </label>
                                <input
                                    type="text"
                                    value={newServiceName}
                                    onChange={(e) => setNewServiceName(e.target.value)}
                                    placeholder="e.g. Website Development"
                                    className="w-full rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-card-dark text-gray-900 dark:text-white px-4 py-2 focus:ring-2 focus:ring-brand focus:border-brand"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Category
                                </label>
                                <select
                                    value={newServiceCategory}
                                    onChange={(e) => setNewServiceCategory(e.target.value)}
                                    className="w-full rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-card-dark text-gray-900 dark:text-white px-4 py-2 focus:ring-2 focus:ring-brand focus:border-brand"
                                >
                                    {SERVICE_CATEGORIES.map((cat) => (
                                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-gray-50 dark:bg-border-dark/30 rounded-lg p-4">
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Service Details</p>
                                <div className="space-y-1 text-sm">
                                    <p className="text-gray-600 dark:text-gray-300">
                                        <span className="font-medium">Description:</span> {items[savingServiceIndex]?.description}
                                    </p>
                                    <p className="text-gray-600 dark:text-gray-300">
                                        <span className="font-medium">Price:</span> {CURRENCIES[currency].symbol}{items[savingServiceIndex]?.unitPrice.toFixed(2)} {currency}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-200 dark:border-border-dark flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowSaveServiceModal(false);
                                    setSavingServiceIndex(null);
                                }}
                                className="btn btn-secondary"
                                disabled={savingService}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveNewService}
                                className="btn btn-primary flex items-center gap-2"
                                disabled={savingService || !newServiceName.trim()}
                            >
                                {savingService ? (
                                    <>
                                        <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">save</span>
                                        Save Service
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
