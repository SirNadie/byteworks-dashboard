'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { api, Quote } from '../../../lib/apiClient';
import { useToast } from '@/components/ui/Toast';

// Company info - TODO: Move to config/env
const COMPANY_INFO = {
    name: 'ByteWorks Agency',
    tagline: 'Digital Solutions',
    email: 'macrodriguez2512@gmail.com',
    phone: '+1 (868) 775-9858',
    website: 'byteworksagency.com',
};

// Currency symbols
const CURRENCIES: Record<string, { symbol: string; name: string }> = {
    USD: { symbol: '$', name: 'US Dollar' },
    TTD: { symbol: 'TT$', name: 'Trinidad Dollar' },
};

// Standard Terms & Conditions
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
    },
};

// Status styles
const STATUS_STYLES: Record<string, string> = {
    draft: 'bg-amber-100 text-amber-700',
    pending: 'bg-amber-100 text-amber-700',
    sent: 'bg-blue-100 text-blue-700',
    accepted: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    expired: 'bg-orange-100 text-orange-700',
};

const STATUS_DISPLAY: Record<string, string> = {
    draft: 'pending',
    sent: 'sent',
    accepted: 'accepted',
    rejected: 'rejected',
    expired: 'expired',
};

export default function QuoteDetailPage() {
    const params = useParams();
    const router = useRouter();
    const toast = useToast();
    const quoteId = params.id as string;

    const [quote, setQuote] = useState<Quote | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Language for display
    const [displayLang, setDisplayLang] = useState<Language>('en');

    useEffect(() => {
        const fetchQuote = async () => {
            try {
                const data = await api.getQuote(quoteId);
                setQuote(data);
                // Set language from quote
                if (data.language === 'es' || data.language === 'en') {
                    setDisplayLang(data.language as Language);
                }
            } catch (err) {
                console.error('Failed to fetch quote', err);
                setError('Failed to load quote');
            } finally {
                setLoading(false);
            }
        };

        if (quoteId) {
            fetchQuote();
        }
    }, [quoteId]);

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const isExpired = (validUntil: string) => {
        return new Date(validUntil) < new Date();
    };

    const getDisplayStatus = () => {
        if (!quote) return 'pending';
        if (isExpired(quote.valid_until) && quote.status === 'draft') {
            return 'expired';
        }
        return STATUS_DISPLAY[quote.status] || quote.status;
    };

    const t = TRANSLATIONS[displayLang];
    const terms = STANDARD_TERMS[displayLang];

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

    if (error || !quote) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-3">
                    <span className="material-symbols-outlined text-4xl text-red-500">error</span>
                    <p className="text-red-500">{error || 'Quote not found'}</p>
                    <Link href="/quotes" className="btn btn-primary mt-4">
                        Back to Quotes
                    </Link>
                </div>
            </div>
        );
    }

    const currency = quote.currency as keyof typeof CURRENCIES;
    const currencySymbol = CURRENCIES[currency]?.symbol || '$';

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header with Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link
                        href="/quotes"
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-border-dark text-gray-500 transition-colors"
                    >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">
                                {quote.quote_number}
                            </h1>
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium capitalize ${STATUS_STYLES[getDisplayStatus()]}`}>
                                {getDisplayStatus()}
                            </span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Created {formatDate(quote.created_at)}
                        </p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Language Toggle */}
                    <div className="flex rounded-lg border border-gray-300 dark:border-border-dark overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setDisplayLang('en')}
                            className={`px-3 py-1.5 text-xs font-medium transition-colors flex items-center gap-1 ${displayLang === 'en'
                                ? 'bg-brand text-white'
                                : 'bg-white dark:bg-card-dark text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-border-dark'
                                }`}
                        >
                            🇺🇸 EN
                        </button>
                        <button
                            type="button"
                            onClick={() => setDisplayLang('es')}
                            className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-gray-300 dark:border-border-dark flex items-center gap-1 ${displayLang === 'es'
                                ? 'bg-brand text-white'
                                : 'bg-white dark:bg-card-dark text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-border-dark'
                                }`}
                        >
                            🇪🇸 ES
                        </button>
                    </div>

                    <button
                        className="btn btn-secondary flex items-center gap-2"
                        title="Edit Quote"
                        onClick={() => toast.info('Edit functionality coming soon!')}
                    >
                        <span className="material-symbols-outlined text-lg">edit</span>
                        <span className="hidden sm:inline">Edit</span>
                    </button>

                    <button
                        className="btn btn-secondary flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/20"
                        title="Send Quote"
                        onClick={() => toast.info('Send functionality coming soon!')}
                    >
                        <span className="material-symbols-outlined text-lg">send</span>
                        <span className="hidden sm:inline">Send</span>
                    </button>

                    <button
                        className="btn btn-secondary flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20"
                        title="Download PDF"
                        onClick={() => toast.info('PDF download coming soon!')}
                    >
                        <span className="material-symbols-outlined text-lg">download</span>
                        <span className="hidden sm:inline">PDF</span>
                    </button>
                </div>
            </div>

            {/* Quote Document Preview */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden max-w-4xl mx-auto">
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
                            <p className="text-sm text-gray-500 mt-2">{quote.quote_number}</p>
                        </div>
                    </div>

                    {/* Company & Client Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t.from}</p>
                            <p className="font-semibold">{COMPANY_INFO.name}</p>
                            <p className="text-sm text-gray-600">{COMPANY_INFO.email}</p>
                            <p className="text-sm text-gray-600">{COMPANY_INFO.phone}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t.to}</p>
                            <p className="font-semibold">{quote.client_name}</p>
                            {quote.client_company && <p className="text-sm text-gray-600">{quote.client_company}</p>}
                            <p className="text-sm text-gray-600">{quote.client_email}</p>
                            {quote.client_phone && <p className="text-sm text-gray-600">{quote.client_phone}</p>}
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="flex flex-wrap gap-6 text-sm">
                        <div>
                            <span className="text-gray-500">{t.issueDate}:</span>
                            <span className="ml-2 font-medium">{formatDate(quote.created_at)}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">{t.validUntil}:</span>
                            <span className={`ml-2 font-medium ${isExpired(quote.valid_until) ? 'text-red-500' : ''}`}>
                                {formatDate(quote.valid_until)}
                                {isExpired(quote.valid_until) && ' (Expired)'}
                            </span>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
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
                                    {quote.items.map((item, index) => (
                                        <tr key={index}>
                                            <td className="px-4 py-3">{item.description}</td>
                                            <td className="px-4 py-3 text-center">{item.quantity}</td>
                                            <td className="px-4 py-3 text-right">{currencySymbol}{item.unit_price.toFixed(2)}</td>
                                            <td className="px-4 py-3 text-right font-medium">{currencySymbol}{(item.quantity * item.unit_price).toFixed(2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="flex justify-end">
                        <div className="w-64 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">{t.subtotal}</span>
                                <span className="font-medium">{currencySymbol}{quote.subtotal.toFixed(2)}</span>
                            </div>
                            {quote.discount > 0 && (
                                <div className="flex justify-between text-sm text-green-600">
                                    <span>{t.discount} {quote.discount_type === 'percentage' ? `(${quote.discount_value}%)` : ''}</span>
                                    <span className="font-medium">-{currencySymbol}{quote.discount.toFixed(2)}</span>
                                </div>
                            )}
                            {quote.tax > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">{t.tax}</span>
                                    <span className="font-medium">{currencySymbol}{quote.tax.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between pt-2 border-t border-gray-200">
                                <span className="font-bold text-lg">{t.total} ({currency})</span>
                                <span className="font-bold text-lg text-brand">{currencySymbol}{quote.total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes & Terms */}
                    <div className="border-t border-gray-200 pt-4 space-y-4">
                        {/* Custom Notes */}
                        {quote.notes && (
                            <div>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t.notes}</p>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap">{quote.notes}</p>
                            </div>
                        )}

                        {/* Standard Terms */}
                        <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t.termsAndConditions}</p>
                            <ul className="text-xs text-gray-500 space-y-1">
                                {terms.map((term, index) => (
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
    );
}
