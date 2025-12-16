'use client'

import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useField } from '@payloadcms/ui'
import type { RelationshipFieldClientComponent } from 'payload'

export const ClientRelationshipField: RelationshipFieldClientComponent = (props) => {
    const searchParams = useSearchParams()
    const clientIdFromUrl = searchParams.get('client')
    const { value, setValue } = useField<string | number>({ path: props.path })
    const [initialized, setInitialized] = useState(false)

    // Dynamically import the RelationshipField component
    const [RelFieldComponent, setRelFieldComponent] = useState<React.ComponentType<any> | null>(null)

    useEffect(() => {
        import('@payloadcms/ui').then((mod) => {
            const FieldComp = (mod as any).RelationshipField
            if (FieldComp) {
                setRelFieldComponent(() => FieldComp)
            }
        }).catch(() => {
            // Fallback
        })
    }, [])

    useEffect(() => {
        // Only set the value if:
        // 1. We have a client ID in the URL
        // 2. We haven't initialized yet
        // 3. The field doesn't already have a value
        if (clientIdFromUrl && !initialized && !value) {
            // Set the client ID (as number for Payload relationship)
            const numericId = parseInt(clientIdFromUrl, 10)
            if (!isNaN(numericId)) {
                setValue(numericId)
            } else {
                setValue(clientIdFromUrl)
            }
            setInitialized(true)
        }
    }, [clientIdFromUrl, initialized, value, setValue])

    // If we have the dynamically loaded component, use it
    if (RelFieldComponent) {
        return <RelFieldComponent {...props} />
    }

    // Fallback: show loading state
    return (
        <div className="field-type relationship" style={{ marginBottom: '1.5rem' }}>
            <label className="field-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                Client <span style={{ color: 'var(--theme-error-500)' }}>*</span>
            </label>
            <div style={{
                padding: '10px',
                borderRadius: '4px',
                border: '1px solid var(--theme-elevation-150)',
                backgroundColor: 'var(--theme-input-bg)',
                color: 'var(--theme-elevation-400)',
            }}>
                {value ? `Client ID: ${value}` : 'Loading...'}
            </div>
        </div>
    )
}

export default ClientRelationshipField
