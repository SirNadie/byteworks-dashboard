'use client'

import React from 'react'
import { useSearchParams } from 'next/navigation'
import { useFormFields } from '@payloadcms/ui'

interface QuoteData {
    quoteNumber: string
    clientName: string
    title: string
    items: Array<{
        description: string
        quantity: number
        unitPrice: number
    }>
    total: number
    currency: string
    status: string
    validUntil: string
    notes: string
}

const formatCurrency = (amount: number, currency: string): string => {
    const symbol = currency === 'ttd' ? 'TT$' : '$'
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const formatDate = (dateString: string): string => {
    if (!dateString) return '—'
    try {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        })
    } catch {
        return dateString
    }
}

export const QuotePDFPreview: React.FC = () => {
    // Get client data from URL params (passed from GenerateQuoteButton)
    const searchParams = useSearchParams()
    const clientNameFromUrl = searchParams.get('clientName') || ''
    const clientCompanyFromUrl = searchParams.get('clientCompany') || ''
    const clientEmailFromUrl = searchParams.get('clientEmail') || ''
    const clientPhoneFromUrl = searchParams.get('clientPhone') || ''

    // Get form field values in real-time
    const quoteNumber = useFormFields(([fields]) => fields.quoteNumber?.value as string) || ''
    const clientId = useFormFields(([fields]) => fields.client?.value) as number | string | undefined
    const title = useFormFields(([fields]) => fields.title?.value as string) || ''
    const items = useFormFields(([fields]) => fields.items?.value as QuoteData['items']) || []
    const currency = useFormFields(([fields]) => fields.currency?.value as string) || 'usd'
    const status = useFormFields(([fields]) => fields.status?.value as string) || 'draft'
    const validUntil = useFormFields(([fields]) => fields.validUntil?.value as string) || ''
    const notes = useFormFields(([fields]) => fields.notes?.value as string) || ''
    const discountType = useFormFields(([fields]) => fields.discountType?.value as string) || 'none'
    const discountValue = useFormFields(([fields]) => fields.discountValue?.value as number) || 0

    // Calculate totals from items
    const itemsArray = Array.isArray(items) ? items : []
    const subtotal = itemsArray.reduce((sum, item) => {
        const qty = item?.quantity || 1
        const price = item?.unitPrice || 0
        return sum + (qty * price)
    }, 0)

    // Calculate discount
    let discountAmount = 0
    if (discountType === 'percentage' && discountValue > 0) {
        discountAmount = (subtotal * discountValue) / 100
    } else if (discountType === 'fixed' && discountValue > 0) {
        discountAmount = Math.min(discountValue, subtotal)
    }

    const displayTotal = Math.max(0, subtotal - discountAmount)
    const hasDiscount = discountType !== 'none' && discountValue > 0

    const statusColors: Record<string, { bg: string; text: string }> = {
        draft: { bg: '#f3f4f6', text: '#374151' },
        sent: { bg: '#dbeafe', text: '#1d4ed8' },
        accepted: { bg: '#dcfce7', text: '#166534' },
        rejected: { bg: '#fee2e2', text: '#991b1b' },
        expired: { bg: '#fef3c7', text: '#92400e' },
    }

    const currentStatus = statusColors[status] || statusColors.draft

    // Build client display text from URL params
    const getClientDisplay = (): { name: string; details: string; phone: string } => {
        if (!clientId) return { name: 'Select a client...', details: '', phone: '' }

        // Use URL params if available
        if (clientNameFromUrl) {
            const details = [clientCompanyFromUrl, clientEmailFromUrl].filter(Boolean).join(' • ')
            return { name: clientNameFromUrl, details, phone: clientPhoneFromUrl }
        }

        // Fallback to client ID
        return { name: `Client #${clientId}`, details: '', phone: '' }
    }

    const clientDisplay = getClientDisplay()

    return (
        <div style={{
            position: 'sticky',
            top: '20px',
            backgroundColor: '#1a1a1a',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #333',
            minHeight: '600px',
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
            }}>
                <h3 style={{ margin: 0, fontSize: '14px', color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Live Preview
                </h3>
                <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    backgroundColor: currentStatus.bg,
                    color: currentStatus.text,
                }}>
                    {status}
                </span>
            </div>

            {/* PDF Preview Container */}
            <div style={{
                backgroundColor: '#fff',
                borderRadius: '8px',
                padding: '32px',
                color: '#111',
                fontFamily: 'Georgia, serif',
                minHeight: '500px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            }}>
                {/* Header */}
                <div style={{
                    borderBottom: '3px solid #00dcb4',
                    paddingBottom: '20px',
                    marginBottom: '24px',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                            <h1 style={{
                                margin: '0 0 4px 0',
                                fontSize: '28px',
                                fontWeight: '700',
                                color: '#111',
                                fontFamily: 'system-ui, sans-serif',
                            }}>
                                QUOTE
                            </h1>
                            <p style={{
                                margin: 0,
                                fontSize: '14px',
                                color: '#666',
                                fontFamily: 'system-ui, sans-serif',
                            }}>
                                {quoteNumber || 'QT-XXXXX-XXXX'}
                            </p>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <img
                                src="/logo-dark.png"
                                alt="ByteWorks"
                                style={{
                                    height: '40px',
                                    marginBottom: '4px',
                                }}
                            />
                            <p style={{ margin: 0, fontSize: '11px', color: '#888' }}>
                                byteworksagency.com
                            </p>
                        </div>
                    </div>
                </div>

                {/* Client & Project Info */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '24px',
                    marginBottom: '24px',
                }}>
                    <div>
                        <p style={{
                            margin: '0 0 4px 0',
                            fontSize: '10px',
                            color: '#888',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            fontFamily: 'system-ui, sans-serif',
                        }}>
                            Bill To
                        </p>
                        <p style={{
                            margin: 0,
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#333',
                            fontFamily: 'system-ui, sans-serif',
                        }}>
                            {clientDisplay.name}
                        </p>
                        {clientDisplay.details && (
                            <p style={{
                                margin: '4px 0 0 0',
                                fontSize: '11px',
                                color: '#666',
                                fontFamily: 'system-ui, sans-serif',
                            }}>
                                {clientDisplay.details}
                            </p>
                        )}
                        {clientDisplay.phone && (
                            <p style={{
                                margin: '2px 0 0 0',
                                fontSize: '11px',
                                color: '#666',
                                fontFamily: 'system-ui, sans-serif',
                            }}>
                                📞 {clientDisplay.phone}
                            </p>
                        )}
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <p style={{
                            margin: '0 0 4px 0',
                            fontSize: '10px',
                            color: '#888',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            fontFamily: 'system-ui, sans-serif',
                        }}>
                            Valid Until
                        </p>
                        <p style={{
                            margin: 0,
                            fontSize: '14px',
                            fontWeight: '600',
                            color: '#333',
                            fontFamily: 'system-ui, sans-serif',
                        }}>
                            {formatDate(validUntil)}
                        </p>
                    </div>
                </div>

                {/* Project Title */}
                <div style={{
                    backgroundColor: '#f8f9fa',
                    padding: '16px',
                    borderRadius: '6px',
                    marginBottom: '24px',
                }}>
                    <p style={{
                        margin: '0 0 4px 0',
                        fontSize: '10px',
                        color: '#888',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        fontFamily: 'system-ui, sans-serif',
                    }}>
                        Project
                    </p>
                    <p style={{
                        margin: 0,
                        fontSize: '16px',
                        fontWeight: '600',
                        color: '#111',
                        fontFamily: 'system-ui, sans-serif',
                    }}>
                        {title || 'Enter project title...'}
                    </p>
                </div>

                {/* Items Table */}
                <div style={{ marginBottom: '24px' }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '12px',
                        fontFamily: 'system-ui, sans-serif',
                    }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                                <th style={{ textAlign: 'left', padding: '8px 0', color: '#666', fontWeight: '600' }}>Description</th>
                                <th style={{ textAlign: 'center', padding: '8px 0', color: '#666', fontWeight: '600', width: '60px' }}>Qty</th>
                                <th style={{ textAlign: 'right', padding: '8px 0', color: '#666', fontWeight: '600', width: '80px' }}>Price</th>
                                <th style={{ textAlign: 'right', padding: '8px 0', color: '#666', fontWeight: '600', width: '80px' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itemsArray.length > 0 ? itemsArray.map((item, index) => (
                                <tr key={index} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                    <td style={{ padding: '12px 0', color: '#333' }}>{item?.description || '—'}</td>
                                    <td style={{ textAlign: 'center', padding: '12px 0', color: '#666' }}>{item?.quantity || 1}</td>
                                    <td style={{ textAlign: 'right', padding: '12px 0', color: '#666' }}>
                                        {formatCurrency(item?.unitPrice || 0, currency)}
                                    </td>
                                    <td style={{ textAlign: 'right', padding: '12px 0', color: '#333', fontWeight: '600' }}>
                                        {formatCurrency((item?.quantity || 1) * (item?.unitPrice || 0), currency)}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} style={{
                                        padding: '24px 0',
                                        textAlign: 'center',
                                        color: '#999',
                                        fontStyle: 'italic',
                                    }}>
                                        Add items to see them here...
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Total Section */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    borderTop: '2px solid #111',
                    paddingTop: '16px',
                }}>
                    <div style={{ textAlign: 'right', minWidth: '200px' }}>
                        {/* Subtotal */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            marginBottom: hasDiscount ? '8px' : '0',
                        }}>
                            <span style={{
                                fontSize: '13px',
                                color: '#666',
                                fontFamily: 'system-ui, sans-serif',
                            }}>
                                Subtotal
                            </span>
                            <span style={{
                                fontSize: '14px',
                                fontWeight: '500',
                                color: '#333',
                                fontFamily: 'system-ui, sans-serif',
                            }}>
                                {formatCurrency(subtotal, currency)}
                            </span>
                        </div>

                        {/* Discount (if applied) */}
                        {hasDiscount && (
                            <>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    marginBottom: '12px',
                                    paddingBottom: '8px',
                                    borderBottom: '1px dashed #ddd',
                                }}>
                                    <span style={{
                                        fontSize: '13px',
                                        color: '#e11d48',
                                        fontFamily: 'system-ui, sans-serif',
                                    }}>
                                        Discount {discountType === 'percentage' ? `(${discountValue}%)` : ''}
                                    </span>
                                    <span style={{
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: '#e11d48',
                                        fontFamily: 'system-ui, sans-serif',
                                    }}>
                                        −{formatCurrency(discountAmount, currency)}
                                    </span>
                                </div>
                            </>
                        )}

                        {/* Total */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <span style={{
                                fontSize: '14px',
                                fontWeight: '600',
                                color: '#333',
                                fontFamily: 'system-ui, sans-serif',
                            }}>
                                {hasDiscount ? 'TOTAL' : 'Total Amount'}
                            </span>
                            <span style={{
                                fontSize: '24px',
                                fontWeight: '700',
                                color: '#00dcb4',
                                fontFamily: 'system-ui, sans-serif',
                            }}>
                                {formatCurrency(displayTotal, currency)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Notes */}
                {notes && (
                    <div style={{
                        marginTop: '24px',
                        padding: '12px',
                        backgroundColor: '#fffbeb',
                        borderRadius: '6px',
                        borderLeft: '3px solid #f59e0b',
                    }}>
                        <p style={{
                            margin: '0 0 4px 0',
                            fontSize: '10px',
                            color: '#92400e',
                            textTransform: 'uppercase',
                            letterSpacing: '1px',
                            fontFamily: 'system-ui, sans-serif',
                        }}>
                            Notes
                        </p>
                        <p style={{
                            margin: 0,
                            fontSize: '12px',
                            color: '#78350f',
                            fontFamily: 'system-ui, sans-serif',
                        }}>
                            {notes}
                        </p>
                    </div>
                )}
            </div>

            {/* Download Button Placeholder */}
            <button
                type="button"
                disabled
                style={{
                    marginTop: '16px',
                    width: '100%',
                    padding: '12px',
                    backgroundColor: '#333',
                    color: '#888',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'not-allowed',
                }}
            >
                📄 Download PDF (save first)
            </button>
        </div>
    )
}

export default QuotePDFPreview
