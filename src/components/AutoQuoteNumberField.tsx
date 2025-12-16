'use client'

import React, { useEffect, useState } from 'react'
import { useField } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'

// Generate a quote number in format: QT-YYYYMMDD-XXXX
const generateQuoteNumber = (): string => {
    const date = new Date()
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const random = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
    return `QT-${year}${month}${day}-${random}`
}

export const AutoQuoteNumberField: TextFieldClientComponent = (props) => {
    const { value, setValue } = useField<string>({ path: props.path })
    const [initialized, setInitialized] = useState(false)

    useEffect(() => {
        // Auto-generate quote number if field is empty (new quote)
        if (!value && !initialized) {
            setValue(generateQuoteNumber())
            setInitialized(true)
        }
    }, [value, initialized, setValue])

    // Render a styled text input
    return (
        <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
                display: 'block',
                marginBottom: '8px',
                fontSize: '13px',
                fontWeight: '500',
                color: 'var(--theme-text)',
            }}>
                Quote Number <span style={{ color: 'var(--theme-error-500)' }}>*</span>
            </label>
            <input
                id={`field-${props.path}`}
                name={props.path}
                type="text"
                value={value || ''}
                onChange={(e) => setValue(e.target.value)}
                required
                style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--theme-elevation-150)',
                    backgroundColor: 'var(--theme-input-bg)',
                    color: 'var(--theme-text)',
                    fontSize: '14px',
                    fontFamily: 'monospace',
                }}
            />
            <p style={{
                margin: '6px 0 0 0',
                fontSize: '12px',
                color: 'var(--theme-elevation-500)'
            }}>
                Auto-generated. You can modify if needed.
            </p>
        </div>
    )
}

export default AutoQuoteNumberField
