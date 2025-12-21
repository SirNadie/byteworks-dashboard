'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { api, Quote, Service, QuoteUpdate as QuoteUpdateType, QuoteItemCreate } from '../../../../lib/apiClient';
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

export default function EditQuotePage() {
    const params = useParams();
    const router = useRouter();
    const quoteId = params.id as string;
    const toast = useToast();

    const [originalQuote, setOriginalQuote] = useState<Quote | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Client info (editable copy of quote data)
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
    const [validUntil, setValidUntil] = useState('');

    // Discount state
    const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
    const [discountValue, setDiscountValue] = useState(0);

    // Language for quote
    const [quoteLang, setQuoteLang] = useState<Language>('en');
    const t = TRANSLATIONS[quoteLang];

    // Services
    const [services, setServices] = useState<Service[]>([]);
    const [loadingServices, setLoadingServices] = useState(true);

    // Fetch quote data
    useEffect(() => {
        const fetchQuote = async () => {
            try {
                const data = await api.getQuote(quoteId);
                setOriginalQuote(data);

                // Populate form with quote data
                setClientName(data.client_name);
                setClientEmail(data.client_email);
                setClientPhone(data.client_phone || '');
                setClientCompany(data.client_company || '');
                setQuoteNumber(data.quote_number);
                setCurrency(data.currency as CurrencyCode);
                setValidUntil(data.valid_until.split('T')[0]); // Handle date format
                setNotes(data.notes || '');
                setDiscountType(data.discount_type as 'percentage' | 'fixed');
                setDiscountValue(data.discount_value);
                setQuoteLang((data.language || 'en') as Language);

                // Convert items
                if (data.items && data.items.length > 0) {
                    setItems(data.items.map(item => ({
                        serviceId: item.service_id || undefined,
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unit_price,
                    })));
                }
            } catch (error) {
                console.error('Failed to fetch quote', error);
                toast.error('Failed to load quote');
                router.push('/quotes');
            } finally {
                setLoading(false);
            }
        };

        if (quoteId) {
            fetchQuote();
        }
    }, [quoteId, router]);

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
        router.push(`/quotes/${quoteId}`);
    };

    const handleSave = async () => {
        const validItems = items.filter(item => item.description.trim() && item.unitPrice > 0);
        if (validItems.length === 0) {
            toast.warning('Please add at least one item with a description and price');
            return;
        }

        setSaving(true);
        try {
            const updateData: QuoteUpdateType = {
                client_name: clientName,
                client_email: clientEmail,
                client_phone: clientPhone || undefined,
                client_company: clientCompany || undefined,
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

            await api.updateQuote(quoteId, updateData);
            toast.success('Quote updated successfully!');
            router.push(`/quotes/${quoteId}`);
        } catch (error) {
            console.error('Failed to update quote', error);
            toast.error('Failed to update quote');
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
                    <p className="text-gray-500 dark:text-gray-400">Loading quote...</p>
                </div>
            </div>
        );
    }

    if (!originalQuote) {
        return null;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href={`/quotes/${quoteId}`}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-border-dark text-gray-500 transition-colors"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Edit Quote</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Editing <span className="font-medium text-gray-900 dark:text-white">{quoteNumber}</span>
                        </p>
                    </div>
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
                                Save Changes
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

                {/* Right Column - Preview */}
                <div className="space-y-4">
                    <div className="sticky top-6">
                        {/* Language Toggle for Preview */}
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Preview</h2>
                            <div className="flex rounded-lg border border-gray-300 dark:border-border-dark overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => setQuoteLang('en')}
                                    className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${quoteLang === 'en'
                                        ? 'bg-brand text-white'
                                        : 'bg-white dark:bg-card-dark text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-border-dark'
                                        }`}
                                >
                                    🇺🇸 EN
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setQuoteLang('es')}
                                    className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-gray-300 dark:border-border-dark flex items-center gap-1 ${quoteLang === 'es'
                                        ? 'bg-brand text-white'
                                        : 'bg-white dark:bg-card-dark text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-border-dark'
                                        }`}
                                >
                                    🇪🇸 ES
                                </button>
                            </div>
                        </div>

                        {/* Quote Preview Card */}
                        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                            <div className="p-6 space-y-5 text-gray-900" style={{ fontSize: '13px' }}>
                                {/* Header with Logo */}
                                <div className="flex justify-between items-start border-b border-gray-200 pb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="relative w-10 h-10">
                                            <Image
                                                src="/logo.png"
                                                alt="Company Logo"
                                                width={40}
                                                height={40}
                                                className="object-contain"
                                            />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold text-gray-900">{COMPANY_INFO.name}</h3>
                                            <p className="text-xs text-gray-500">{COMPANY_INFO.tagline}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="inline-block bg-brand/10 text-brand px-3 py-1.5 rounded-lg">
                                            <p className="text-lg font-bold">{t.quote}</p>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">{quoteNumber}</p>
                                    </div>
                                </div>

                                {/* Company & Client Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{t.from}</p>
                                        <p className="font-semibold text-sm">{COMPANY_INFO.name}</p>
                                        <p className="text-xs text-gray-600">{COMPANY_INFO.email}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{t.to}</p>
                                        <p className="font-semibold text-sm">{clientName || 'Client Name'}</p>
                                        {clientCompany && <p className="text-xs text-gray-600">{clientCompany}</p>}
                                        <p className="text-xs text-gray-600">{clientEmail || 'client@email.com'}</p>
                                    </div>
                                </div>

                                {/* Dates */}
                                <div className="flex flex-wrap gap-4 text-xs">
                                    <div>
                                        <span className="text-gray-500">{t.validUntil}:</span>
                                        <span className="ml-1 font-medium">{validUntil ? formatDate(validUntil) : '-'}</span>
                                    </div>
                                </div>

                                {/* Items Table */}
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="text-left px-3 py-2 font-semibold text-gray-600">{t.description}</th>
                                                <th className="text-center px-2 py-2 font-semibold text-gray-600 w-12">{t.qty}</th>
                                                <th className="text-right px-2 py-2 font-semibold text-gray-600 w-16">{t.price}</th>
                                                <th className="text-right px-3 py-2 font-semibold text-gray-600 w-16">{t.total}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {items.filter(i => i.description).length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="px-3 py-4 text-center text-gray-400 italic">
                                                        {t.addItemsHint}
                                                    </td>
                                                </tr>
                                            ) : (
                                                items.filter(i => i.description).map((item, index) => (
                                                    <tr key={index}>
                                                        <td className="px-3 py-2 truncate max-w-[150px]" title={item.description}>{item.description}</td>
                                                        <td className="px-2 py-2 text-center">{item.quantity}</td>
                                                        <td className="px-2 py-2 text-right">{CURRENCIES[currency].symbol}{item.unitPrice.toFixed(2)}</td>
                                                        <td className="px-3 py-2 text-right font-medium">{CURRENCIES[currency].symbol}{(item.quantity * item.unitPrice).toFixed(2)}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Totals */}
                                <div className="flex justify-end">
                                    <div className="w-48 space-y-1.5">
                                        <div className="flex justify-between text-xs">
                                            <span className="text-gray-500">{t.subtotal}</span>
                                            <span className="font-medium">{CURRENCIES[currency].symbol}{subtotal.toFixed(2)}</span>
                                        </div>
                                        {discountAmount > 0 && (
                                            <div className="flex justify-between text-xs text-green-600">
                                                <span>{t.discount} {discountType === 'percentage' ? `(${discountValue}%)` : ''}</span>
                                                <span className="font-medium">-{CURRENCIES[currency].symbol}{discountAmount.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between pt-1.5 border-t border-gray-200">
                                            <span className="font-bold">{t.total} ({currency})</span>
                                            <span className="font-bold text-brand">{CURRENCIES[currency].symbol}{total.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Notes Preview */}
                                {notes && (
                                    <div className="border-t border-gray-200 pt-3">
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{t.notes}</p>
                                        <p className="text-xs text-gray-600 whitespace-pre-wrap">{notes}</p>
                                    </div>
                                )}

                                {/* Footer */}
                                <div className="border-t border-gray-200 pt-3 text-center text-xs text-gray-400">
                                    <p>{t.thankYou}</p>
                                    <p className="mt-0.5">{COMPANY_INFO.website}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
