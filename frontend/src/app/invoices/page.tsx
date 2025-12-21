'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api, Invoice, InvoiceListResponse } from '../../lib/apiClient';
import { useToast, useConfirm } from '@/components/ui/Toast';

const PAGE_SIZE = 10;

// Company info
const COMPANY_INFO = {
    name: 'ByteWorks Agency',
    tagline: 'Digital Solutions',
    email: 'macrodriguez2512@gmail.com',
    phone: '+1 (868) 775-9858',
    website: 'byteworksagency.com',
};

// Invoice translations
const TRANSLATIONS = {
    en: {
        invoice: 'INVOICE',
        receipt: 'PAYMENT RECEIPT',
        from: 'From',
        billTo: 'Bill To',
        invoiceDate: 'Invoice Date',
        dueDate: 'Due Date',
        paymentDate: 'Payment Date',
        description: 'Description',
        qty: 'Qty',
        price: 'Price',
        total: 'Total',
        subtotal: 'Subtotal',
        tax: 'Tax',
        amountPaid: 'Amount Paid',
        notes: 'Notes',
        paymentTerms: 'Payment Terms',
        thankYou: 'Thank you for your business!',
        paymentConfirmed: 'Payment confirmed. Thank you!',
        paidStamp: 'PAID',
    },
    es: {
        invoice: 'FACTURA',
        receipt: 'RECIBO DE PAGO',
        from: 'De',
        billTo: 'Facturar A',
        invoiceDate: 'Fecha de Factura',
        dueDate: 'Fecha de Vencimiento',
        paymentDate: 'Fecha de Pago',
        description: 'Descripción',
        qty: 'Cant.',
        price: 'Precio',
        total: 'Total',
        subtotal: 'Subtotal',
        tax: 'Impuesto',
        amountPaid: 'Monto Pagado',
        notes: 'Notas',
        paymentTerms: 'Términos de Pago',
        thankYou: '¡Gracias por su preferencia!',
        paymentConfirmed: 'Pago confirmado. ¡Gracias!',
        paidStamp: 'PAGADO',
    },
};

// Invoice Payment Terms
const INVOICE_TERMS = {
    en: [
        'Payment is due by the date specified above.',
        'Late payments may incur a 5% monthly late fee after 7 days.',
        'For questions about this invoice, please contact us at the email above.',
        'You retain ownership of your content. ByteWorks retains rights to the platform code.',
    ],
    es: [
        'El pago vence en la fecha especificada arriba.',
        'Los pagos atrasados pueden incurrir en un cargo del 5% mensual después de 7 días.',
        'Para preguntas sobre esta factura, contáctenos al correo arriba indicado.',
        'Conservas la propiedad de tu contenido. ByteWorks retiene los derechos sobre el código.',
    ],
};

type Language = 'en' | 'es';

// Status styles
const STATUS_STYLES: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    paid: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    overdue: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
};

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const toast = useToast();
    const confirm = useConfirm();

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Action loading states
    const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);

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
            const response: InvoiceListResponse = await api.getInvoices(params);
            setInvoices(response.items);
            setTotalPages(response.pages);
            setTotalItems(response.total);
        } catch (error) {
            console.error('Failed to fetch invoices', error);
            toast.error('Failed to load invoices');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchInvoices(currentPage, statusFilter);
    }, [currentPage, statusFilter, fetchInvoices]);

    const handleStatusFilter = (status: string) => {
        setStatusFilter(status);
        setCurrentPage(1);
    };

    const handleMarkPaid = async (invoice: Invoice) => {
        setMarkingPaidId(invoice.id);
        try {
            // Call API - returns paid invoice + next invoice info
            const response = await api.markInvoicePaid(invoice.id);
            const paymentDate = new Date().toISOString();

            // Generate and download the payment receipt
            await generatePaymentReceipt(invoice, paymentDate);

            // Show success with next invoice info
            if (response.next_invoice) {
                toast.success(
                    `✅ Payment confirmed! Receipt downloaded. Next invoice ${response.next_invoice.invoice_number} created (due: ${new Date(response.next_invoice.due_date).toLocaleDateString()})`,
                );
            } else {
                toast.success(`Invoice ${invoice.invoice_number} marked as paid! Receipt downloaded.`);
            }

            fetchInvoices(currentPage, statusFilter);
        } catch (error) {
            console.error('Failed to mark invoice as paid', error);
            toast.error('Failed to mark as paid');
        } finally {
            setMarkingPaidId(null);
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

        try {
            await api.deleteInvoice(invoice.id);
            toast.success('Invoice deleted successfully');
            fetchInvoices(currentPage, statusFilter);
        } catch (error) {
            console.error('Failed to delete invoice', error);
            toast.error('Failed to delete invoice');
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

    // State for download loading
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    // Generate Invoice PDF
    const generateInvoicePDF = async (invoice: Invoice, lang: Language = 'en') => {
        setDownloadingId(invoice.id);
        try {
            const { jsPDF } = await import('jspdf');
            const t = TRANSLATIONS[lang];

            // Create hidden iframe
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

            // Build HTML
            doc.open();
            doc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; font-family: Arial, sans-serif; }
                        body { padding: 40px; background: white; color: #1a1a1a; position: relative; }
                        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e5e5e5; padding-bottom: 20px; margin-bottom: 20px; }
                        .company-name { font-size: 24px; font-weight: bold; color: #1a1a1a; }
                        .company-tagline { font-size: 12px; color: #666; }
                        .invoice-title { font-size: 28px; font-weight: bold; color: #7c3aed; text-align: right; }
                        .invoice-number { font-size: 14px; color: #666; text-align: right; }
                        .section { margin-bottom: 20px; }
                        .section-title { font-size: 12px; font-weight: bold; color: #7c3aed; margin-bottom: 8px; text-transform: uppercase; }
                        .info-row { font-size: 14px; margin-bottom: 4px; }
                        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                        th { background: #f5f5f5; padding: 12px; text-align: left; font-size: 12px; font-weight: bold; color: #666; text-transform: uppercase; }
                        td { padding: 12px; border-bottom: 1px solid #e5e5e5; font-size: 14px; }
                        .text-right { text-align: right; }
                        .totals { margin-top: 20px; }
                        .total-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
                        .total-row.grand { font-size: 18px; font-weight: bold; color: #7c3aed; border-top: 2px solid #e5e5e5; padding-top: 12px; }
                        .terms { margin-top: 20px; padding: 16px; background: #fafafa; border-radius: 4px; }
                        .terms-title { font-size: 11px; font-weight: bold; color: #7c3aed; margin-bottom: 8px; }
                        .terms-list { font-size: 10px; color: #666; }
                        .terms-list li { margin-bottom: 4px; list-style-type: disc; margin-left: 16px; }
                        .logo { width: 48px; height: 48px; margin-right: 12px; }
                        .header-left { display: flex; align-items: flex-start; }
                        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #999; }
                        .paid-stamp { position: absolute; top: 200px; right: 60px; font-size: 48px; font-weight: bold; color: rgba(34, 197, 94, 0.3); transform: rotate(-15deg); border: 4px solid rgba(34, 197, 94, 0.3); padding: 10px 20px; border-radius: 8px; }
                    </style>
                </head>
                <body>
                    ${invoice.status === 'paid' ? `<div class="paid-stamp">${t.paidStamp}</div>` : ''}
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
                            <div class="invoice-title">${t.invoice}</div>
                            <div class="invoice-number">#${invoice.invoice_number}</div>
                            <div style="margin-top: 8px; font-size: 12px; color: #666; text-align: right;">
                                ${t.invoiceDate}: ${new Date(invoice.created_at).toLocaleDateString()}<br/>
                                ${t.dueDate}: ${new Date(invoice.due_date).toLocaleDateString()}
                            </div>
                        </div>
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
                            ${invoice.items.map(item => `
                                <tr>
                                    <td>${item.description}</td>
                                    <td class="text-right">${item.quantity}</td>
                                    <td class="text-right">$${Number(item.unit_price).toFixed(2)}</td>
                                    <td class="text-right">$${(item.quantity * Number(item.unit_price)).toFixed(2)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    
                    <div class="totals">
                        <div class="total-row">
                            <span>${t.subtotal}</span>
                            <span>$${Number(invoice.subtotal).toFixed(2)}</span>
                        </div>
                        ${Number(invoice.tax) > 0 ? `
                            <div class="total-row">
                                <span>${t.tax} (${invoice.tax_rate}%)</span>
                                <span>$${Number(invoice.tax).toFixed(2)}</span>
                            </div>
                        ` : ''}
                        <div class="total-row grand">
                            <span>${t.total}</span>
                            <span>$${Number(invoice.total).toFixed(2)} USD</span>
                        </div>
                    </div>
                    
                    ${invoice.notes ? `
                        <div class="terms" style="background: #f9fafb;">
                            <div class="terms-title">${t.notes}</div>
                            <div style="font-size: 12px; color: #666;">${invoice.notes}</div>
                        </div>
                    ` : ''}
                    
                    <div class="terms">
                        <div class="terms-title">${t.paymentTerms}</div>
                        <ul class="terms-list">
                            ${INVOICE_TERMS[lang].map((term: string) => `<li>${term}</li>`).join('')}
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

            await new Promise(resolve => setTimeout(resolve, 100));

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

            const filename = `Invoice-${invoice.invoice_number}.pdf`;
            pdf.save(filename);

            document.body.removeChild(iframe);
            toast.success('Invoice PDF downloaded!');
        } catch (error) {
            console.error('Failed to generate PDF', error);
            toast.error('Failed to download PDF');
        } finally {
            setDownloadingId(null);
        }
    };

    // Generate Payment Receipt PDF
    const generatePaymentReceipt = async (invoice: Invoice, paymentDate: string, lang: Language = 'en') => {
        try {
            const { jsPDF } = await import('jspdf');
            const t = TRANSLATIONS[lang];

            const iframe = document.createElement('iframe');
            iframe.style.position = 'absolute';
            iframe.style.left = '-9999px';
            iframe.style.width = '800px';
            iframe.style.height = '1000px';
            document.body.appendChild(iframe);

            const doc = iframe.contentDocument;
            if (!doc) {
                document.body.removeChild(iframe);
                return;
            }

            doc.open();
            doc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        * { margin: 0; padding: 0; box-sizing: border-box; font-family: Arial, sans-serif; }
                        body { padding: 40px; background: white; color: #1a1a1a; position: relative; }
                        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #22c55e; padding-bottom: 20px; margin-bottom: 30px; }
                        .company-name { font-size: 24px; font-weight: bold; color: #1a1a1a; }
                        .company-tagline { font-size: 12px; color: #666; }
                        .receipt-title { font-size: 28px; font-weight: bold; color: #22c55e; text-align: right; }
                        .receipt-number { font-size: 14px; color: #666; text-align: right; }
                        .section { margin-bottom: 20px; }
                        .section-title { font-size: 12px; font-weight: bold; color: #22c55e; margin-bottom: 8px; text-transform: uppercase; }
                        .info-row { font-size: 14px; margin-bottom: 4px; }
                        .payment-box { background: #f0fdf4; border: 2px solid #22c55e; border-radius: 8px; padding: 24px; margin: 30px 0; text-align: center; }
                        .payment-amount { font-size: 36px; font-weight: bold; color: #22c55e; }
                        .payment-label { font-size: 14px; color: #666; margin-top: 8px; }
                        .logo { width: 48px; height: 48px; margin-right: 12px; }
                        .header-left { display: flex; align-items: flex-start; }
                        .paid-stamp { position: absolute; top: 180px; right: 60px; font-size: 48px; font-weight: bold; color: rgba(34, 197, 94, 0.3); transform: rotate(-15deg); border: 4px solid rgba(34, 197, 94, 0.3); padding: 10px 20px; border-radius: 8px; }
                        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; font-size: 12px; color: #999; }
                        .details-table { width: 100%; margin: 20px 0; }
                        .details-table td { padding: 8px 0; border-bottom: 1px solid #e5e5e5; }
                        .details-table td:first-child { color: #666; font-size: 14px; }
                        .details-table td:last-child { text-align: right; font-weight: 500; }
                    </style>
                </head>
                <body>
                    <div class="paid-stamp">${t.paidStamp}</div>
                    <div class="header">
                        <div class="header-left">
                            <img class="logo" src="${window.location.origin}/logo.png" alt="Logo" />
                            <div>
                                <div class="company-name">${COMPANY_INFO.name}</div>
                                <div class="company-tagline">${COMPANY_INFO.tagline}</div>
                                <div style="margin-top: 8px; font-size: 12px; color: #666;">
                                    ${COMPANY_INFO.email}<br/>
                                    ${COMPANY_INFO.phone}
                                </div>
                            </div>
                        </div>
                        <div>
                            <div class="receipt-title">${t.receipt}</div>
                            <div class="receipt-number">#${invoice.invoice_number}</div>
                        </div>
                    </div>
                    
                    <div class="payment-box">
                        <div class="payment-amount">$${Number(invoice.total).toFixed(2)} USD</div>
                        <div class="payment-label">${t.amountPaid}</div>
                    </div>
                    
                    <table class="details-table">
                        <tr>
                            <td>${t.invoiceDate}</td>
                            <td>${new Date(invoice.created_at).toLocaleDateString()}</td>
                        </tr>
                        <tr>
                            <td>${t.paymentDate}</td>
                            <td style="color: #22c55e; font-weight: bold;">${new Date(paymentDate).toLocaleDateString()}</td>
                        </tr>
                        <tr>
                            <td>${t.subtotal}</td>
                            <td>$${Number(invoice.subtotal).toFixed(2)}</td>
                        </tr>
                        ${Number(invoice.tax) > 0 ? `
                        <tr>
                            <td>${t.tax} (${invoice.tax_rate}%)</td>
                            <td>$${Number(invoice.tax).toFixed(2)}</td>
                        </tr>
                        ` : ''}
                        <tr style="border-bottom: none;">
                            <td style="font-weight: bold;">${t.total}</td>
                            <td style="font-weight: bold; font-size: 18px;">$${Number(invoice.total).toFixed(2)}</td>
                        </tr>
                    </table>
                    
                    <div class="footer">
                        <p style="font-size: 16px; color: #22c55e; margin-bottom: 8px;">✓ ${t.paymentConfirmed}</p>
                        <p>${t.thankYou}</p>
                        <p>${COMPANY_INFO.website}</p>
                    </div>
                </body>
                </html>
            `);
            doc.close();

            await new Promise(resolve => setTimeout(resolve, 100));

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

            const filename = `Receipt-${invoice.invoice_number}.pdf`;
            pdf.save(filename);

            document.body.removeChild(iframe);
        } catch (error) {
            console.error('Failed to generate receipt', error);
        }
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
                    <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Invoices</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage client billing and payments.</p>
                </div>
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
                                                onClick={() => handleMarkPaid(invoice)}
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
                                            onClick={() => generateInvoicePDF(invoice)}
                                            disabled={downloadingId === invoice.id}
                                            className="flex-1 px-3 py-2 bg-brand hover:bg-brand-strong text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                                        >
                                            {downloadingId === invoice.id ? (
                                                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                                            ) : (
                                                <span className="material-symbols-outlined text-sm">download</span>
                                            )}
                                            Download
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
                                                onClick={() => handleMarkPaid(invoice)}
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
                                            onClick={() => generateInvoicePDF(invoice)}
                                            disabled={downloadingId === invoice.id}
                                            className="px-3 py-1.5 bg-brand hover:bg-brand-strong text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50"
                                            title="Download PDF"
                                        >
                                            {downloadingId === invoice.id ? (
                                                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                                            ) : (
                                                <span className="material-symbols-outlined text-sm">download</span>
                                            )}
                                            PDF
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
        </div>
    );
}
