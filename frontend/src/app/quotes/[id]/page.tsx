'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { api, Quote } from '../../../lib/apiClient';
import { useToast } from '@/components/ui/Toast';
import Breadcrumbs, { copyToClipboard } from '@/components/ui/Breadcrumbs';
import {
    COMPANY_INFO,
    CURRENCIES,
    STANDARD_TERMS,
    TRANSLATIONS,
    type Language,
} from '@/config/company';

// Status styles
const STATUS_STYLES: Record<string, string> = {
    draft: 'bg-amber-100 text-amber-700',
    pending: 'bg-amber-100 text-amber-700',
    sent: 'bg-blue-100 text-blue-700',
    accepted: 'bg-green-100 text-green-700',
    converted: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    expired: 'bg-orange-100 text-orange-700',
};

const STATUS_DISPLAY: Record<string, string> = {
    draft: 'pending',
    sent: 'sent',
    accepted: 'converted',
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
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Language for display
    const [displayLang, setDisplayLang] = useState<Language>('en');
    const [showRejectConfirm, setShowRejectConfirm] = useState(false);

    // Link Modal State
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [generatedLink, setGeneratedLink] = useState('');

    // Ref for PDF generation
    const quotePreviewRef = useRef<HTMLDivElement>(null);

    // Handle Send Quote + Download PDF
    // Handle Send Quote
    const handleSendQuote = async () => {
        if (!quote) return;
        setActionLoading('send');
        try {
            // First, send the quote to update status
            const updatedQuote = await api.sendQuote(quoteId);
            setQuote(updatedQuote);

            // Fetch signed link
            const { url } = await api.getQuotePublicLink(quoteId);
            setGeneratedLink(url);
            setShowLinkModal(true);

            toast.success('Quote sent successfully!');
        } catch (error) {
            console.error('Failed to send quote', error);
            toast.error('Failed to send quote');
        } finally {
            setActionLoading(null);
        }
    };

    // Generate PDF and trigger download using iframe with inline styles
    const generateAndDownloadPDF = async () => {
        if (!quote) return;

        // Dynamically import jsPDF
        const { jsPDF } = await import('jspdf');

        // Get the current translations
        const t = TRANSLATIONS[displayLang];
        const currencySymbol = CURRENCIES[quote.currency as keyof typeof CURRENCIES]?.symbol || '$';

        // Create a hidden iframe with clean HTML (no Tailwind)
        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.left = '-9999px';
        iframe.style.width = '800px';
        iframe.style.height = '1200px';
        document.body.appendChild(iframe);

        const doc = iframe.contentDocument;
        if (!doc) {
            document.body.removeChild(iframe);
            return;
        }

        // Build clean HTML with inline styles
        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; font-family: Arial, sans-serif; }
                    body { padding: 40px; background: white; color: #1a1a1a; }
                    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e5e5e5; padding-bottom: 20px; margin-bottom: 20px; }
                    .company-name { font-size: 24px; font-weight: bold; color: #1a1a1a; }
                    .company-tagline { font-size: 12px; color: #666; }
                    .quote-title { font-size: 28px; font-weight: bold; color: #7c3aed; text-align: right; }
                    .quote-number { font-size: 14px; color: #666; text-align: right; }
                    .section { margin-bottom: 20px; }
                    .section-title { font-size: 12px; font-weight: bold; color: #7c3aed; margin-bottom: 8px; text-transform: uppercase; }
                    .info-row { font-size: 14px; margin-bottom: 4px; }
                    .info-label { color: #666; }
                    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    th { background: #f5f5f5; padding: 12px; text-align: left; font-size: 12px; font-weight: bold; color: #666; text-transform: uppercase; }
                    td { padding: 12px; border-bottom: 1px solid #e5e5e5; font-size: 14px; }
                    .text-right { text-align: right; }
                    .totals { margin-top: 20px; }
                    .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
                    .total-row.grand { font-size: 18px; font-weight: bold; color: #7c3aed; border-top: 2px solid #e5e5e5; padding-top: 12px; }
                    .notes { background: #f9fafb; padding: 16px; border-radius: 4px; margin-top: 20px; }
                    .notes-title { font-size: 12px; font-weight: bold; margin-bottom: 8px; }
                    .notes-text { font-size: 12px; color: #666; }
                    .terms { margin-top: 20px; padding: 16px; background: #fafafa; border-radius: 4px; }
                    .terms-title { font-size: 11px; font-weight: bold; color: #7c3aed; margin-bottom: 8px; }
                    .terms-list { font-size: 10px; color: #666; }
                    .terms-list li { margin-bottom: 4px; list-style-type: disc; margin-left: 16px; }
                    .logo { width: 48px; height: 48px; margin-right: 12px; }
                    .header-left { display: flex; align-items: flex-start; }
                    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #999; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="header-left">
                        <img class="logo" src="${window.location.origin}/logo.png" alt="Logo" />
                        <div>
                            <div class="company-name">${COMPANY_INFO.name}</div>
                            <div class="company-tagline">${COMPANY_INFO.tagline}</div>
                            <div style="margin-top: 8px; font-size: 12px; color: #666;">
                            ${COMPANY_INFO.email}<br/>
                            ${COMPANY_INFO.phone}<br/>
                            ${COMPANY_INFO.website}
                        </div>
                        </div>
                    </div>
                    <div>
                        <div class="quote-title">${t.quote}</div>
                        <div class="quote-number">#${quote.quote_number}</div>
                        <div style="margin-top: 8px; font-size: 12px; color: #666; text-align: right;">
                            ${t.issueDate}: ${new Date(quote.created_at).toLocaleDateString()}<br/>
                            ${t.validUntil}: ${new Date(quote.valid_until).toLocaleDateString()}
                        </div>
                    </div>
                </div>
                
                <div class="section">
                    <div class="section-title">${t.to}</div>
                    <div class="info-row" style="font-weight: bold;">${quote.client_name}</div>
                    ${quote.client_company ? `<div class="info-row">${quote.client_company}</div>` : ''}
                    <div class="info-row">${quote.client_email}</div>
                    ${quote.client_phone ? `<div class="info-row">${quote.client_phone}</div>` : ''}
                </div>
                
                <table>
                    <thead>
                        <tr>
                            <th>${t.description}</th>
                            <th class="text-right">${t.qty}</th>
                            <th class="text-right">${t.price}</th>
                            <th class="text-right">${t.total}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${quote.items.map(item => `
                            <tr>
                                <td>${item.description}</td>
                                <td class="text-right">${item.quantity}</td>
                                <td class="text-right">${currencySymbol}${item.unit_price.toFixed(2)}</td>
                                <td class="text-right">${currencySymbol}${(item.quantity * item.unit_price).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                
                <div class="totals">
                    <div class="total-row">
                        <span>${t.subtotal}</span>
                        <span>${currencySymbol}${quote.subtotal.toFixed(2)}</span>
                    </div>
                    ${quote.discount > 0 ? `
                        <div class="total-row">
                            <span>${t.discount}</span>
                            <span style="color: #22c55e;">-${currencySymbol}${quote.discount.toFixed(2)}</span>
                        </div>
                    ` : ''}
                    ${quote.tax > 0 ? `
                        <div class="total-row">
                            <span>${t.tax}</span>
                            <span>${currencySymbol}${quote.tax.toFixed(2)}</span>
                        </div>
                    ` : ''}
                    <div class="total-row grand">
                        <span>${t.total}</span>
                        <span>${currencySymbol}${quote.total.toFixed(2)} ${quote.currency}</span>
                    </div>
                </div>
                
                ${quote.notes ? `
                    <div class="notes">
                        <div class="notes-title">${t.notes}</div>
                        <div class="notes-text">${quote.notes}</div>
                    </div>
                ` : ''}
                
                <div class="terms">
                    <div class="terms-title">${t.termsAndConditions}</div>
                    <ul class="terms-list">
                        ${STANDARD_TERMS[displayLang].map((term: string) => `<li>${term}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="footer">
                    <p>${t.thankYou}</p>
                    <p>${COMPANY_INFO.website}</p>
                </div>
            </body>
            </html>
        `);
        doc.close();

        // Wait for content to render, then use html2canvas
        await new Promise(resolve => setTimeout(resolve, 100));

        try {
            const html2canvas = (await import('html2canvas')).default;
            const canvas = await html2canvas(doc.body, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#ffffff',
                logging: false,
            });

            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = pdfWidth - 20;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            const finalHeight = Math.min(imgHeight, pdfHeight - 20);
            const finalWidth = (canvas.width * finalHeight) / canvas.height;

            pdf.addImage(imgData, 'JPEG', 10, 10, Math.min(imgWidth, finalWidth), finalHeight);

            const filename = `${quote.quote_number}-${quote.client_name.replace(/\s+/g, '_')}.pdf`;
            pdf.save(filename);
        } finally {
            document.body.removeChild(iframe);
        }
    };

    // Handle Convert Quote - converts to invoice and redirects
    const handleConvertQuote = async () => {
        if (!quote) return;
        setActionLoading('convert');
        try {
            const result = await api.convertQuote(quoteId);
            toast.success(`🎉 Quote converted to Invoice ${result.invoice_number}!`);
            // Redirect to invoices page
            router.push('/invoices');
        } catch (error) {
            console.error('Failed to convert quote', error);
            toast.error('Failed to convert quote');
            setActionLoading(null);
        }
    };

    // Handle Reject Quote - deletes quote AND lead
    const handleRejectQuote = async () => {
        if (!quote) return;
        setActionLoading('reject');
        try {
            await api.rejectQuote(quoteId);
            toast.success('Quote rejected. All data has been deleted.');
            router.push('/quotes');
        } catch (error) {
            console.error('Failed to reject quote', error);
            toast.error('Failed to reject quote');
        } finally {
            setActionLoading(null);
            setShowRejectConfirm(false);
        }
    };

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
            {/* Breadcrumbs */}
            <Breadcrumbs items={[
                { label: 'Quotes', href: '/quotes' },
                { label: quote.quote_number }
            ]} />

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
                        onClick={() => router.push(`/quotes/${quoteId}/edit`)}
                    >
                        <span className="material-symbols-outlined text-lg">edit</span>
                        <span className="hidden sm:inline">Edit</span>
                    </button>

                    {/* Send Button - show only for drafts/pending */}
                    {(quote.status === 'draft' || getDisplayStatus() === 'pending') && (
                        <button
                            className="btn btn-secondary flex items-center gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-900/20"
                            title="Send Quote to Client"
                            onClick={handleSendQuote}
                            disabled={actionLoading !== null}
                        >
                            {actionLoading === 'send' ? (
                                <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                            ) : (
                                <span className="material-symbols-outlined text-lg">send</span>
                            )}
                            <span className="hidden sm:inline">Send</span>
                        </button>
                    )}

                    {/* Convert Button - show only for sent quotes */}
                    {quote.status === 'sent' && (
                        <button
                            className="btn btn-secondary flex items-center gap-2 text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20"
                            title="Mark as Converted (Client Accepted)"
                            onClick={handleConvertQuote}
                            disabled={actionLoading !== null}
                        >
                            {actionLoading === 'convert' ? (
                                <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                            ) : (
                                <span className="material-symbols-outlined text-lg">check_circle</span>
                            )}
                            <span className="hidden sm:inline">Convert</span>
                        </button>
                    )}

                    {/* Reject Button - show for sent quotes */}
                    {quote.status === 'sent' && (
                        <button
                            className="btn btn-secondary flex items-center gap-2 text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                            title="Reject Quote (Delete all data)"
                            onClick={() => setShowRejectConfirm(true)}
                            disabled={actionLoading !== null}
                        >
                            <span className="material-symbols-outlined text-lg">cancel</span>
                            <span className="hidden sm:inline">Reject</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Quote Document Preview */}
            <div ref={quotePreviewRef} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden max-w-4xl mx-auto">
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

            {/* Reject Confirmation Modal */}
            {showRejectConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-card-dark rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                                <span className="material-symbols-outlined text-red-600 dark:text-red-400 text-2xl">warning</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Reject Quote?</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone.</p>
                            </div>
                        </div>

                        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-6">
                            <p className="text-sm text-red-700 dark:text-red-300">
                                <strong>Warning:</strong> This will permanently delete:
                            </p>
                            <ul className="mt-2 text-sm text-red-600 dark:text-red-400 space-y-1">
                                <li className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">description</span>
                                    Quote {quote.quote_number}
                                </li>
                                <li className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">person</span>
                                    Lead: {quote.client_name} ({quote.client_email})
                                </li>
                            </ul>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowRejectConfirm(false)}
                                className="flex-1 btn btn-secondary"
                                disabled={actionLoading === 'reject'}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRejectQuote}
                                className="flex-1 btn bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2"
                                disabled={actionLoading === 'reject'}
                            >
                                {actionLoading === 'reject' ? (
                                    <>
                                        <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                                        Deleting...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined">delete_forever</span>
                                        Yes, Delete All
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Success Link Modal */}
            {showLinkModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-card-dark rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-2xl">check_circle</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quote Sent!</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">The quote has been processed successfully.</p>
                            </div>
                        </div>

                        <div className="space-y-4">

                            <a
                                href={generatedLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full text-center py-2 px-4 border border-brand text-brand rounded-lg hover:bg-brand/5 transition-colors text-sm font-medium"
                            >
                                Open PDF in New Tab
                            </a>

                            <button
                                onClick={() => setShowLinkModal(false)}
                                className="w-full btn btn-primary mt-2"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
