'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { useDocumentInfo, useFormFields } from '@payloadcms/ui'

export const GenerateQuoteButton: React.FC = () => {
    const router = useRouter()
    const { id } = useDocumentInfo()

    // Get client data from form fields
    const clientName = useFormFields(([fields]) => fields.name?.value as string) || ''
    const clientCompany = useFormFields(([fields]) => fields.company?.value as string) || ''
    const clientEmail = useFormFields(([fields]) => fields.email?.value as string) || ''
    const clientPhone = useFormFields(([fields]) => fields.phone?.value as string) || ''

    const handleGenerateQuote = () => {
        if (!id) {
            alert('Please save the client first before generating a quote.')
            return
        }

        // Build URL with client data encoded
        const params = new URLSearchParams({
            client: String(id),
            clientName: clientName,
            clientCompany: clientCompany || '',
            clientEmail: clientEmail || '',
            clientPhone: clientPhone || '',
        })

        // Navigate to create quote page with client data
        router.push(`/admin/collections/quotes/create?${params.toString()}`)
    }

    return (
        <div style={{ marginBottom: '24px' }}>
            <button
                type="button"
                onClick={handleGenerateQuote}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 20px',
                    backgroundColor: '#00dcb4',
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    width: '100%',
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = '#00c9a5'
                    e.currentTarget.style.transform = 'translateY(-1px)'
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#00dcb4'
                    e.currentTarget.style.transform = 'translateY(0)'
                }}
            >
                <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
                Generate Quote
            </button>
        </div>
    )
}

export default GenerateQuoteButton
