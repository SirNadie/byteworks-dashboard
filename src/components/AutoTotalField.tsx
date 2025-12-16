'use client'

import React, { useEffect } from 'react'
import { useField, useFormFields } from '@payloadcms/ui'
import type { NumberFieldClientComponent } from 'payload'

const formatCurrency = (amount: number, currency: string): string => {
    const symbol = currency === 'ttd' ? 'TT$' : '$'
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const AutoTotalField: NumberFieldClientComponent = (props) => {
    const { value, setValue } = useField<number>({ path: props.path })

    // Get items from form to calculate total
    const items = useFormFields(([fields]) => fields.items?.value) as Array<{
        quantity?: number
        unitPrice?: number
    }> | undefined

    const currency = useFormFields(([fields]) => fields.currency?.value as string) || 'usd'
    const discountType = useFormFields(([fields]) => fields.discountType?.value as string) || 'none'
    const discountValue = useFormFields(([fields]) => fields.discountValue?.value as number) || 0

    // Calculate subtotal from items
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
        discountAmount = Math.min(discountValue, subtotal) // Can't discount more than subtotal
    }

    // Calculate final total
    const calculatedTotal = Math.max(0, subtotal - discountAmount)

    // Sync total with calculated value
    useEffect(() => {
        if (calculatedTotal !== value) {
            setValue(calculatedTotal)
        }
    }, [calculatedTotal, value, setValue])

    const hasDiscount = discountType !== 'none' && discountValue > 0

    return (
        <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '13px',
                fontWeight: '500',
                color: 'var(--theme-text)',
            }}>
                Quote Total
            </label>
            <div style={{
                padding: '16px',
                borderRadius: '8px',
                backgroundColor: 'var(--theme-elevation-100)',
                border: '1px solid var(--theme-elevation-150)',
            }}>
                {/* Subtotal */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: hasDiscount ? '8px' : '0',
                }}>
                    <span style={{
                        fontSize: '13px',
                        color: 'var(--theme-elevation-500)',
                    }}>
                        Subtotal
                    </span>
                    <span style={{
                        fontSize: '15px',
                        fontWeight: '500',
                        color: 'var(--theme-text)',
                        fontFamily: 'monospace',
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
                            alignItems: 'center',
                            marginBottom: '12px',
                            paddingBottom: '12px',
                            borderBottom: '1px dashed var(--theme-elevation-200)',
                        }}>
                            <span style={{
                                fontSize: '13px',
                                color: '#e11d48',
                            }}>
                                Discount {discountType === 'percentage' ? `(${discountValue}%)` : ''}
                            </span>
                            <span style={{
                                fontSize: '15px',
                                fontWeight: '500',
                                color: '#e11d48',
                                fontFamily: 'monospace',
                            }}>
                                −{formatCurrency(discountAmount, currency)}
                            </span>
                        </div>

                        {/* Total */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}>
                            <span style={{
                                fontSize: '14px',
                                fontWeight: '600',
                                color: 'var(--theme-text)',
                                textTransform: 'uppercase',
                            }}>
                                Total
                            </span>
                            <span style={{
                                fontSize: '22px',
                                fontWeight: '700',
                                color: '#00dcb4',
                                fontFamily: 'monospace',
                            }}>
                                {formatCurrency(calculatedTotal, currency)}
                            </span>
                        </div>
                    </>
                )}

                {/* Show total in green when no discount */}
                {!hasDiscount && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginTop: '4px',
                    }}>
                        <span style={{
                            fontSize: '22px',
                            fontWeight: '700',
                            color: '#00dcb4',
                            fontFamily: 'monospace',
                        }}>
                            {formatCurrency(calculatedTotal, currency)}
                        </span>
                    </div>
                )}
            </div>
            {/* Hidden input for form submission */}
            <input type="hidden" name={props.path} value={calculatedTotal} />
        </div>
    )
}

export default AutoTotalField
