'use client'

import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useField } from '@payloadcms/ui'
import type { DateFieldClientComponent } from 'payload'

// Get date 15 days from now in ISO format
const getValidUntilDate = (): string => {
    const date = new Date()
    date.setDate(date.getDate() + 15)
    return date.toISOString()
}

export const AutoValidUntilField: DateFieldClientComponent = (props) => {
    const searchParams = useSearchParams()
    const isFromClient = searchParams.get('client') !== null
    const { value, setValue } = useField<string>({ path: props.path })
    const [initialized, setInitialized] = useState(false)

    // Dynamically import the DateField component
    const [DateFieldComponent, setDateFieldComponent] = useState<React.ComponentType<any> | null>(null)

    useEffect(() => {
        // Import the field component dynamically
        import('@payloadcms/ui').then((mod) => {
            // Use the DateTimeField or fallback
            const FieldComp = (mod as any).DateTimeField || (mod as any).DateField
            if (FieldComp) {
                setDateFieldComponent(() => FieldComp)
            }
        }).catch(() => {
            // Fallback: just render a basic input
        })
    }, [])

    useEffect(() => {
        // Auto-set valid until date only if:
        // 1. Coming from client page (has ?client= param)
        // 2. Field doesn't have a value yet
        // 3. Haven't initialized yet
        if (isFromClient && !value && !initialized) {
            setValue(getValidUntilDate())
            setInitialized(true)
        }
    }, [isFromClient, value, initialized, setValue])

    // If we have the dynamically loaded component, use it
    if (DateFieldComponent) {
        return <DateFieldComponent {...props} />
    }

    // Fallback: render a basic date input while loading
    const formattedValue = value ? new Date(value).toISOString().split('T')[0] : ''

    return (
        <div className="field-type date" style={{ marginBottom: '1.5rem' }}>
            <label className="field-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                Valid Until
            </label>
            <input
                type="date"
                value={formattedValue}
                onChange={(e) => {
                    if (e.target.value) {
                        setValue(new Date(e.target.value).toISOString())
                    }
                }}
                style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '4px',
                    border: '1px solid var(--theme-elevation-150)',
                    backgroundColor: 'var(--theme-input-bg)',
                    color: 'var(--theme-text)',
                }}
            />
            <p style={{ fontSize: '12px', color: 'var(--theme-elevation-400)', marginTop: '4px' }}>
                Quote expiration date (auto-set to 15 days from creation)
            </p>
        </div>
    )
}

export default AutoValidUntilField
