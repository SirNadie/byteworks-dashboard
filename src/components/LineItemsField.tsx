'use client'

import React, { useState, useEffect } from 'react'
import { useField } from '@payloadcms/ui'
import type { ArrayFieldClientComponent } from 'payload'

interface LineItem {
    id?: string
    service?: string | number
    description: string
    quantity: number
    unitPrice: number
}

interface Service {
    id: number
    name: string
    description?: string
    defaultPrice: number
    category: string
}

const formatCurrency = (amount: number): string => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const LineItemsField: ArrayFieldClientComponent = (props) => {
    const { value, setValue } = useField<LineItem[]>({ path: props.path })
    const [services, setServices] = useState<Service[]>([])
    const [loadingServices, setLoadingServices] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
    const [savingService, setSavingService] = useState<number | null>(null)
    const [saveSuccess, setSaveSuccess] = useState<number | null>(null)
    const [newItem, setNewItem] = useState<Partial<LineItem>>({
        description: '',
        quantity: 1,
        unitPrice: 0,
    })

    const items = Array.isArray(value) ? value : []

    // Fetch available services
    const fetchServices = () => {
        fetch('/api/services?where[isActive][equals]=true&limit=100', {
            credentials: 'include',
        })
            .then(res => res.json())
            .then(data => {
                setServices(data.docs || [])
                setLoadingServices(false)
            })
            .catch(() => {
                setLoadingServices(false)
            })
    }

    useEffect(() => {
        fetchServices()
    }, [])

    // Calculate line total
    const getLineTotal = (item: LineItem): number => {
        return (item.quantity || 1) * (item.unitPrice || 0)
    }

    // Calculate grand total
    const grandTotal = items.reduce((sum, item) => sum + getLineTotal(item), 0)

    // Add item from saved service
    const addFromService = (service: Service) => {
        const newLineItem: LineItem = {
            id: `item-${Date.now()}`,
            service: service.id,
            description: service.name,
            quantity: 1,
            unitPrice: service.defaultPrice,
        }
        setValue([...items, newLineItem])
    }

    // Add custom item
    const addCustomItem = () => {
        if (!newItem.description) return

        const newLineItem: LineItem = {
            id: `item-${Date.now()}`,
            description: newItem.description || '',
            quantity: newItem.quantity || 1,
            unitPrice: newItem.unitPrice || 0,
        }
        setValue([...items, newLineItem])
        setNewItem({ description: '', quantity: 1, unitPrice: 0 })
        setShowAddModal(false)
    }

    // Save item as reusable service
    const saveAsService = async (item: LineItem, index: number) => {
        if (!item.description || !item.unitPrice) return

        setSavingService(index)

        try {
            const response = await fetch('/api/services', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    name: item.description,
                    description: '',
                    defaultPrice: item.unitPrice,
                    category: 'other',
                    isActive: true,
                }),
            })

            if (response.ok) {
                const savedService = await response.json()
                // Update the item to reference the new service
                const updated = [...items]
                updated[index] = { ...updated[index], service: savedService.doc.id }
                setValue(updated)

                // Refresh services list
                fetchServices()

                // Show success feedback
                setSaveSuccess(index)
                setTimeout(() => setSaveSuccess(null), 2000)
            } else {
                alert('Failed to save service. Please try again.')
            }
        } catch (error) {
            alert('Failed to save service. Please try again.')
        } finally {
            setSavingService(null)
        }
    }

    // Update item
    const updateItem = (index: number, field: keyof LineItem, val: string | number) => {
        const updated = [...items]
        updated[index] = { ...updated[index], [field]: val }
        setValue(updated)
    }

    // Remove item
    const removeItem = (index: number) => {
        const updated = items.filter((_, i) => i !== index)
        setValue(updated)
    }

    // Check if item is already a saved service
    const isAlreadySaved = (item: LineItem): boolean => {
        return !!item.service
    }

    // Styles
    const containerStyle: React.CSSProperties = {
        marginBottom: '24px',
    }

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
    }

    const labelStyle: React.CSSProperties = {
        fontSize: '14px',
        fontWeight: '600',
        color: 'var(--theme-text)',
    }

    const addButtonStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        backgroundColor: '#00dcb4',
        color: '#000',
        border: 'none',
        borderRadius: '6px',
        fontSize: '13px',
        fontWeight: '600',
        cursor: 'pointer',
    }

    const tableStyle: React.CSSProperties = {
        width: '100%',
        borderCollapse: 'collapse',
        backgroundColor: 'var(--theme-elevation-50)',
        borderRadius: '8px',
        overflow: 'hidden',
    }

    const thStyle: React.CSSProperties = {
        padding: '12px',
        textAlign: 'left',
        fontSize: '11px',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        color: 'var(--theme-elevation-500)',
        borderBottom: '1px solid var(--theme-elevation-150)',
    }

    const tdStyle: React.CSSProperties = {
        padding: '12px',
        borderBottom: '1px solid var(--theme-elevation-100)',
    }

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '8px 10px',
        borderRadius: '4px',
        border: '1px solid var(--theme-elevation-150)',
        backgroundColor: 'var(--theme-input-bg)',
        color: 'var(--theme-text)',
        fontSize: '13px',
    }

    const numberInputStyle: React.CSSProperties = {
        ...inputStyle,
        width: '80px',
        textAlign: 'right',
    }

    const removeButtonStyle: React.CSSProperties = {
        padding: '6px 10px',
        backgroundColor: 'transparent',
        color: 'var(--theme-error-500)',
        border: '1px solid var(--theme-error-500)',
        borderRadius: '4px',
        fontSize: '12px',
        cursor: 'pointer',
    }

    const saveButtonStyle: React.CSSProperties = {
        padding: '6px 10px',
        backgroundColor: 'transparent',
        color: '#00dcb4',
        border: '1px solid #00dcb4',
        borderRadius: '4px',
        fontSize: '11px',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
    }

    const savedBadgeStyle: React.CSSProperties = {
        padding: '4px 8px',
        backgroundColor: 'rgba(0, 220, 180, 0.15)',
        color: '#00dcb4',
        borderRadius: '4px',
        fontSize: '10px',
        fontWeight: '600',
    }

    const modalOverlayStyle: React.CSSProperties = {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
    }

    const modalStyle: React.CSSProperties = {
        backgroundColor: 'var(--theme-elevation-100)',
        borderRadius: '12px',
        padding: '24px',
        width: '600px',
        maxWidth: '90vw',
        maxHeight: '80vh',
        overflow: 'auto',
    }

    return (
        <div style={containerStyle}>
            <div style={headerStyle} className="line-items-header">
                <label style={labelStyle}>Line Items</label>
                <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    style={addButtonStyle}
                    className="add-item-button"
                >
                    <span style={{ fontSize: '16px' }}>+</span>
                    Add Item
                </button>
            </div>

            {/* Items Table */}
            {items.length > 0 ? (
                <div className="line-items-table-wrapper" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={tableStyle}>
                        <thead>
                            <tr>
                                <th style={thStyle}>Description</th>
                                <th style={{ ...thStyle, width: '80px', textAlign: 'center' }}>Qty</th>
                                <th style={{ ...thStyle, width: '100px', textAlign: 'right' }}>Price</th>
                                <th style={{ ...thStyle, width: '100px', textAlign: 'right' }}>Total</th>
                                <th style={{ ...thStyle, width: '140px', textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={item.id || index} className="line-item-row">
                                    <td style={tdStyle} data-label="Description">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input
                                                id={`item-desc-${index}`}
                                                name={`item-desc-${index}`}
                                                type="text"
                                                value={item.description || ''}
                                                onChange={(e) => updateItem(index, 'description', e.target.value)}
                                                style={inputStyle}
                                                placeholder="Item description"
                                            />
                                            {isAlreadySaved(item) && (
                                                <span style={savedBadgeStyle}>SAVED</span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }} data-label="Quantity">
                                        <input
                                            id={`item-qty-${index}`}
                                            name={`item-qty-${index}`}
                                            type="number"
                                            value={item.quantity || 1}
                                            onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                            style={numberInputStyle}
                                            min="1"
                                        />
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'right' }} data-label="Unit Price">
                                        <input
                                            id={`item-price-${index}`}
                                            name={`item-price-${index}`}
                                            type="number"
                                            value={item.unitPrice || 0}
                                            onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                                            style={numberInputStyle}
                                            min="0"
                                            step="0.01"
                                        />
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '600', color: '#00dcb4' }} data-label="Item Total">
                                        {formatCurrency(getLineTotal(item))}
                                    </td>
                                    <td style={{ ...tdStyle, textAlign: 'center' }} data-label="Actions">
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }} className="line-items-actions">
                                            {!isAlreadySaved(item) && item.description && item.unitPrice > 0 && (
                                                <button
                                                    type="button"
                                                    onClick={() => saveAsService(item, index)}
                                                    disabled={savingService === index}
                                                    style={{
                                                        ...saveButtonStyle,
                                                        opacity: savingService === index ? 0.5 : 1,
                                                        cursor: savingService === index ? 'wait' : 'pointer',
                                                    }}
                                                    title="Save as reusable service"
                                                >
                                                    {savingService === index ? '...' : saveSuccess === index ? '✓' : '💾 Save'}
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => removeItem(index)}
                                                style={removeButtonStyle}
                                                title="Remove item"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {/* Total Row */}
                            <tr style={{ backgroundColor: 'var(--theme-elevation-100)' }} className="total-row">
                                <td colSpan={3} style={{ ...tdStyle, textAlign: 'right', fontWeight: '600' }}>
                                    TOTAL
                                </td>
                                <td style={{ ...tdStyle, textAlign: 'right', fontWeight: '700', fontSize: '16px', color: '#00dcb4' }}>
                                    {formatCurrency(grandTotal)}
                                </td>
                                <td style={tdStyle}></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            ) : (
                <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    backgroundColor: 'var(--theme-elevation-50)',
                    borderRadius: '8px',
                    border: '2px dashed var(--theme-elevation-200)',
                }}>
                    <p style={{ margin: '0 0 8px 0', color: 'var(--theme-elevation-500)' }}>
                        No items added yet
                    </p>
                    <button
                        type="button"
                        onClick={() => setShowAddModal(true)}
                        style={{ ...addButtonStyle, display: 'inline-flex' }}
                    >
                        <span style={{ fontSize: '16px' }}>+</span>
                        Add Your First Item
                    </button>
                </div>
            )}

            {/* Add Item Modal */}
            {showAddModal && (
                <div style={modalOverlayStyle} onClick={() => setShowAddModal(false)}>
                    <div style={modalStyle} className="line-items-modal" onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 20px 0', fontSize: '18px' }}>Add Line Item</h3>

                        {/* Saved Services Section */}
                        {!loadingServices && services.length > 0 && (
                            <div style={{ marginBottom: '24px' }}>
                                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--theme-elevation-500)' }}>
                                    Quick Add from Saved Services
                                </h4>
                                <div className="service-card-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
                                    {services.map(service => (
                                        <button
                                            key={service.id}
                                            type="button"
                                            onClick={() => {
                                                addFromService(service)
                                                setShowAddModal(false)
                                            }}
                                            style={{
                                                padding: '12px',
                                                border: '1px solid var(--theme-elevation-200)',
                                                borderRadius: '8px',
                                                backgroundColor: 'var(--theme-elevation-50)',
                                                cursor: 'pointer',
                                                textAlign: 'left',
                                                transition: 'all 0.2s',
                                            }}
                                            onMouseOver={(e) => {
                                                e.currentTarget.style.borderColor = '#00dcb4'
                                                e.currentTarget.style.backgroundColor = 'var(--theme-elevation-100)'
                                            }}
                                            onMouseOut={(e) => {
                                                e.currentTarget.style.borderColor = 'var(--theme-elevation-200)'
                                                e.currentTarget.style.backgroundColor = 'var(--theme-elevation-50)'
                                            }}
                                        >
                                            <div style={{ fontWeight: '600', fontSize: '13px', marginBottom: '4px', color: 'var(--theme-text)' }}>
                                                {service.name}
                                            </div>
                                            <div style={{ fontSize: '14px', fontWeight: '700', color: '#00dcb4' }}>
                                                {formatCurrency(service.defaultPrice)}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Divider */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            margin: '20px 0',
                            color: 'var(--theme-elevation-400)',
                        }}>
                            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--theme-elevation-200)' }}></div>
                            <span style={{ padding: '0 16px', fontSize: '12px' }}>OR ADD CUSTOM ITEM</span>
                            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--theme-elevation-200)' }}></div>
                        </div>

                        {/* Custom Item Form */}
                        <div style={{ display: 'grid', gap: '16px' }}>
                            <div>
                                <label htmlFor="new-item-desc" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>
                                    Description *
                                </label>
                                <input
                                    id="new-item-desc"
                                    name="new-item-desc"
                                    type="text"
                                    value={newItem.description || ''}
                                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                    style={{ ...inputStyle, width: '100%' }}
                                    placeholder="e.g., Custom development work"
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label htmlFor="new-item-qty" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>
                                        Quantity
                                    </label>
                                    <input
                                        id="new-item-qty"
                                        name="new-item-qty"
                                        type="number"
                                        value={newItem.quantity || 1}
                                        onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                                        style={{ ...inputStyle, width: '100%' }}
                                        min="1"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="new-item-price" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: '500' }}>
                                        Unit Price ($)
                                    </label>
                                    <input
                                        id="new-item-price"
                                        name="new-item-price"
                                        type="number"
                                        value={newItem.unitPrice || 0}
                                        onChange={(e) => setNewItem({ ...newItem, unitPrice: parseFloat(e.target.value) || 0 })}
                                        style={{ ...inputStyle, width: '100%' }}
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                            </div>

                            {/* Preview */}
                            {newItem.description && (
                                <div style={{
                                    padding: '12px',
                                    backgroundColor: 'var(--theme-elevation-50)',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                }}>
                                    <span style={{ fontSize: '13px' }}>
                                        {newItem.quantity || 1} × {newItem.description}
                                    </span>
                                    <span style={{ fontWeight: '700', color: '#00dcb4' }}>
                                        {formatCurrency((newItem.quantity || 1) * (newItem.unitPrice || 0))}
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Modal Actions */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                            <button
                                type="button"
                                onClick={() => setShowAddModal(false)}
                                style={{
                                    padding: '10px 20px',
                                    border: '1px solid var(--theme-elevation-300)',
                                    borderRadius: '6px',
                                    backgroundColor: 'transparent',
                                    color: 'var(--theme-text)',
                                    cursor: 'pointer',
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={addCustomItem}
                                disabled={!newItem.description}
                                style={{
                                    padding: '10px 20px',
                                    border: 'none',
                                    borderRadius: '6px',
                                    backgroundColor: newItem.description ? '#00dcb4' : 'var(--theme-elevation-300)',
                                    color: newItem.description ? '#000' : 'var(--theme-elevation-500)',
                                    fontWeight: '600',
                                    cursor: newItem.description ? 'pointer' : 'not-allowed',
                                }}
                            >
                                Add Custom Item
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default LineItemsField
